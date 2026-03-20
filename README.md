# When Due

When Due is a local-first desktop app for tracking deadlines without the bloat of a full task suite. It is designed to be fast to capture into, easy to scan, and calm to edit.

- Repository: [github.com/wei-ming2/when-due](https://github.com/wei-ming2/when-due)
- Issues: [github.com/wei-ming2/when-due/issues](https://github.com/wei-ming2/when-due/issues)

## What It Does

- Quick capture with natural shorthand like `Chem hw ~2h @24 2300`
- Views for `Today`, `Upcoming`, `Overdue`, and `All`
- Priority and tag filters in the sidebar
- Inline row editing for due date, estimate, tags, and priority
- Expandable notes and subtasks when a task needs more context
- Completed-task hiding with configurable auto-archive retention
- Local SQLite storage with no cloud dependency
- macOS app bundle support and Windows tester builds

## Current Product Scope

When Due is intentionally narrow:

- It is a deadline tracker first
- It is not trying to be a project suite, team planner, or knowledge base
- Notes and subtasks exist to support deadlines, not to turn the app into a workspace

## Quick Start

### Build From Source

Prerequisites:

- Node.js 18+
- Rust 1.70+

```bash
git clone https://github.com/wei-ming2/when-due.git
cd when-due
npm install

# Development
npm run tauri:dev

# macOS production build
npm run tauri:build

# Windows build on a Windows host
npm run tauri:build:windows

# Windows test build from macOS
npm run tauri:build:windows:mac
```

Build outputs:

- macOS: `src-tauri/target/release/bundle/macos/When Due.app`
- Windows from Windows host: `src-tauri/target/release/bundle/nsis/When Due_*.exe`
- Windows cross-built from macOS: `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/When Due_*.exe`

## Quick Usage

1. Press `/` or `Cmd/Ctrl+K` to jump to quick add.
2. Type a task like `Math hw ~1h @tomorrow 9pm !high`.
3. Use the sidebar to narrow by view, priority, or tag.
4. Click a task row to open notes and subtasks.
5. Double-click the task title to rename it inline.
6. Click the due, estimate, tag, or priority pills to edit them directly.

## Suggested Input Format

The parser is designed around a small, learnable syntax:

- `@...` for a due date or deadline
- `~...` for a time estimate
- `!high`, `!medium`, or `!low` for priority

Examples:

- `Chem hw ~2h @24 2300`
- `Essay draft !high @tomorrow 6pm`
- `Review slides @monday 9am`

## Testing

Automated checks:

```bash
npm run type-check
npm test -- --run
cargo check --manifest-path src-tauri/Cargo.toml
```

Manual QA guidance lives in [TESTING.md](./TESTING.md).

## Documentation

- [CHANGELOG.md](./CHANGELOG.md)
- [GUIDE.md](./GUIDE.md)
- [TESTING.md](./TESTING.md)
- [docs/SETUP.md](./docs/SETUP.md)
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- [docs/DATABASE.md](./docs/DATABASE.md)
- [docs/API.md](./docs/API.md)
- [RELEASE_NOTES.md](./RELEASE_NOTES.md)

## Release Status

The repository is being prepared for the first GitHub release of `When Due v0.1.0`.

The current release focus is:

- stable daily use on macOS
- usable Windows tester builds for feedback
- clean docs and release assets

## License

MIT
