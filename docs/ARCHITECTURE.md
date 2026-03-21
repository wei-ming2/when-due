# Architecture

When Due is a Tauri 2 desktop application with:

- a Svelte frontend
- a Rust backend
- a local SQLite database

The design goal is simple: keep the core deadline flow fast and trustworthy.

## High-Level Structure

```text
Quick Add / Task Row / Notes Panel
        ↓
Svelte stores
        ↓
API wrapper (`@tauri-apps/api`)
        ↓
Rust command handlers
        ↓
SQLite
```

## Frontend

### Main UI Components

- `FocusDashboard.svelte`
  The main app shell. Despite the legacy filename, this is now the primary deadline workspace.
- `FilterSidebar.svelte`
  View switching, priority filters, and tag management.
- `QuickAddInput.svelte`
  Keyboard-first capture with parser preview.
- `TaskCard.svelte`
  The primary task row. Supports row-level editing for title, due date, estimate, tags, and priority.
- `TaskDetailPanel.svelte`
  Expanded notes and subtasks only. It is no longer the main task-editing surface.
- `SettingsPanel.svelte`
  Theme, deadline-reminder settings, completed-task visibility, and archive-retention settings.

### Frontend State

- `tasks.ts`
  Holds the current loaded task set and exposes CRUD helpers.
- `categories.ts`
  Holds tag data.
- `ui.ts`
  Holds view filters, reminder settings, theme choice, completed visibility, and sidebar state.
- `notifications.ts`
  Keeps OS deadline reminders in sync with the current task data and user settings.

### UI Model

The UI follows progressive disclosure:

- row-level metadata is edited on the row
- notes and subtasks are expanded only when needed
- filters live in the sidebar
- quick add stays always visible and keyboard-friendly

## Backend

### Tauri Commands

The Rust backend exposes commands for:

- tasks
- categories
- subtasks
- utility helpers like version lookup and database export

These commands are registered in `src-tauri/src/main.rs`.

### Current Release-Relevant Backend Behavior

- task filtering by view: `today`, `week`, `overdue`, `all`
- completed-task archiving after a configurable retention window
- multi-tag syncing through the `task_tags` table
- subtask CRUD with count rollups exposed back to the frontend
- Tauri notification plugin registration for desktop deadline reminders

## Data Flow

### Creating A Task

1. User types into quick add
2. `deadline-parser.ts` extracts title, estimate, priority, and due date
3. `tasks.create(...)` adds the task optimistically when it belongs in the current view
4. Rust inserts the task into SQLite
5. The notification sync service refreshes scheduled reminders in the background

### Editing A Task

1. User edits directly from the task row
2. Row-level editors call `tasks.update(...)`
3. The store applies optimistic local updates after the backend responds
4. Notes and subtasks are managed separately inside the expanded panel
5. Reminder schedules are refreshed if the due date changes

## Platform Support

When Due is developed primarily on macOS, but the codebase now supports:

- macOS app builds
- Windows host builds
- Windows tester builds cross-built from macOS

Cross-built Windows installers are suitable for feedback cycles, but the cleanest release path is still a matching host build per platform.

## Legacy Notes

Some backend/schema pieces still reflect earlier product experiments:

- `isFocus` still exists in the database schema, but it is no longer a primary user-facing concept
- `recurring_rules` exists in the schema, but recurring tasks are not part of the current product scope

These should be treated as legacy technical debt, not active product surface.
