# Development Setup Guide

This guide walks you through setting up your local development environment to build and run Deadline Tracker.

## Prerequisites

Before starting, ensure you have:

### macOS
```bash
# Xcode Command Line Tools
xcode-select --install

# Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node.js (18+)
brew install node

# Rust (via rustup)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

### Windows
```powershell
# Windows 10/11 Build Tools
# Download Visual Studio Build Tools: https://visualstudio.microsoft.com/downloads/
# Install C++ workload

# Node.js (18+)
# Download from https://nodejs.org/

# Rust
# Download from https://rustup.rs/ or use:
# winget install Rustlang.Rust.MSVC
```

### Linux (Ubuntu/Debian)
```bash
# Build essentials
sudo apt install build-essential curl wget file libssl-dev pkg-config

# Node.js
curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs

# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

### Verify Installation

```bash
node --version      # Should be v18.x or higher
npm --version       # Should be 9.x or higher
rustc --version     # Should be 1.70.x or higher
cargo --version     # Should be 1.70.x or higher
```

---

## Project Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/deadline-tracker.git
cd deadline-tracker
```

### 2. Install Frontend Dependencies

```bash
npm install
```

This installs:
- SvelteKit framework
- TypeScript
- Tauri CLI
- Testing utilities (Vitest, Playwright)
- Development tools (Prettier, ESLint)

### 3. Install Rust Dependencies

```bash
cd src-tauri
cargo build
cd ..
```

This compiles Rust dependencies for Tauri. First build takes ~2-5 minutes.

### 4. Verify Setup

```bash
# Check frontend
npm run dev        # Should start dev server at localhost:5173

# In another terminal, check backend (keep first one open)
npm run tauri dev  # Should open the desktop app
```

If both succeed, you're ready to develop! 🎉

---

## Development Workflow

### Hot Reload Development

**Terminal 1 - Frontend watcher:**
```bash
npm run dev
```
This starts the Vite dev server with hot module replacement. Changes to components update instantly.

**Terminal 2 - Tauri app:**
```bash
npm run tauri dev
```
This launches the desktop app with hot reload on Rust changes.

When you modify:
- **Frontend files** (`.svelte`, `.ts`, `.css`) → Instantly visible in app
- **Rust files** (`.rs`) → App relaunches when you save

### Build for Production

```bash
npm run tauri build
```

This creates:
- **macOS:** `src-tauri/target/release/bundle/macos/Deadline Tracker.app`
- **Windows:** `src-tauri/target/release/bundle/msi/Deadline Tracker_*.msi`
- **Linux:** `src-tauri/target/release/bundle/appimage/Deadline Tracker_*.AppImage`

Find releases in `src-tauri/target/release/`.

---

## Key npm Scripts

```bash
# Development
npm run dev              # Start frontend dev server
npm run tauri dev       # Start desktop app (requires npm run dev)
npm run tauri dev:debug # Start with Rust debugging

# Building
npm run tauri build     # Build for production
npm run tauri build --target universal-apple-darwin  # macOS Intel + Apple Silicon
npm run tauri build --target x86_64-pc-windows-msvc  # Windows only

# Testing
npm run test            # Run frontend unit tests
npm run test:ui         # Run tests with UI
npm run test:coverage   # Generate coverage report

# Code Quality
npm run lint            # Run ESLint
npm run format          # Format code with Prettier
npm run type-check      # TypeScript type checking

# Tauri
npm run tauri info      # Show environment info
npm run tauri android   # Build Android (future)
npm run tauri ios       # Build iOS (future)
```

---

## Project Structure Quick Reference

```
deadline-tracker/
├── src/                      # SvelteKit frontend (TypeScript)
│   ├── lib/                  # Reusable components, stores, services
│   ├── routes/               # Page routes
│   └── app.css              # Global styles
│
├── src-tauri/               # Tauri backend (Rust)
│   ├── src/                 # Rust source code
│   ├── tauri.conf.json      # Tauri configuration
│   └── Cargo.toml           # Rust dependencies
│
├── docs/                    # Documentation
├── tests/                   # Test files
├── .github/workflows/       # CI/CD (GitHub Actions)
│
├── package.json            # npm dependencies & scripts
├── tsconfig.json           # TypeScript config
├── vite.config.ts          # Vite config (SvelteKit build)
└── svelte.config.js        # SvelteKit config
```

---

## Common Issues & Troubleshooting

### Issue: `npm run tauri dev` fails with "Could not find workspace"

**Solution:**
```bash
# Make sure you're in the project root
pwd  # Should end with .../deadline-tracker

# Ensure Cargo.toml exists
ls src-tauri/Cargo.toml
```

### Issue: Rust compilation fails on macOS

**Solution:**
```bash
# Update Rust
rustup update

# Clear cache and rebuild
cargo clean
cargo build
```

### Issue: Frontend files not updating when I save

**Solution:**
```bash
# Make sure both dev servers are running:
# Terminal 1: npm run dev
# Terminal 2: npm run tauri dev

# If still not working, kill processes and restart:
pkill -f "vite|tauri"
npm run dev        # Terminal 1
npm run tauri dev  # Terminal 2
```

### Issue: Port 5173 (Vite dev server) already in use

**Solution:**
```bash
# Kill existing process
lsof -ti:5173 | xargs kill -9

# Or use different port
npm run dev -- --port 3000
```

### Issue: Database not initializing

**Solution:**
```bash
# Delete the database file (warning: loses local data)
rm ~/Library/Application\ Support/deadline-tracker/deadline-tracker.db

# Restart app - it will recreate with schema
npm run tauri dev
```

### Issue: "Cannot find module" TypeScript errors

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

---

## Editor Setup (VS Code)

### Recommended Extensions

```json
{
  "extensions": [
    "svelte.svelte-vscode",           // Svelte syntax highlighting
    "rust-lang.rust-analyzer",        // Rust LSP
    "dbaeumer.vscode-eslint",         // ESLint
    "esbenp.prettier-vscode",         // Prettier formatter
    "tamasfe.even-better-toml",       // TOML files (Cargo.toml)
    "vadimcn.vscode-lldb"             // Rust debugger
  ]
}
```

**Install via VS Code:**
```
Ctrl+P → type "ext install svelte.svelte-vscode"
```

### Recommended Settings (`.vscode/settings.json`)

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "[svelte]": {
    "editor.defaultFormatter": "svelte.svelte-vscode"
  },
  "[rust]": {
    "editor.defaultFormatter": "rust-analyzer"
  },
  "rust-analyzer.checkOnSave.command": "clippy",
  "files.exclude": {
    "**/target": true,
    "**/node_modules": true
  }
}
```

---

## Database Setup

### First-Time Launch

When the app launches for the first time:
1. Checks if `deadline-tracker.db` exists
2. If not, creates it and runs migrations
3. Schema is created automatically (no manual SQL needed)

**Database Location:**
- **macOS:** `~/Library/Application Support/deadline-tracker/`
- **Windows:** `C:\Users\<username>\AppData\Roaming\deadline-tracker\`
- **Linux:** `~/.local/share/deadline-tracker/`

### Inspecting Database (SQLite CLI)

```bash
# Open database
sqlite3 ~/Library/Application\ Support/deadline-tracker/deadline-tracker.db

# View tables
.tables

# View schema
.schema tasks

# Run query
SELECT * FROM tasks LIMIT 5;

# Exit
.exit
```

### Using SQLite Browser (GUI)

Download **DB Browser for SQLite**:
- https://sqlitebrowser.org/

Then open the `.db` file to browse/query visually.

---

## Testing

### Running Tests

```bash
# Unit tests (Vitest)
npm run test

# Watch mode (re-run on file change)
npm run test -- --watch

# With UI dashboard
npm run test:ui

# Coverage report
npm run test:coverage
```

### Writing Tests

**Example test file** (`src/lib/services/__tests__/taskService.test.ts`):

```typescript
import { describe, it, expect } from 'vitest';
import * as taskService from '../taskService';

describe('taskService', () => {
  it('should create a task', async () => {
    const task = await taskService.createTask({
      title: 'Test task',
      priority: 'high'
    });
    expect(task.id).toBeDefined();
    expect(task.priority).toBe('high');
  });
});
```

---

## Git Workflow

### Conventional Commits

Use semantic commit messages:

```bash
git commit -m "feat: add task search functionality"
git commit -m "fix: prevent duplicate subtasks"
git commit -m "docs: update database schema"
git commit -m "refactor: simplify task store"
git commit -m "test: add taskService unit tests"
git commit -m "style: improve dashboard layout"
git commit -m "chore: update dependencies"
```

### Creating a Feature Branch

```bash
# Create and switch to branch
git checkout -b feature/task-reminders

# Make changes and commit
git add .
git commit -m "feat: add task reminder notifications"

# Push to GitHub
git push origin feature/task-reminders

# Create Pull Request on GitHub
```

---

## Performance Tips

### Frontend Optimization

```bash
# Check bundle size
npm run build

# Analyze bundle
npx vite-plugin-visualizer
```

### Rust Optimization

```bash
# Build with optimizations
cargo build --release

# Check compilation time
time cargo build --release

# Analyze performance
cargo flamegraph
```

---

## Next Steps

1. **Read [ARCHITECTURE.md](ARCHITECTURE.md)** — Understand the system design
2. **Check [API.md](API.md)** — Learn about backend endpoints
3. **Review [DATABASE.md](DATABASE.md)** — Database schema and queries
4. **Start coding!** — Pick an issue or feature to work on

---

## Additional Resources

- [SvelteKit Docs](https://kit.svelte.dev/)
- [Tauri Docs](https://tauri.app/docs/)
- [Rust Book](https://doc.rust-lang.org/book/)
- [SQLite Tutorial](https://www.sqlite.org/tutorial.html)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**Questions?** Open an issue on GitHub or check the troubleshooting section above.
