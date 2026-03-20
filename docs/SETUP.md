# Setup Guide

This guide covers local development and release builds for When Due.

## Repository

```bash
git clone https://github.com/wei-ming2/when-due.git
cd when-due
```

## Prerequisites

### macOS

- Xcode Command Line Tools
- Node.js 18+
- Rust 1.70+

Example setup:

```bash
xcode-select --install
brew install node
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### Windows

- Node.js 18+
- Rust with the MSVC toolchain
- Visual Studio Build Tools with C++ workload

### Linux

- Node.js 18+
- Rust 1.70+
- WebKitGTK development packages required by Tauri

## Install Dependencies

```bash
npm install
```

## Development

```bash
npm run tauri:dev
```

## Production Builds

### macOS

```bash
npm run tauri:build
```

Output:

- `src-tauri/target/release/bundle/macos/When Due.app`

### Windows On A Windows Host

```bash
npm run tauri:build:windows
```

Typical output:

- `src-tauri/target/release/bundle/nsis/When Due_*.exe`
- `src-tauri/target/release/bundle/msi/When Due_*.msi`

### Windows Test Build From macOS

This repo includes a helper script for generating a Windows installer from macOS:

```bash
npm run tauri:build:windows:mac
```

Output:

- `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/When Due_*.exe`

Notes:

- this uses `cargo-xwin`
- this is intended for tester feedback, not final signed Windows distribution
- unsigned installers may trigger Windows security prompts

## Useful Commands

```bash
npm run type-check
npm test -- --run
cargo check --manifest-path src-tauri/Cargo.toml
```

## Local Data Paths

When Due currently stores its SQLite database in:

- macOS: `~/Library/Application Support/deadline-tracker/deadline-tracker.db`
- Windows: `%APPDATA%\deadline-tracker\deadline-tracker.db`
- Linux: `~/.local/share/deadline-tracker/deadline-tracker.db`

These paths reflect the current codebase. If the app data directory is renamed in a future release, that should be handled as a migration rather than a silent doc change.
