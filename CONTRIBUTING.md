# Contributing to Deadline Tracker

Thanks for your interest in contributing! This project is built with **best practices first**, focusing on architectural quality and learning value.

## 🎯 Core Principles

1. **Quality over Speed** – We won't merge code that cuts corners
2. **Type Safety** – 100% TypeScript/Rust for production code  
3. **Documentation** – Every feature includes docs and examples
4. **Testing** – Testable code is good code
5. **Performance** – Profile before optimizing

## 🛠️ Development Setup

```bash
# Clone and install
git clone https://github.com/yourusername/deadline-tracker.git
cd deadline-tracker
npm install

# Run development build
npm run tauri:dev

# In another terminal, run checks before committing
npm run type-check
npm run lint
npm run format
npm run test
```

## 📋 Process

### 1. Pick an Issue
- Look at [open issues](https://github.com/yourusername/deadline-tracker/issues)
- Comment to claim it
- Discuss design **before coding**

### 2. Create a Feature Branch
```bash
git checkout -b feature/add-keyboard-shortcuts
# or
git checkout -b fix/task-search-crash
```

### 3. Make Your Changes

**Commit with Conventional Commits:**
```bash
git commit -m "feat(tasks): add keyboard shortcut Cmd+N for new task"
git commit -m "fix(database): prevent duplicate task creation"
git commit -m "docs: add troubleshooting section to README"
```

**Types:**
- `feat` – New feature
- `fix` – Bug fix
- `docs` – Documentation
- `test` – Test coverage
- `refactor` – Code reorganization
- `perf` – Performance improvement
- `chore` – Build, CI/CD, dependencies

### 4. Test & Verify

```bash
npm run type-check && npm run lint && npm run test
npm run tauri:dev  # Test manually in the app
```

### 5. Create a Pull Request

Include:
- Clear title (follows conventional commits)
- Description of what/why/how
- Testing notes
- Checklist:
  - [ ] Code passes `npm run lint` and `npm run type-check`
  - [ ] Added tests or testing steps
  - [ ] Updated documentation
  - [ ] No breaking changes (or documented)

## ✅ What Gets Merged

- Well-tested, documented code
- Clear, conventional commit messages
- Follows existing patterns
- Passes all automated checks

## ❌ What Won't Be Merged

- Code without type annotations
- Functions without documentation
- Commits that break existing tests
- Undocumented API changes

## 📚 Additional Guides

- [TECHNICAL_SUMMARY.md](TECHNICAL_SUMMARY.md) – Architecture
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) – Design decisions
- [TESTING.md](TESTING.md) – Testing guide

---

Thank you for contributing! 🙌

## Testing

- Add unit tests for new functions
- Add integration tests for features
- Always test on macOS (also Windows/Linux if possible)

## Questions?

Open an issue or ask in the discussion section. Happy coding! 🎉
