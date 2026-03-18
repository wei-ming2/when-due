# ⏰ Deadline Tracker

A minimal, intuitive desktop application for managing deadlines and tasks. Built for clarity, speed, and simplicity—no more cluttered productivity tools.

**Status:** ✅ **v0.1.0 Released** – Core MVP complete and ready to use  
**Latest Release:** [Download v0.1.0](https://github.com/yourusername/deadline-tracker/releases/tag/v0.1.0)

## Features (v0.1.0)

### ✅ Implemented
- **Task Management**: Create, edit, delete tasks with full metadata
- **Priority System**: High, Medium, Low with color-coded visual indicators
- **Time Estimation**: Per-task time estimates with automatic capacity calculation
- **Due Dates**: Set due dates and filter by today/overdue
- **Today's Focus Dashboard**: Single-screen view of today's tasks sorted by focus, due date, and priority
- **Focus Mode**: Mark tasks as "focus" to highlight critical work
- **Completion Tracking**: Check off tasks with visual feedback (strikethrough)
- **Dark Mode**: System preference detection with automatic theme switching
- **Persistence**: SQLite database ensures tasks survive app restarts
- **Capacity Planning**: Real-time capacity bar showing time commitment vs. available hours

### 🎯 Planned (v0.2+)
- Categories/Projects organization
- Subtasks with checklist
- Keyboard shortcuts (⌘N, ⌘K, Escape, etc.)
- Advanced filtering and search
- Recurring/repeating tasks
- Local desktop notifications
- Drag-and-drop prioritization
- Export to JSON/CSV

### 💭 Future (v0.3+)
- Optional end-to-end encrypted cloud sync
- Mobile companion app (iOS/Android)
- Time tracking & analytics
- Collaborative task sharing

## Screenshots

(Coming soon!)

## Quick Start

### Prerequisites
- Node.js 18+
- Rust 1.70+
- Git

### Installation & Development

## Quick Start

### Install & Run (v0.1.0)

**Option 1: Download Pre-built App (Recommended)**
1. Go to [Releases](https://github.com/yourusername/deadline-tracker/releases/tag/v0.1.0)
2. Download the `.dmg` file for macOS (or `.msi` for Windows, `.AppImage` for Linux)
3. Install and launch

**Option 2: Build from Source**

Prerequisites:
- Node.js 18+
- Rust 1.70+

```bash
# Clone & setup
git clone https://github.com/yourusername/deadline-tracker.git
cd deadline-tracker
npm install

# Run development build (hot-reload enabled)
npm run tauri:dev

# Or build production binary
npm run tauri build
# Output: src-tauri/target/release/bundle/
```

## Quick Usage Guide

1. **Add a Task**: Click the input at the bottom, type task title, press Enter
2. **Edit**: Click task title to open detail panel with edit option
3. **Complete**: Click checkbox to mark done (strikethrough effect)
4. **Check Capacity**: See the capacity bar at top—brown shows available time, red shows over capacity
5. **Focus Task**: (Coming v0.2—currently all active tasks shown)
6. **Dark Mode**: Automatically follows your macOS system preference

## Project Structure

```
deadline-tracker/
├── src-tauri/                 # Rust backend (Tauri framework)
│   ├── src/
│   │   ├── main.rs           # App entry, Tauri command handler registration
│   │   ├── handlers/
│   │   │   ├── task.rs       # Task CRUD operations (7 handlers)
│   │   │   ├── category.rs   # Category management (4 handlers) — UI coming v0.2
│   │   │   ├── subtask.rs    # Subtask ops (5 handlers) — UI coming v0.2
│   │   │   └── util.rs       # Utilities (version, export)
│   │   └── db/               # SQLite initialization, migrations, pool
│   └── Cargo.toml
│
├── src/                       # SvelteKit frontend (TypeScript)
│   ├── lib/
│   │   ├── components/       # Svelte components (TaskCard, FocusDashboard, etc.)
│   │   ├── stores/           # Reactive stores (tasks, categories, ui)
│   │   ├── services/         # API wrapper for Tauri IPC communication
│   │   └── utils/            # Formatting helpers
│   ├── routes/
│   │   └── +page.svelte      # Main app container
│   └── app.css               # Design system (light/dark theme CSS variables)
│
├── docs/                     # Technical documentation
├── tests/                    # Test suite (vitest)
└── package.json
```

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Desktop** | Tauri 2.0 (Rust) | 90% smaller than Electron, native OS integration |
| **Frontend** | SvelteKit + TypeScript | Minimal, highly reactive, excellent DX |
| **Styling** | Custom CSS | Full control, zero overhead, learning opportunity |
| **Database** | SQLite | Lightweight, local-first, battle-tested |
| **State** | Svelte stores | Built-in reactivity, minimal boilerplate |
| **Build/Deploy** | GitHub Actions | Free CI/CD, auto cross-platform builds |

## Contributing

This project emphasizes **high-quality architecture over rapid feature development**. Every decision is intentional.

### How to Contribute
- **Report bugs**: Open an [issue](https://github.com/yourusername/deadline-tracker/issues)
- **Suggest features**: Discuss in issues or PRs
- **Submit code**: PRs welcome—discuss design first

### Development Workflow
```bash
# 1. Create branch
git checkout -b feature/my-feature

# 2. Make changes & test
npm run tauri:dev  # Test during development
npm run lint       # Check code style
npm run type-check # Check TypeScript

# 3. Commit (conventional commits)
git commit -m "feat: add keyboard shortcuts for task creation"

# 4. Push & create PR
git push origin feature/my-feature
```

## Technical Documentation

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — Design decisions and data flow
- [SETUP.md](docs/SETUP.md) — Detailed dev environment setup
- [DATABASE.md](docs/DATABASE.md) — SQLite schema, queries, migrations
- [API.md](docs/API.md) — Tauri backend API reference
- [TESTING.md](TESTING.md) — Manual testing checklist & scenarios

## License

MIT License — Free to use, modify, and distribute!

## Performance & Data Privacy

- ✅ All data stored locally on your machine
- ✅ No cloud tracking (unless you opt-in later)
- ✅ Lightweight (~10MB app size)
- ✅ Fast startup (<1 second)
- ✅ Minimal memory footprint

---

**Questions?** Open an issue or check the [docs](docs/).

**Want to contribute?** See [CONTRIBUTING.md](CONTRIBUTING.md).
