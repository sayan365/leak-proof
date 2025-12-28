#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const program = new Command();

// Utility: Check if we're in a git repository
function isGitRepo() {
  try {
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Command: init
program
  .command('init')
  .description('Initialize leak-proof as a git pre-commit hook')
  .action(() => {
    console.log(chalk.blue('🔧 Initializing leak-proof...'));

    // Check if in git repository
    if (!isGitRepo()) {
      console.error(chalk.red('❌ Error: Not a git repository. Please run this command in a git repository.'));
      process.exit(1);
    }

    try {
      // Step 1: Initialize husky
      console.log(chalk.gray('Installing husky hooks...'));
      execSync('npx husky install', { stdio: 'inherit' });

      // Step 2: Create pre-commit hook
      const huskyDir = path.join(process.cwd(), '.husky');
      const preCommitPath = path.join(huskyDir, 'pre-commit');

      // Ensure .husky directory exists
      if (!fs.existsSync(huskyDir)) {
        fs.mkdirSync(huskyDir, { recursive: true });
      }

      // Create pre-commit hook content
      const preCommitContent = `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx leak-proof scan
`;

      fs.writeFileSync(preCommitPath, preCommitContent, 'utf8');

      // Make it executable (Unix-like systems)
      if (process.platform !== 'win32') {
        fs.chmodSync(preCommitPath, '755');
      }

      console.log(chalk.green('✓ Pre-commit hook created'));

      // Step 3: Viral mechanism - Add prepare script to package.json
      const packageJsonPath = path.join(process.cwd(), 'package.json');

      if (!fs.existsSync(packageJsonPath)) {
        console.warn(chalk.yellow('⚠ Warning: package.json not found. Skipping viral mechanism.'));
      } else {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

        if (!packageJson.scripts) {
          packageJson.scripts = {};
        }

        // Add prepare script if it doesn't exist
        if (!packageJson.scripts.prepare) {
          packageJson.scripts.prepare = 'husky install';
          fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
          console.log(chalk.green('✓ Added "prepare" script to package.json (viral mechanism enabled)'));
        } else if (packageJson.scripts.prepare !== 'husky install') {
          console.warn(chalk.yellow('⚠ Warning: "prepare" script already exists in package.json. Please add "husky install" manually.'));
        } else {
          console.log(chalk.gray('ℹ "prepare" script already configured'));
        }
      }

      console.log(chalk.green.bold('\n✅ leak-proof initialized successfully!'));
      console.log(chalk.gray('Your team will automatically get these hooks when they run "npm install"'));
    } catch (error) {
      console.error(chalk.red(`❌ Error during initialization: ${error.message}`));
      process.exit(1);
    }
  });

// Command: scan
program
  .command('scan')
  .description('Scan staged files for secrets (runs automatically on pre-commit)')
  .action(() => {
    // Check if in git repository
    if (!isGitRepo()) {
      console.error(chalk.red('❌ Error: Not a git repository.'));
      process.exit(1);
    }

    try {
      // Get staged files
      const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf8' })
        .trim()
        .split('\n')
        .filter(file => file.length > 0);

      if (stagedFiles.length === 0) {
        console.log(chalk.gray('No staged files to scan.'));
        return;
      }

      const violations = [];

      // Step B: File name check
      const envFilePattern = /^\.env(\.(local|production|development|test))?$/;
      for (const file of stagedFiles) {
        const fileName = path.basename(file);
        if (envFilePattern.test(fileName)) {
          violations.push({
            file,
            line: 0,
            reason: 'Filename matches .env pattern (not allowed to be committed)'
          });
        }
      }

      // Step C: Content check
      const secretPatterns = [
        {
          name: 'AWS Access Key',
          pattern: /AKIA[0-9A-Z]{16}/g
        },
        {
          name: 'Private Key',
          pattern: /-----BEGIN PRIVATE KEY-----/g
        },
        {
          name: 'OpenAI API Key',
          pattern: /sk-[a-zA-Z0-9]{48}/g
        },
        {
          name: 'Google/Gemini API Key',
          pattern: /AIza[0-9A-Za-z_-]{35}/g
        },
        {
          name: 'Generic API Key/Token (broad match)',
          pattern: /(api[_-]?key|auth[_-]?token|access[_-]?token|client[_-]?secret|secret[_-]?key|api[_-]?secret|token|password|passwd|credentials|gemini[_-]?key|openai[_-]?key)\s*[:=]\s*['"][a-zA-Z0-9_\-]{16,}['"]/gi
        },
        {
          name: 'High Entropy String (potential secret)',
          pattern: /(secret|key|token|password|passwd|credential|auth)\s*[:=]\s*['"][a-zA-Z0-9+/=_\-]{32,}['"]/gi
        }
      ];

      // Files to skip
      const skipFiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];
      const binaryExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.zip', '.tar', '.gz', '.exe', '.bin'];

      for (const file of stagedFiles) {
        // Skip if file is in skip list
        if (skipFiles.includes(path.basename(file))) {
          continue;
        }

        // Skip binary files
        const ext = path.extname(file).toLowerCase();
        if (binaryExtensions.includes(ext)) {
          continue;
        }

        // Check if file exists (skip deleted files)
        if (!fs.existsSync(file)) {
          continue;
        }

        // Check if it's a file (not directory)
        const stats = fs.statSync(file);
        if (!stats.isFile()) {
          continue;
        }

        // Read and scan file content
        try {
          const content = fs.readFileSync(file, 'utf8');
          const lines = content.split('\n');

          lines.forEach((line, index) => {
            secretPatterns.forEach(({ name, pattern }) => {
              if (pattern.test(line)) {
                violations.push({
                  file,
                  line: index + 1,
                  reason: `Detected ${name}`,
                  snippet: line.trim().substring(0, 80) // First 80 chars
                });
              }
            });
          });
        } catch (error) {
          // Skip files that can't be read as text
          continue;
        }
      }

      // If violations found, block commit
      if (violations.length > 0) {
        console.log('\n');

        // TOP SECTION - Red warning banner
        console.log(chalk.red('┌─────────────────────────────────────────────────┐'));
        console.log(chalk.red('│  🔒 COMMIT BLOCKED - SECRETS DETECTED           │'));
        console.log(chalk.red('└─────────────────────────────────────────────────┘'));
        console.log('');

        // VIOLATIONS SECTION
        violations.forEach((violation, idx) => {
          const current = idx + 1;
          const total = violations.length;
          const title = `Violation ${current} of ${total}`;
          const padding = '─'.repeat(Math.max(0, 49 - title.length - 2));

          console.log(chalk.gray(`┌─ ${title} ${padding}`));
          console.log(chalk.gray('│') + ' 📄 File: ' + chalk.cyan(`${violation.file}:${violation.line || 'filename'}`));
          console.log(chalk.gray('│') + ' 🚨 Issue: ' + chalk.red(violation.reason));

          if (violation.snippet) {
            console.log(chalk.gray('│'));
            console.log(chalk.gray('│') + ' Code preview:');
            const lineNum = violation.line || '?';
            console.log(chalk.gray('│') + chalk.yellow(` ${lineNum} | ${violation.snippet}`));
          }
          console.log(chalk.gray('└─────────────────────────────────────────────────'));
          console.log('');
        });

        // HELP SECTION
        console.log('HELP SECTION:');
        console.log('💡 ' + chalk.bold('What to do next:'));
        console.log('   • Remove the secrets from your code');
        console.log('   • Use environment variables instead (.env files)');
        console.log('   • Add .env to your .gitignore');
        console.log('');
        console.log('⚠️  ' + chalk.yellow('Emergency bypass (use with caution):'));
        console.log('   git commit --no-verify');
        console.log('\n');

        process.exit(1);
      }



      console.log(chalk.green('✓ No secrets detected. Commit allowed.'));
    } catch (error) {
      console.error(chalk.red(`❌ Error during scan: ${error.message}`));
      process.exit(1);
    }
  });

// Command: remove
program
  .command('remove')
  .description('Remove leak-proof from the project')
  .action(() => {
    console.log(chalk.blue('🗑️  Removing leak-proof...'));

    try {
      // Step 1: Remove .husky directory
      const huskyDir = path.join(process.cwd(), '.husky');
      if (fs.existsSync(huskyDir)) {
        fs.rmSync(huskyDir, { recursive: true, force: true });
        console.log(chalk.green('✓ Removed .husky directory'));
      } else {
        console.log(chalk.gray('ℹ .husky directory not found'));
      }

      // Step 2: Remove prepare script from package.json
      const packageJsonPath = path.join(process.cwd(), 'package.json');

      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

        if (packageJson.scripts && packageJson.scripts.prepare === 'husky install') {
          delete packageJson.scripts.prepare;

          // Clean up empty scripts object
          if (Object.keys(packageJson.scripts).length === 0) {
            delete packageJson.scripts;
          }

          fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
          console.log(chalk.green('✓ Removed "prepare" script from package.json'));
        } else {
          console.log(chalk.gray('ℹ "prepare" script not found or different in package.json'));
        }
      } else {
        console.log(chalk.yellow('⚠ Warning: package.json not found'));
      }

      console.log(chalk.green.bold('\n✅ leak-proof removed successfully!'));
    } catch (error) {
      console.error(chalk.red(`❌ Error during removal: ${error.message}`));
      process.exit(1);
    }
  });

// Parse arguments
program
  .name('leak-proof')
  .description('Leak-Proof is a zero-config CLI that blocks you from committing .env files or hardcoded secrets.')
  .version('1.0.0');

program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
