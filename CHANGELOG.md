# Changelog

All notable changes to Deadline Tracker will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-03-18

### ✨ Added (MVP - Initial Release)

**Core Features:**
- Task creation, editing, and deletion with full metadata support
- Priority system (High, Medium, Low) with visual color indicators
- Time estimation per task with automatic capacity calculation
- Due date assignment and tracking
- Task completion toggling with visual feedback (strikethrough, opacity)
- Focus mode for marking high-priority tasks (backend ready, UI coming v0.2)
- Search functionality on task titles and descriptions (backend ready)

**User Interface:**
- "Today's Focus" dashboard showing today's active tasks sorted by focus → due date → priority
- Capacity bar displaying time commitment vs. available hours (8h default, configurable)
- Task detail panel for editing and inspecting task metadata
- Quick-add input field for rapid task creation
- Responsive design for desktop (mobile support planned v0.2+)
- Dark mode with automatic system preference detection
- Custom CSS design system with light/dark theme support via CSS variables

**Backend & Architecture:**
- Rust handlers for all CRUD operations (7 task handlers, 4 category, 5 subtask)
- SQLite database with WAL mode for concurrent reads
- Tauri 2.0 IPC communication between frontend and backend
- Reactive Svelte stores with derived stores for filtering and sorting
- Full TypeScript type safety across entire stack
- Database migrations with schema versioning

**Developer Experience:**
- Hot-reload during development (Vite + Cargo watch)
- TypeScript strict mode throughout
- ESLint + Prettier for code quality
- Vitest for unit testing
- Manual testing checklist (see TESTING.md)

### 📦 Package Information
- **Version**: 0.1.0
- **Release Date**: March 18, 2026
- **Node.js Minimum**: 18.0.0
- **Rust Edition**: 2021
- **License**: MIT

### 🏗️ Architecture Decisions
- **Tauri** over Electron: 90% size reduction, native OS integration
- **SvelteKit** over React/Vue: Minimal framework, reactive by default
- **Custom CSS** over Tailwind: Full control, learning opportunity, zero overhead
- **SQLite** over cloud: Local-first, user data control, no dependencies
- **Svelte stores** over Redux/Pinia: Built-in reactivity, minimal boilerplate

### 🧪 Testing
- Backend handlers tested via Tauri IPC (manual testing)
- Database persistence verified
- Theme switching validated
- Task CRUD operations functional
- Capacity calculations accurate

### 🚫 Known Limitations
- No UI for categories (backend implemented, UI deferred to v0.2)
- No UI for subtasks (backend implemented, UI deferred to v0.2)
- No search/filter UI (backend ready, UI deferred to v0.2)
- No keyboard shortcuts (planned for v0.2)
- No error boundary UI for failed requests
- No recurring tasks
- No cloud sync
- No mobile app
- macOS first release (Windows/Linux binaries included but untested)

### 📋 What's Working
- [x] Create tasks
- [x] Edit tasks
- [x] Delete tasks
- [x] Toggle task completion
- [x] View today's tasks
- [x] Time capacity planning
- [x] Dark mode
- [x] Database persistence
- [x] TypeScript type safety
- [x] Hot-reload development

### 🎯 Next Steps (Planned for v0.2)
- [ ] Categories UI
- [ ] Subtasks UI with checklist
- [ ] Keyboard shortcuts (⌘N, ⌘K, Escape)
- [ ] Advanced filtering (by date, priority, category)
- [ ] Search UI
- [ ] Error boundary component
- [ ] Loading states and spinners
- [ ] Recurring tasks
- [ ] Local desktop notifications

---

## Upcoming Releases

### v0.2.0 (Planned Q2 2026)
- Categories/projects organization
- Subtasks UI
- Keyboard shortcuts
- Advanced search and filtering
- Recurring tasks (daily, weekly, monthly)
- Error handling UI
- Performance optimizations

### v0.3.0 (Planned Q3 2026)
- Optional cloud sync (encrypted, user-controlled)
- Mobile companion app
- Analytics (completion rate, time tracking)
- Collaboration features
- Export/import (JSON, CSV)

### v1.0.0 (Planned Q4 2026)
- Feature-complete core
- Cross-platform stability
- Comprehensive documentation
- Community-driven improvements
