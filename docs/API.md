# API Reference

This document describes the current frontend-facing Tauri API for When Due.

## Frontend Types

### Task

```ts
interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  timeEstimate?: number;
  categoryId?: string;
  categoryIds?: string[];
  subtaskCount?: number;
  subtaskCompletedCount?: number;
  status: 'active' | 'completed' | 'archived';
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Category

```ts
interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Subtask

```ts
interface Subtask {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}
```

## Task Commands

### `get_tasks`

Inputs:

- `filter?: 'today' | 'week' | 'overdue' | 'all'`
- `include_completed?: boolean`

Returns:

```json
{ "tasks": [...] }
```

### `create_task`

Inputs:

- `title: string`
- `description?: string`
- `due_date?: string`
- `priority?: 'low' | 'medium' | 'high'`
- `time_estimate?: number`
- `category_id?: string`
- `category_ids?: string[]`

Returns a task object.

### `update_task`

Supports partial updates for:

- `title`
- `description`
- `due_date`
- `priority`
- `time_estimate`
- `category_id`
- `category_ids`

Also supports explicit clear flags for nullable fields.

Returns:

```json
{ "success": true, "updatedAt": "..." }
```

### `delete_task`

Archives the task via the current app flow.

Returns:

```json
{ "success": true }
```

### `toggle_task_complete`

Inputs:

- `id: string`
- `completed: boolean`

### `archive_completed_tasks`

Inputs:

- `days_threshold: number`

Archives completed tasks older than the configured retention window.

### `search_tasks`

Inputs:

- `query: string`
- `limit?: number`

Returns:

```json
{ "tasks": [...], "count": 0 }
```

## Category Commands

- `get_categories`
- `create_category`
- `update_category`
- `delete_category`

Categories are used as tags in the current product.

## Subtask Commands

- `add_subtask`
- `get_subtasks`
- `toggle_subtask_complete`
- `update_subtask`
- `delete_subtask`

## Utility Commands

- `get_app_version`
- `export_database`

## Notes

- The frontend wrapper in `src/lib/services/api.ts` handles the camelCase-to-snake_case argument mapping expected by the Rust commands.
- The current UI does not expose every backend capability as a dedicated screen. The API is slightly broader than the visible surface.
- Desktop deadline reminders are handled in the frontend by `src/lib/services/notifications.ts` using Tauri's notification plugin rather than custom app commands.
