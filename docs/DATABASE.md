# Database Reference

When Due uses SQLite for local-first persistence.

## Database Location

- macOS: `~/Library/Application Support/deadline-tracker/deadline-tracker.db`
- Windows: `%APPDATA%\deadline-tracker\deadline-tracker.db`
- Linux: `~/.local/share/deadline-tracker/deadline-tracker.db`

## Schema Versioning

The app maintains a simple `schema_version` table and runs migrations on startup.

Current schema versions:

- `v1`: initial core tables
- `v2`: `task_tags` join table for multi-tag support

## Tables

### `categories`

Stores user-defined tags.

Columns:

- `id`
- `name`
- `color`
- `icon`
- `createdAt`
- `updatedAt`

### `tasks`

Stores the main deadline items.

Columns:

- `id`
- `title`
- `description`
- `dueDate`
- `priority`
- `timeEstimate`
- `categoryId`
- `status`
- `isFocus`
- `completedAt`
- `createdAt`
- `updatedAt`

Notes:

- `categoryId` is kept as a compatibility / primary-tag field
- current UI uses `task_tags` for multi-tag assignment
- `isFocus` is legacy and no longer central to the product

### `task_tags`

Join table enabling multiple tags per task.

Columns:

- `taskId`
- `categoryId`
- `createdAt`

### `subtasks`

Stores optional checklist items under a task.

Columns:

- `id`
- `taskId`
- `title`
- `completed`
- `order`
- `createdAt`
- `updatedAt`

### `recurring_rules`

Legacy table from earlier planning.

The current product does not expose recurring deadlines in the UI.

### `schema_version`

Tracks which migrations have been applied.

## Important Indexes

- `idx_tasks_dueDate`
- `idx_tasks_categoryId`
- `idx_tasks_isFocus`
- `idx_tasks_status`
- `idx_subtasks_taskId`
- `idx_task_tags_taskId`
- `idx_task_tags_categoryId`

## Current Product-Relevant Queries

The app relies most heavily on:

- tasks filtered by due date bucket
- tasks filtered by status
- tasks filtered by tag
- subtasks by `taskId`

## Migration Notes

`v2` migrates existing single-tag tasks into `task_tags` so older data remains usable when multiple tags are introduced.

## Cleanup Notes

The schema still contains legacy items from earlier iterations:

- `isFocus`
- `recurring_rules`

They are documented here because they still exist in the database, but they should not be treated as active product features.
