# Backend API Reference

Complete documentation of Tauri command handlers (the API between frontend and backend).

## Overview

All communication between the SvelteKit frontend and Tauri backend happens through **Tauri commands**. These are TypeScript-to-Rust RPC calls.

**General Pattern:**

```typescript
// Frontend (TypeScript)
const result = await invoke('command_name', { arg1: 'value1', arg2: 123 });

// Backend (Rust handler)
#[tauri::command]
async fn command_name(arg1: String, arg2: i32) -> Result<ResponseType, String> {
  // Process request
  Ok(result)
}
```

---

## Task Commands

### `get_tasks`

Fetch tasks with optional filtering.

**Request:**
```typescript
invoke('get_tasks', {
  filter?: 'today' | 'focus' | 'upcoming' | 'all' | 'completed' | 'archived'
})
```

**Response:**
```typescript
{
  tasks: Array<{
    id: string
    title: string
    description: string | null
    dueDate: string | null  // ISO 8601
    priority: 'low' | 'medium' | 'high'
    timeEstimate: number | null  // minutes
    categoryId: string | null
    status: 'active' | 'completed' | 'archived'
    isFocus: boolean
    completedAt: string | null  // ISO 8601
    createdAt: string
    updatedAt: string
  }>
}
```

**Examples:**

```typescript
// Get today's tasks
const result = await invoke('get_tasks', { filter: 'today' });

// Get all active tasks
const result = await invoke('get_tasks', { filter: 'all' });

// Get tasks in focus
const result = await invoke('get_tasks', { filter: 'focus' });
```

**Backend (Rust):**
```rust
#[tauri::command]
async fn get_tasks(filter: Option<String>) -> Result<GetTasksResponse, String> {
  let db = get_connection()?;
  
  let query = match filter.as_deref() {
    Some("today") => {
      "SELECT * FROM tasks WHERE DATE(dueDate) = DATE('now') AND status != 'archived'"
    },
    Some("focus") => {
      "SELECT * FROM tasks WHERE isFocus = TRUE AND status = 'active'"
    },
    _ => "SELECT * FROM tasks WHERE status != 'archived'"
  };
  
  let tasks = db.query_and_map(query, |row| Task::from_row(row))?;
  Ok(GetTasksResponse { tasks })
}
```

---

### `create_task`

Create a new task.

**Request:**
```typescript
invoke('create_task', {
  title: string          // required
  description?: string
  dueDate?: string       // ISO 8601 or null
  priority?: 'low' | 'medium' | 'high'  // default: 'medium'
  timeEstimate?: number  // minutes
  categoryId?: string
})
```

**Response:**
```typescript
{
  id: string
  title: string
  description: string | null
  dueDate: string | null
  priority: 'low' | 'medium' | 'high'
  timeEstimate: number | null
  categoryId: string | null
  status: 'active'
  isFocus: false
  completedAt: null
  createdAt: string
  updatedAt: string
}
```

**Example:**

```typescript
const task = await invoke('create_task', {
  title: 'Review project deadline',
  dueDate: '2026-03-20T17:00:00Z',
  priority: 'high',
  categoryId: 'cat-1',
  timeEstimate: 60
});
console.log('Created task:', task.id);
```

---

### `update_task`

Update an existing task.

**Request:**
```typescript
invoke('update_task', {
  id: string             // required
  title?: string
  description?: string
  dueDate?: string | null
  priority?: 'low' | 'medium' | 'high'
  timeEstimate?: number | null
  categoryId?: string | null
})
```

**Response:**
```typescript
// Returns updated task object (same as create_task response)
```

**Example:**

```typescript
const updated = await invoke('update_task', {
  id: 'task-1',
  priority: 'high',
  dueDate: '2026-03-25T10:00:00Z'
});
```

---

### `delete_task`

Delete a task (cascades to subtasks).

**Request:**
```typescript
invoke('delete_task', { id: string })
```

**Response:**
```typescript
{ success: boolean }
```

**Example:**

```typescript
const result = await invoke('delete_task', { id: 'task-1' });
if (result.success) {
  console.log('Task deleted');
}
```

---

### `toggle_task_complete`

Mark task as complete or incomplete.

**Request:**
```typescript
invoke('toggle_task_complete', {
  id: string
  completed: boolean  // true = mark complete, false = mark incomplete
})
```

**Response:**
```typescript
// Returns updated task object
```

**Example:**

```typescript
const task = await invoke('toggle_task_complete', {
  id: 'task-1',
  completed: true
});
console.log('Completed at:', task.completedAt);
```

---

### `toggle_focus`

Legacy command for marking a task as focused. The current UI does not surface this as a primary workflow.

**Request:**
```typescript
invoke('toggle_focus', {
  id: string
  isFocus: boolean  // true = add to focus, false = remove from focus
})
```

**Response:**
```typescript
// Returns updated task object
```

**Example:**

```typescript
const task = await invoke('toggle_focus', {
  id: 'task-1',
  isFocus: true
});
```

---

### `search_tasks`

Search tasks by title or description.

**Request:**
```typescript
invoke('search_tasks', {
  query: string
  limit?: number  // default: 50
})
```

**Response:**
```typescript
{
  tasks: Task[]  // Matching tasks
}
```

**Example:**

```typescript
const result = await invoke('search_tasks', {
  query: 'deadline',
  limit: 20
});
```

---

## Category Commands

### `create_category`

Create a new category.

**Request:**
```typescript
invoke('create_category', {
  name: string        // required, must be unique
  color: string       // required, hex "#FF5733"
  icon?: string       // optional, emoji "📁"
})
```

**Response:**
```typescript
{
  id: string
  name: string
  color: string
  icon: string | null
  createdAt: string
  updatedAt: string
}
```

**Example:**

```typescript
const category = await invoke('create_category', {
  name: 'Work',
  color: '#3498db',
  icon: '💼'
});
```

---

### `get_categories`

Fetch all categories.

**Request:**
```typescript
invoke('get_categories', {})
```

**Response:**
```typescript
{
  categories: Array<{
    id: string
    name: string
    color: string
    icon: string | null
    createdAt: string
    updatedAt: string
  }>
}
```

**Example:**

```typescript
const result = await invoke('get_categories', {});
result.categories.forEach(cat => {
  console.log(`${cat.icon} ${cat.name}`);
});
```

---

### `update_category`

Update a category.

**Request:**
```typescript
invoke('update_category', {
  id: string
  name?: string
  color?: string
  icon?: string | null
})
```

**Response:**
```typescript
// Returns updated category object
```

---

### `delete_category`

Delete a category (dissociates from tasks).

**Request:**
```typescript
invoke('delete_category', { id: string })
```

**Response:**
```typescript
{ success: boolean }
```

---

## Subtask Commands

### `add_subtask`

Create a subtask for a task.

**Request:**
```typescript
invoke('add_subtask', {
  taskId: string
  title: string
  order?: number  // Display order (default: end of list)
})
```

**Response:**
```typescript
{
  id: string
  taskId: string
  title: string
  completed: boolean
  order: number
  createdAt: string
  updatedAt: string
}
```

**Example:**

```typescript
const subtask = await invoke('add_subtask', {
  taskId: 'task-1',
  title: 'Get meeting notes from Tom'
});
```

---

### `get_subtasks`

Fetch all subtasks for a task.

**Request:**
```typescript
invoke('get_subtasks', { taskId: string })
```

**Response:**
```typescript
{
  subtasks: Subtask[]  // Ordered by `order` field
}
```

---

### `toggle_subtask_complete`

Mark subtask as complete/incomplete.

**Request:**
```typescript
invoke('toggle_subtask_complete', {
  id: string
  completed: boolean
})
```

**Response:**
```typescript
// Returns updated subtask object
```

---

### `update_subtask`

Update a subtask.

**Request:**
```typescript
invoke('update_subtask', {
  id: string
  title?: string
  order?: number
})
```

**Response:**
```typescript
// Returns updated subtask object
```

---

### `delete_subtask`

Delete a subtask.

**Request:**
```typescript
invoke('delete_subtask', { id: string })
```

**Response:**
```typescript
{ success: boolean }
```

---

## Recurring Task Commands (Phase 2)

### `create_recurring_task`

Create a recurring task rule.

**Request:**
```typescript
invoke('create_recurring_task', {
  taskId: string
  pattern: 'daily' | 'weekly' | 'monthly'
  endDate?: string | null  // null = repeats forever
})
```

**Response:**
```typescript
{
  id: string
  taskId: string
  pattern: string
  endDate: string | null
  createdAt: string
}
```

---

### `get_recurring_tasks`

Fetch recurring task rules (not actual instances).

**Request:**
```typescript
invoke('get_recurring_tasks', {})
```

**Response:**
```typescript
{
  rules: RecurringRule[]
}
```

---

## Utility Commands

### `get_app_version`

Get current app version.

**Request:**
```typescript
invoke('get_app_version', {})
```

**Response:**
```typescript
{ version: string }  // e.g., "1.0.0"
```

---

### `get_app_data_dir`

Get path to app data directory (where database is stored).

**Request:**
```typescript
invoke('get_app_data_dir', {})
```

**Response:**
```typescript
{ path: string }  // e.g., "/Users/user/Library/Application Support/deadline-tracker"
```

---

### `export_database`

Export database as JSON.

**Request:**
```typescript
invoke('export_database', {})
```

**Response:**
```typescript
{
  tasks: Task[]
  categories: Category[]
  subtasks: Subtask[]
  exportedAt: string  // ISO 8601
}
```

**Example:**

```typescript
const data = await invoke('export_database', {});
const json = JSON.stringify(data, null, 2);
// Save to file...
```

---

### `import_database`

Import tasks from JSON export.

**Request:**
```typescript
invoke('import_database', {
  data: string  // JSON string from export_database
  merge?: boolean  // default: false (replace all)
})
```

**Response:**
```typescript
{
  success: boolean
  tasksImported: number
  categoriesImported: number
}
```

---

## Error Handling

All commands return `Result<T, String>` in Rust, which becomes:

**Success:**
```typescript
// Frontend receives the data
const result = await invoke('command_name', {});
```

**Error:**
```typescript
// Frontend catches the error
try {
  await invoke('invalid_task', {});
} catch (error) {
  console.error('Error:', error);  // error is a string message
}
```

### Common Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| `"Title cannot be empty"` | Task title is blank | Provide title |
| `"Category not found"` | Category ID doesn't exist | Check category ID |
| `"Task not found"` | Task ID doesn't exist | Check task ID |
| `"Database error: ..."` | SQLite issue | Check logs, restart app |
| `"Validation failed: ..."` | Invalid input | Check request parameters |

---

## Frontend Service Wrapper

Typically, frontend calls handlers through a typed service:

**Example: `src/lib/services/taskService.ts`**

```typescript
import { invoke } from '@tauri-apps/api/tauri';

export async function createTask(input: TaskInput): Promise<Task> {
  try {
    const task = await invoke<Task>('create_task', input);
    return task;
  } catch (error) {
    throw new Error(`Failed to create task: ${error}`);
  }
}

export async function getTasks(filter?: string): Promise<Task[]> {
  const result = await invoke<{ tasks: Task[] }>('get_tasks', { filter });
  return result.tasks;
}

// More commands...
```

Then use in components:

```typescript
<script>
  import * as taskService from '$lib/services/taskService';
  
  async function handleCreateTask() {
    const task = await taskService.createTask({
      title: 'New task',
      priority: 'high'
    });
    console.log('Created:', task);
  }
</script>
```

---

## Rate Limiting & Performance

For now, there are no rate limits. However:

- **Batch queries** when possible (e.g., get all tasks at once)
- **Avoid rapid successive calls** (wait for response before next call)
- **Use `filter` parameter** to reduce data transferred

**Good:**
```typescript
const tasks = await invoke('get_tasks', { filter: 'today' });  // Only today's
```

**Inefficient:**
```typescript
const all = await invoke('get_tasks', { filter: 'all' });
const today = all.filter(t => isToday(t.dueDate));  // Filter client-side
```

---

## Testing Commands

### Manual Testing in Browser Console

Open DevTools (F12) and:

```javascript
// Requires tauri global
const { invoke } = window.__TAURI__.tauri;

// Test create task
invoke('create_task', {
  title: 'Test task',
  priority: 'high'
}).then(task => console.log('Created:', task));

// Test get tasks
invoke('get_tasks', { filter: 'today' }).then(result => console.log(result));
```

### Rust Tests

In `src-tauri/src/handlers/`:

```rust
#[cfg(test)]
mod tests {
  use super::*;
  
  #[test]
  fn test_create_task_validation() {
    let result = create_task(String::new(), None, None);
    assert!(result.is_err());
  }
}
```

Run tests:
```bash
cd src-tauri
cargo test
```

---

## Future: Cloud Sync API

Once cloud sync is implemented (Phase 3), additional commands will be added:

```typescript
invoke('enable_cloud_sync', { email: string })
invoke('disable_cloud_sync', {})
invoke('sync_now', {})
invoke('get_sync_status', {})
```

These will communicate with a backend REST API, but the Tauri command layer stays the same.

---

**Questions?** Check [ARCHITECTURE.md](ARCHITECTURE.md) for context or open an issue.
