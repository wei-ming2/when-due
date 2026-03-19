# Architecture Overview

This document outlines the complete technical architecture of Deadline Tracker, including design decisions, data flow, and component interactions.

## Table of Contents

1. [System Overview](#system-overview)
2. [Data Model](#data-model)
3. [Frontend Architecture](#frontend-architecture)
4. [Backend Architecture](#backend-architecture)
5. [State Management](#state-management)
6. [Communication Layer](#communication-layer)
7. [Database Design](#database-design)
8. [UI/UX Patterns](#uiux-patterns)
9. [Future: Cloud Sync](#future-cloud-sync)

---

## System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   DEADLINE TRACKER                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │        SvelteKit Frontend (TypeScript)           │  │
│  │  ├─ Components (TaskItem, Editor, etc.)          │  │
│  │  ├─ Stores (Tasks, Categories, UI State)         │  │
│  │  ├─ Services (API wrappers, notifications)       │  │
│  │  └─ Custom CSS (responsive, dark mode)           │  │
│  │                                                   │  │
│  │         ↕ (IPC: invoke() & listen())             │  │
│  │                                                   │  │
│  ├──────────────────────────────────────────────────┤  │
│  │      Tauri Window + Webview Runtime              │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │    Tauri Backend (Rust + Tokio Runtime)          │  │
│  │  ├─ Handlers (task CRUD, category logic)         │  │
│  │  ├─ Database Layer (SQLite connections)          │  │
│  │  ├─ Native APIs (file system, notifications)     │  │
│  │  └─ Sync Module (future cloud integration)       │  │
│  │                                                   │  │
│  │         ↕ (SQL queries)                          │  │
│  │                                                   │  │
│  ├──────────────────────────────────────────────────┤  │
│  │    SQLite Database (.sqlite file)                │  │
│  │ ├─ Tasks table                                   │  │
│  │ ├─ Subtasks table                                │  │
│  │ ├─ Categories table                              │  │
│  │ ├─ RecurringRules table                          │  │
│  │ └─ Indices for performance                       │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Why This Architecture?

| Decision | Rationale |
|----------|-----------|
| **SvelteKit** | Lightweight, reactive, easy to learn, compiles to vanilla JS |
| **Tauri** | 90% smaller than Electron, Rust performance, native OS integration |
| **SQLite** | Modern desktop standard, instant lookup, transactional safety, zero server setup |
| **Custom CSS** | Learning opportunity, full design control, zero framework overhead |
| **IPC (Inter-Process Communication)** | Frontend and backend remain cleanly separated; security boundary |

---

## Data Model

### Entity-Relationship Diagram

```
┌──────────────┐        ┌──────────────┐
│  Category    │        │  RecurringRule
├──────────────┤        ├──────────────┤
│ id (PK)      │◄───┐   │ id (PK)      │
│ name         │    │   │ taskId (FK)  │
│ color (hex)  │    │   │ pattern      │
│ icon (emoji) │    │   │ endDate      │
└──────────────┘    │   └──────────────┘
                    │
                    │
┌──────────────┐    │    ┌──────────────┐
│  Task        │────┼───►│ Subtask      │
├──────────────┤    │    ├──────────────┤
│ id (PK)      │    │    │ id (PK)      │
│ title        │    │    │ taskId (FK)  │
│ description  │    │    │ title        │
│ dueDate      │    │    │ completed    │
│ priority     │    │    │ order        │
│ timeEst      │    │    │ createdAt    │
│ categoryId  ──────┘    │ updatedAt    │
│ status       │         └──────────────┘
│ isFocus      │
│ completedAt  │
│ createdAt    │
│ updatedAt    │
└──────────────┘
```

### Table Schemas (SQL)

```sql
CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL,  -- hex color "#FF5733"
    icon TEXT,            -- emoji "📁"
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    dueDate TIMESTAMP,
    priority TEXT DEFAULT 'medium', -- low, medium, high
    timeEstimate INTEGER,           -- minutes
    categoryId TEXT REFERENCES categories(id),
    status TEXT DEFAULT 'active',   -- active, completed, archived
    isFocus BOOLEAN DEFAULT FALSE,
    completedAt TIMESTAMP,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tasks_dueDate ON tasks(dueDate);
CREATE INDEX idx_tasks_categoryId ON tasks(categoryId);
CREATE INDEX idx_tasks_isFocus ON tasks(isFocus);

CREATE TABLE subtasks (
    id TEXT PRIMARY KEY,
    taskId TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    order INTEGER NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subtasks_taskId ON subtasks(taskId);

CREATE TABLE recurring_rules (
    id TEXT PRIMARY KEY,
    taskId TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    pattern TEXT NOT NULL, -- daily, weekly, monthly
    endDate TIMESTAMP,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Frontend Architecture

### Directory Structure & Responsibilities

```
src/
├── app.html                     # Entry HTML
├── app.css                      # Global styles
│
├── lib/
│   ├── components/              # Reusable UI components
│   │   ├── TaskItem.svelte      # Single task row
│   │   ├── TaskEditor.svelte    # Modal/sidebar for editing
│   │   ├── SubtaskList.svelte   # Subtask accordion
│   │   ├── CategoryBadge.svelte # Category tag
│   │   ├── TaskForm.svelte      # New task input
│   │   ├── Sidebar.svelte       # Navigation sidebar
│   │   └── Header.svelte        # Top nav with search
│   │
│   ├── stores/                  # Svelte stores (reactive state)
│   │   ├── tasks.ts             # Task state & logic
│   │   ├── categories.ts        # Category state & logic
│   │   ├── ui.ts                # UI state (modal open, sidebar)
│   │   └── notifications.ts     # Toast/notification queue
│   │
│   ├── services/                # Business logic & API wrappers
│   │   ├── taskService.ts       # Task CRUD + business rules
│   │   ├── categoryService.ts   # Category operations
│   │   ├── tauriAPI.ts          # Tauri IPC wrapper
│   │   ├── notificationService.ts # Native notifications
│   │   └── shortcuts.ts         # Keyboard shortcut handler
│   │
│   └── styles/
│       ├── global.css           # Reset, variables, utilities
│       ├── themes.css           # Light/dark mode
│       └── components.css       # Component-specific styles
│
└── routes/
    ├── +layout.svelte           # Root layout (sidebar, nav)
    ├── +page.svelte             # Dashboard (today's view)
    ├── focus/
    │   └── +page.svelte         # Today's focus view
    ├── upcoming/
    │   └── +page.svelte         # Calendar/list view (next 7 days)
    ├── all/
    │   └── +page.svelte         # All tasks view
    └── settings/
        └── +page.svelte         # Settings, categories, preferences
```

### Component Hierarchy

```
+layout.svelte
├── Sidebar.svelte
│   ├── Navigation links
│   └── Quick category filter
├── Header.svelte
│   ├── Current view title
│   ├── Search bar (Cmd+K)
│   └── Settings icon
└─── RouterView
     ├── +page.svelte (Dashboard)
     │   ├── TaskForm.svelte
     │   ├── TaskItem.svelte (x multiple)
     │   │   └── TaskEditor.svelte (on click)
     │   │       └── SubtaskList.svelte
     │   └── CompletedTasks section
     │
     └── settings/+page.svelte
         ├── CategoryManager
         └── PreferenceToggles
```

### State Flow (Stores)

```typescript
// tasks store: Reactive task collection
export const tasksStore = writable<Task[]>([]);
export const taskById = derived(tasksStore, $tasks => 
  new Map($tasks.map(t => [t.id, t]))
);

// ui store: Modal/sidebar state
export const uiState = writable({
  editingTaskId: null,
  selectedCategory: null,
  sidebarOpen: true,
  darkMode: true
});

// Updates flow: Component → Action → Service → Tauri API → Database
// Example:
// 1. User clicks "Add Task"
// 2. Component calls taskService.createTask()
// 3. Service calls invoke('create_task', data)
// 4. Tauri handler executes SQL INSERT
// 5. Handler returns new task
// 6. Service updates tasksStore.update()
// 7. Component re-renders (reactive)
```

---

## Backend Architecture

### Directory Structure

```
src-tauri/src/
├── main.rs                      # App initialization & IPC setup
│
├── db/
│   ├── mod.rs                   # DB initialization & connection pool
│   ├── migrations.sql           # Schema (run on first launch)
│   ├── task_queries.rs          # Task CRUD queries
│   ├── category_queries.rs      # Category operations
│   └── recurring_queries.rs     # Recurring task logic
│
├── handlers/                    # Tauri command handlers
│   ├── task.rs                  # Handler: create_task, update_task, etc.
│   ├── category.rs              # Handler: create_category, delete_category
│   ├── subtask.rs               # Handler: add_subtask, complete_subtask
│   └── search.rs                # Handler: search_tasks, filter_tasks
│
├── sync/
│   └── mod.rs                   # (Future) Cloud sync logic
│
└── utils/
    ├── mod.rs                   # Utilities
    └── id_gen.rs                # UUID generation
```

### IPC Communication Pattern

**Frontend (TypeScript/SvelteKit):**
```typescript
// Invoke a Tauri handler
const task = await invoke('create_task', {
  title: 'Review deadline',
  dueDate: new Date('2026-03-20'),
  priority: 'high'
});

// Listen for events
listen('tasks-synced', (event) => {
  console.log('Database updated');
});
```

**Backend (Rust):**
```rust
#[tauri::command]
async fn create_task(
    title: String,
    due_date: Option<String>,
    priority: String,
) -> Result<Task, String> {
    // Validate input
    // Insert into DB
    // Return new task or error
    Ok(task)
}
```

### Command Endpoints

| Command | Args | Returns | Purpose |
|---------|------|---------|---------|
| `create_task` | `{title, dueDate?, priority, categoryId?}` | `{id, ...task}` | Create new task |
| `update_task` | `{id, title?, dueDate?, priority?}` | `{...updated task}` | Edit task details |
| `delete_task` | `{id}` | `{success: bool}` | Delete task |
| `get_tasks` | `{filter?: 'today'\|'focus'\|'all'}` | `{tasks: Task[]}` | Fetch tasks |
| `toggle_task_complete` | `{id, completed: bool}` | `{...task}` | Mark complete/incomplete |
| `toggle_focus` | `{id, isFocus: bool}` | `{...task}` | Add/remove from focus |
| `create_category` | `{name, color, icon?}` | `{id, ...category}` | Create category |
| `get_categories` | `{}` | `{categories: Category[]}` | List all categories |
| `add_subtask` | `{taskId, title}` | `{...subtask}` | Create subtask |
| `toggle_subtask` | `{id, completed: bool}` | `{...subtask}` | Mark subtask done |
| `search_tasks` | `{query: string}` | `{tasks: Task[]}` | Search by title/desc |

---

## State Management

### Svelte Stores Pattern

```typescript
// tasks.ts
import { writable, derived } from 'svelte/store';

// Primary store
export const tasksStore = writable<Task[]>([]);

// Derived stores (auto-update when tasksStore changes)
export const todaysTasks = derived(tasksStore, $tasks =>
  $tasks.filter(t => isToday(t.dueDate) && !t.completed)
);

export const focusTasks = derived(tasksStore, $tasks =>
  $tasks.filter(t => t.isFocus)
);

// Usage in component:
<script>
  import { todaysTasks } from '$lib/stores/tasks';
</script>

{#each $todaysTasks as task (task.id)}
  <TaskItem {task} />
{/each}
```

### Data Sync Strategy

**On App Launch:**
1. Frontend initializes
2. Calls `invoke('get_tasks', {})`
3. Backend queries SQLite, returns all tasks
4. Frontend populates `tasksStore`
5. UI renders (subscribed to store)

**On User Action (create task):**
1. User submits form
2. Component calls `taskService.createTask()`
3. Service calls `invoke('create_task', data)`
4. Tauri handler inserts into SQLite
5. Handler returns new task object
6. Service calls `tasksStore.update(tasks => [...tasks, newTask])`
7. Store subscribers (components) re-render automatically

---

## Communication Layer

### Tauri IPC Wrapper (`tauriAPI.ts`)

```typescript
// Safe, typed API wrapper around Tauri's invoke
import { invoke } from '@tauri-apps/api/tauri';

export async function createTask(task: TaskInput): Promise<Task> {
  try {
    return await invoke('create_task', task);
  } catch (error) {
    console.error('Failed to create task:', error);
    throw new Error(`Task creation failed: ${error}`);
  }
}

export async function getTasks(): Promise<Task[]> {
  return await invoke('get_tasks', {});
}

// More commands...
```

### Error Handling

```typescript
// Frontend
try {
  await taskService.createTask({ title: 'New task' });
} catch (err) {
  uiState.update(s => ({
    ...s,
    notification: { type: 'error', message: err.message }
  }));
}

// Backend (Rust)
#[tauri::command]
async fn create_task(...) -> Result<Task, String> {
  if title.trim().is_empty() {
    return Err("Title cannot be empty".to_string());
  }
  // Proceed with DB insert...
}
```

---

## Database Design

### SQLite Advantages for This Project

| Feature | Benefit |
|---------|---------|
| **Single-file database** | No server setup, deploy with the app |
| **Automatic backups** | Copy `.sqlite` file to cloud service |
| **Transactions** | Ensure consistency (all-or-nothing) |
| **Indices** | Fast queries even with 10,000+ tasks |
| **JSONB support** | Future: store flexible task metadata |
| **Built into Tauri** | Zero extra dependencies |

### Performance Considerations

**Indices for Common Queries:**
```sql
-- Fast "get today's tasks"
CREATE INDEX idx_tasks_dueDate ON tasks(dueDate);

-- Fast "get category tasks"
CREATE INDEX idx_tasks_categoryId ON tasks(categoryId);

-- Fast "get focus tasks"
CREATE INDEX idx_tasks_isFocus ON tasks(isFocus) WHERE isFocus = TRUE;
```

**Query Examples:**
```sql
-- Get all tasks due today
SELECT * FROM tasks 
WHERE DATE(dueDate) = DATE('now') 
AND status != 'archived' 
ORDER BY priority DESC, createdAt ASC;

-- Search tasks
SELECT * FROM tasks 
WHERE title LIKE '%' || ? || '%' OR description LIKE '%' || ? || '%'
LIMIT 100;

-- Get task with subtasks
SELECT * FROM tasks WHERE id = ?;
SELECT * FROM subtasks WHERE taskId = ? ORDER BY order ASC;
```

### Migration System

On app first launch:
1. Check if `deadline-tracker.db` exists
2. If not, run `migrations.sql` to create schema
3. If exists, verify version and run missing migrations
4. Ensure indices exist

---

## UI/UX Patterns

### Dashboard Layout (Minimal & Focused)

```
┌─────────────────────────────────────────────────────┐
│ 📅 Today • March 17                           ⚙️ 🔍  │
├─────────────────────────────────────────────────────┤
│ ⭐ TODAY'S FOCUS                                    │
│ ┌─────────────────────────────────────────────────┐ │
│ │ □ Review project deadline                   🔴  │ │
│ │ □ Finish design mockups                     🟡  │ │
│ │ [+ Add to focus]                                │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ⏰ UPCOMING (Next 7 Days)                           │
│ ┌─────────────────────────────────────────────────┐ │
│ │ • Task 1 due Tomorrow                      🔴  │ │
│ │ • Task 2 due Thu, Mar 20                  🟡  │ │
│ │ • Task 3 due Fri, Mar 21                  🟢  │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ✅ COMPLETED (Today)                               │
│ ┌─────────────────────────────────────────────────┐ │
│ │ • Task X (completed 2 hours ago)                │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+K` or `Ctrl+K` | Open search |
| `Cmd+N` or `Ctrl+N` | New task |
| `Tab` (in task) | Create subtask |
| `Enter` | Save edit, confirm |
| `Esc` | Cancel edit, close modal |
| `Cmd+1/2/3` | Switch view (Today/Focus/Upcoming) |
| `D` (with task selected) | Mark as done |
| `P` (with task selected) | Toggle priority |

### Inline Editing (No Modal Required)

**Before (problematic):**
- Click task → large modal pops up with 10 fields
- Hard to see other tasks while editing
- Takes up screen space

**After (our approach):**
- Click task row → right sidebar expands
- See task details & full list simultaneously
- Tab key creates subtask automatically
- Minimal visual disruption

---

## Future: Cloud Sync

### Overview

Phase 3 will add optional cloud sync (fully opt-in).

**Architecture:**
1. Desktop app syncs local SQLite to cloud DB
2. Cloud DB: PostgreSQL + Node.js API
3. Sync logic: conflict resolution + versioning
4. User controls: "Sync enabled" toggle in settings

**Privacy:**
- User data encrypted in transit (HTTPS)
- End-to-end encryption option (future)
- Open-source backend code
- Users can self-host

**Sync Mechanism:**
```
┌─────────┐         ┌────────────┐         ┌──────────┐
│ Desktop │ ◄────►  │ Sync Layer │ ◄────►  │ Cloud DB │
│ SQLite  │  (IPC)  │  (Tauri)   │ (REST)  │ (Postgres)
└─────────┘         └────────────┘         └──────────┘
  • Version tracking per task
  • Timestamp-based conflict resolution
  • Incremental sync (only changed records)
```

---

## Development Workflows

### Adding a New Feature

1. **Design:**
   - Specify new DB table or field
   - Plan IPC commands (handler signatures)
   - Mock UI in component

2. **Backend (Rust):**
   - Add DB schema migration
   - Write handler in `src-tauri/src/handlers/`
   - Test with `cargo test`

3. **Frontend (SvelteKit):**
   - Create component or update existing
   - Add/update store logic
   - Call Tauri handler via service
   - Test interactions

4. **Integration:**
   - Manual testing across platforms
   - Commit with conventional message
   - Create PR for review

### Testing Strategy

- **Unit tests:** Component logic, service functions
- **Integration tests:** Full flow (click → API call → DB → UI update)
- **E2E tests:** Playwright scenarios (realistic user workflows)

---

## Summary

**Key Takeaways:**

1. **Separation of concerns:** Frontend handles UI, backend handles data
2. **Reactive state:** Changes automatically flow to components
3. **Local-first:** All data on user's machine, optional cloud later
4. **Performance:** Indices + IPC makes even 10K tasks fast
5. **Extensible:** Easy to add features without rewriting core

**Next Steps:**
- See [SETUP.md](SETUP.md) for development environment
- See [API.md](API.md) for handler details
- See [DATABASE.md](DATABASE.md) for query reference
