# ⏰ Deadline Tracker

A minimal, intuitive desktop application for managing deadlines and tasks. Built for clarity, speed, and simplicity—no more cluttered productivity tools.

**Status:** 🚀 In active development (Phase 1: MVP)

## Features

### ✅ Current (MVP - Phase 1)
- Add, edit, delete tasks with due dates
- Priority levels (High, Medium, Low) with visual indicators
- Organize tasks by categories/projects
- "Today's Focus" view—drag tasks here to prioritize
- Time estimation for each task
- Full dark mode support
- Keyboard-first navigation (keyboard shortcuts for power users)
- Subtasks with checkbox completion

### 🎯 Planned (Phase 2)
- Recurring/repeating tasks
- Local desktop notifications
- Drag-to-focus dashboard
- Advanced search and filtering
- Export to JSON/CSV

### 💭 Future (Phase 3)
- Optional cloud sync (user data always in control)
- Mobile companion app
- Analytics (completion rate, time tracking)

## Screenshots

(Coming soon!)

## Quick Start

### Prerequisites
- Node.js 18+
- Rust 1.70+
- Git

### Installation & Development

```bash
# Clone the repository
git clone https://github.com/yourusername/deadline-tracker.git
cd deadline-tracker

# Install frontend dependencies
npm install

# Install Rust dependencies & build backend
cd src-tauri && cargo build && cd ..

# Start development server (hot reload)
npm run dev

# Build for production
npm run tauri build
```

### Running the App
```bash
# During development
npm run tauri dev

# After building
# Open the generated installer (.dmg for macOS, .msi for Windows, .AppImage for Linux)
```

## Project Structure

```
deadline-tracker/
├── src-tauri/              # Rust backend (Tauri)
│   ├── src/
│   │   ├── main.rs        # App initialization
│   │   ├── db/            # SQLite database layer
│   │   ├── handlers/      # API handlers for tasks, categories
│   │   └── sync/          # Future: cloud sync logic
│   └── Cargo.toml
│
├── src/                    # SvelteKit frontend (TypeScript)
│   ├── lib/
│   │   ├── components/    # Reusable UI components
│   │   ├── stores/        # Svelte reactive stores
│   │   ├── services/      # Business logic & Tauri API wrapper
│   │   └── styles/        # Custom CSS (no framework)
│   ├── routes/            # Page routes
│   └── app.css
│
├── tests/                  # Unit & integration tests
├── .github/workflows/      # CI/CD (auto-build, release)
├── docs/                   # Technical documentation
└── package.json
```

## Tech Stack

- **Frontend:** SvelteKit + TypeScript + Custom CSS
- **Desktop:** Tauri (Rust-based, lightweight)
- **Database:** SQLite (local-only for now)
- **Architecture:** Event-driven with stores for state
- **Testing:** Vitest + Playwright
- **Deployment:** GitHub Actions + GitHub Releases

## Contributing

This is primarily a personal learning project, but feedback and ideas are welcome!

### Development Guidelines
- Keep it simple—one feature at a time
- Test manually on all platforms (macOS, Windows, Linux) before releasing
- Document changes in commit messages (using conventional commits)
- File issues for bugs or feature requests

### Workflow
1. Create a feature branch: `git checkout -b feature/task-reminder`
2. Make changes and test locally
3. Commit: `git commit -m "feat: add task reminders"`
4. Push: `git push origin feature/task-reminder`
5. Create a Pull Request with description

## Documentation

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — Design decisions and technical overview
- [SETUP.md](docs/SETUP.md) — Detailed development environment setup
- [API.md](docs/API.md) — Tauri backend API reference
- [DATABASE.md](docs/DATABASE.md) — SQLite schema and queries

## License

MIT License — Feel free to use, modify, and distribute!

## Why I Built This

After using TickTick and other productivity apps, I found:
- UI too cluttered when managing complex tasks
- Subtask creation unintuitive (should be one Tab key)
- Pricing model unclear
- Wanted full control over my data

This project is both a practical tool and a deep dive into full-stack desktop development.

## Performance & Data Privacy

- ✅ All data stored locally on your machine
- ✅ No cloud tracking (unless you opt-in later)
- ✅ Lightweight (~10MB app size)
- ✅ Fast startup (<1 second)
- ✅ Minimal memory footprint

---

**Questions?** Open an issue or check the [docs](docs/).

**Want to contribute?** See [CONTRIBUTING.md](CONTRIBUTING.md).
