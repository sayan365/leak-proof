# leak-proof 🛡️

[![npm version](https://img.shields.io/npm/v/leak-proof.svg?style=flat-square)](https://www.npmjs.com/package/leak-proof)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://github.com/sayan365/leak-proof/blob/main/LICENSE)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg?style=flat-square)](https://github.com/sayan365/leak-proof/graphs/commit-activity)

> **Stop accidental secret leaks before they leave your laptop.**
>
> Leak-Proof is a zero-config CLI that blocks you from committing `.env` files or hardcoded secrets (AWS keys, Tokens, Private Keys).

---

## 🚨 Security Notice

**⚠️ CRITICAL UPDATE (v1.1.0):** If you are using v1.0.x, **upgrade immediately**.

**What was fixed:**
- **[CRITICAL]** Staging area bypass vulnerability - secrets in Git's index could be bypassed by modifying the working directory
- **[HIGH]** Memory crash on large files (500MB+ SQL dumps, binaries)

**How to upgrade:**
```bash
npm install leak-proof@latest --save-dev
```

**Details:** See [SECURITY-FIXES.md](./SECURITY-FIXES.md) for complete technical analysis and test cases.

---


## ✨ Features

- **🔒 Automatic Secret Detection** - Instantly spots AWS keys, private keys, and generic secrets in staged files.
- **👥 Team-Wide Protection** - Auto-installs for every team member via `npm install`. No manual setup required.
- **🎨 Beautiful CLI** - Clear, colored output with actionable security alerts.
- **⚡ Zero Config** - Best-practice security defaults out of the box.
- **🛡️ Smart Filtering** - Intelligently ignores binary files, lock files, and safe assets.

---

## 🚀 For Users

### Installation

Install `leak-proof` as a development dependency in your project:

```bash
npm install leak-proof --save-dev
```

### Quick Start

1. **Initialize in your project:**
   ```bash
   npx leak-proof init
   ```
   This sets up the necessary Git hooks and configuring your project for safety.

2. **Commit as usual:**
   ```bash
   git add .
   git commit -m "feat: amazing new feature"
   ```

3. **That's it!** 
   If you accidentally stage a file with secrets (like `.env` or a hardcoded API key), `leak-proof` will **block the commit** and show you exactly what needs to be fixed.

### How it Works
1. You run `npx leak-proof init`.
2. A `prepare` script is added to your `package.json`.
3. When your teammates pull the code and run `npm install`, the hooks are automatically set up for them too.
4. **Everyone is protected effectively immediately.** 🎉

---

## 💻 For Developers & Contributors

We welcome contributions! Whether you're fixing a bug, improving the docs, or adding a new secret pattern, here's how to get started.

### Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/sayan365/leak-proof.git
   cd leak-proof
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Link locally:**
   This allows you to test your local changes as if they were an installed global package.
   ```bash
   npm link
   ```
   Now you can run the `leak-proof` command anywhere in your terminal to test your changes.

4. **Verify your setup:**
   Run the help command to see if your local version is active:
   ```bash
   leak-proof --help
   ```

### 🤝 Contributing

We love contributions! Here's how you can help make Leak-Proof better:

1.  **Fork & Clone** the repository.
2.  **Create a Branch** for your feature (`git checkout -b feature/amazing-feature`).
3.  **Commit your changes** (`git commit -m 'feat: add amazing feature'`).
4.  **Push** to the branch (`git push origin feature/amazing-feature`).
5.  **Open a Pull Request** and describe your changes.

> **💡 Note:** Validation is currently manual. Please run the scanner against dummy files to verify your changes before submitting.

---

## 🔍 Security Checks

### File Patterns Blocked
- `.env`
- `.env.local`, `.env.test`, `.env.production`, etc.

### Secrets Detected
- **AWS Access Keys**: `AKIA...`
- **Private Keys**: `-----BEGIN PRIVATE KEY-----`
- **Generic Secrets**: 
  - `api_key = "..."`
  - `auth_token: "..."`
  - `client_secret = "..."`

### 🚦 Bypassing Checks (False Positives)

Sometimes you need to commit a dummy key for testing purposes. You have two options:

**Force Commit (Emergency)**

If you need to bypass the entire hook for a specific commit:

```bash
git commit -m "fixing stuff" --no-verify
```

---

## 🗑️ Uninstalling

If you want to remove Leak-Proof from your project, run:

```bash
npx leak-proof remove
```

This cleans up the git hooks and removes the scripts from your package.json.

---

## 👨‍💻 Author

Built with ❤️ by [Sayan](https://github.com/sayan365).

