# Database Guide

Complete reference for Deadline Tracker's SQLite database schema, queries, and migration strategy.

## Table of Contents

1. [Schema Overview](#schema-overview)
2. [Table Definitions](#table-definitions)
3. [Indices & Performance](#indices--performance)
4. [Common Queries](#common-queries)
5. [Migration System](#migration-system)
6. [Backup & Recovery](#backup--recovery)
7. [Troubleshooting](#troubleshooting)

---

## Schema Overview

### Entity Relationship Diagram

```
┌─────────────────┐
│   Categories    │
├─────────────────┤
│ id (PK)         │
│ name (UNIQUE)   │
│ color           │
│ icon            │
│ createdAt       │
│ updatedAt       │
└────────┬────────┘
         │
         │ (1:N)
         │
         ▼
┌─────────────────┐         ┌──────────────────┐
│     Tasks       │◄────────┤ RecurringRules   │
├─────────────────┤         ├──────────────────┤
│ id (PK)         │         │ id (PK)          │
│ title           │ (1:N)   │ taskId (FK)      │
│ description     │────────►│ pattern          │
│ dueDate         │         │ endDate          │
│ priority        │         │ createdAt        │
│ timeEstimate    │         │ updatedAt        │
│ categoryId (FK) │         └──────────────────┘
│ status          │
│ isFocus         │
│ completedAt     │
│ createdAt       │
│ updatedAt       │
└────────┬────────┘
         │
         │ (1:N)
         │
         ▼
┌──────────────────┐
│    Subtasks      │
├──────────────────┤
│ id (PK)          │
│ taskId (FK)      │
│ title            │
│ completed        │
│ order            │
│ createdAt        │
│ updatedAt        │
└──────────────────┘
```

---

## Table Definitions

### 1. Categories Table

Stores task categories/projects.

```sql
CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL,        -- Hex color "#FF5733" or "rgb(255, 87, 51)"
    icon TEXT,                  -- Emoji "📁" or icon name
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Example data:**
```sql
INSERT INTO categories VALUES (
  'cat-1',
  'Work',
  '#3498db',
  '💼',
  '2026-03-17 10:00:00',
  '2026-03-17 10:00:00'
);
```

**Fields:**
- `id` — Unique identifier (UUID)
- `name` — Category name (unique within app)
- `color` — Hex or RGB color for UI display
- `icon` — Emoji or icon identifier
- `createdAt` — Timestamp of creation
- `updatedAt` — Last modification timestamp

---

### 2. Tasks Table

Core task storage.

```sql
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    dueDate TIMESTAMP,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    timeEstimate INTEGER,           -- Minutes
    categoryId TEXT REFERENCES categories(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    isFocus BOOLEAN DEFAULT FALSE,
    completedAt TIMESTAMP,          -- When task was marked complete
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Example data:**
```sql
INSERT INTO tasks VALUES (
  'task-1',
  'Review project deadline',
  'Check the Q2 project kickoff date',
  '2026-03-20 17:00:00',
  'high',
  60,
  'cat-1',
  'active',
  TRUE,          -- In today's focus
  NULL,          -- Not completed yet
  '2026-03-17 09:30:00',
  '2026-03-17 09:30:00'
);
```

**Fields:**
- `id` — Unique task ID (UUID)
- `title` — Task name
- `description` — Optional additional details
- `dueDate` — When the task is due
- `priority` — 'low', 'medium', or 'high'
- `timeEstimate` — Estimated minutes to complete
- `categoryId` — Links to a category (optional, can be null)
- `status` — 'active', 'completed', or 'archived'
- `isFocus` — Whether in "Today's Focus" list
- `completedAt` — Timestamp when marked complete
- `createdAt` — When task was created
- `updatedAt` — Last edit timestamp

---

### 3. Subtasks Table

Individual checklist items within a task.

```sql
CREATE TABLE subtasks (
    id TEXT PRIMARY KEY,
    taskId TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    order INTEGER NOT NULL,         -- Display order
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Example data:**
```sql
INSERT INTO subtasks VALUES (
  'subtask-1',
  'task-1',
  'Get meeting notes from Tom',
  FALSE,
  1,
  '2026-03-17 09:35:00',
  '2026-03-17 09:35:00'
);

INSERT INTO subtasks VALUES (
  'subtask-2',
  'task-1',
  'Update timeline document',
  TRUE,
  2,
  '2026-03-17 09:35:00',
  '2026-03-17 10:00:00'
);
```

**Fields:**
- `id` — Unique subtask ID
- `taskId` — Links to parent task (cascade delete)
- `title` — Subtask description
- `completed` — Done or not
- `order` — Display order in the list
- `createdAt` — Creation time
- `updatedAt` — Last change time

---

### 4. RecurringRules Table

Defines repeating task patterns.

```sql
CREATE TABLE recurring_rules (
    id TEXT PRIMARY KEY,
    taskId TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    pattern TEXT NOT NULL CHECK (pattern IN ('daily', 'weekly', 'monthly')),
    endDate TIMESTAMP,              -- NULL = repeats forever
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Example data:**
```sql
INSERT INTO recurring_rules VALUES (
  'recur-1',
  'task-2',
  'weekly',
  NULL,  -- Repeat weekly forever
  '2026-03-17 11:00:00',
  '2026-03-17 11:00:00'
);
```

**Fields:**
- `id` — Unique rule ID
- `taskId` — Links to recurring task
- `pattern` — 'daily', 'weekly', or 'monthly'
- `endDate` — When recurring should stop (null = forever)
- `createdAt` — Rule creation time
- `updatedAt` — Last modification

---

## Indices & Performance

### Default Indices

Created during migrations for query optimization:

```sql
-- Fast task lookup by date (for "today's tasks", "upcoming")
CREATE INDEX idx_tasks_dueDate ON tasks(dueDate);

-- Fast category filtering
CREATE INDEX idx_tasks_categoryId ON tasks(categoryId);

-- Fast focus list retrieval
CREATE INDEX idx_tasks_isFocus ON tasks(isFocus) WHERE isFocus = TRUE;

-- Fast subtask retrieval
CREATE INDEX idx_subtasks_taskId ON subtasks(taskId);

-- Fast status filtering (show only active, not archived)
CREATE INDEX idx_tasks_status ON tasks(status) WHERE status = 'active';

-- Composite index for common queries
CREATE INDEX idx_tasks_dueDate_status ON tasks(dueDate, status);
```

### Query Performance Expectations

With typical usage (1000-10,000 tasks):

| Query | Time | Notes |
|-------|------|-------|
| Get today's tasks | <1ms | Uses `idx_tasks_dueDate` |
| Get focus tasks | <1ms | Uses `idx_tasks_isFocus` |
| Get all tasks | 2-5ms | Full table scan (acceptable) |
| Search tasks (1000 results) | 5-10ms | LIKE pattern on title/desc |
| Get subtasks for task | <1ms | Uses `idx_subtasks_taskId` |

---

## Common Queries

### READ Queries

#### Get all tasks for today

```sql
SELECT * FROM tasks
WHERE DATE(dueDate) = DATE('now')
  AND status != 'archived'
ORDER BY priority DESC, createdAt ASC;
```

#### Get today's focus tasks

```sql
SELECT * FROM tasks
WHERE isFocus = TRUE
  AND status = 'active'
ORDER BY createdAt ASC;
```

#### Get upcoming tasks (next 7 days)

```sql
SELECT * FROM tasks
WHERE dueDate >= DATE('now')
  AND dueDate <= DATE('now', '+7 days')
  AND status = 'active'
ORDER BY dueDate ASC, priority DESC;
```

#### Get all tasks by category

```sql
SELECT t.*, c.name as categoryName, c.color
FROM tasks t
LEFT JOIN categories c ON t.categoryId = c.id
WHERE c.id = ?
  AND t.status = 'active'
ORDER BY t.dueDate ASC;
```

#### Get task with all subtasks

```sql
SELECT t.* FROM tasks t WHERE t.id = ?;

-- Then in a separate query:
SELECT * FROM subtasks WHERE taskId = ? ORDER BY order ASC;
```

#### Search tasks

```sql
SELECT * FROM tasks
WHERE (title LIKE '%' || ? || '%' OR description LIKE '%' || ? || '%')
  AND status = 'active'
LIMIT 50;
```

#### Get completed tasks today

```sql
SELECT * FROM tasks
WHERE DATE(completedAt) = DATE('now')
ORDER BY completedAt DESC;
```

#### Get overdue tasks

```sql
SELECT * FROM tasks
WHERE dueDate < DATE('now')
  AND status = 'active'
ORDER BY dueDate ASC;
```

### WRITE Queries

#### Create task

```sql
INSERT INTO tasks (
  id, title, description, dueDate, priority, 
  categoryId, status, createdAt, updatedAt
) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
```

#### Update task

```sql
UPDATE tasks
SET title = ?, description = ?, priority = ?, dueDate = ?, updatedAt = CURRENT_TIMESTAMP
WHERE id = ?;
```

#### Mark task complete

```sql
UPDATE tasks
SET status = 'completed', completedAt = CURRENT_TIMESTAMP, updatedAt = CURRENT_TIMESTAMP
WHERE id = ?;
```

#### Mark task incomplete

```sql
UPDATE tasks
SET status = 'active', completedAt = NULL, updatedAt = CURRENT_TIMESTAMP
WHERE id = ?;
```

#### Add task to focus

```sql
UPDATE tasks
SET isFocus = TRUE, updatedAt = CURRENT_TIMESTAMP
WHERE id = ?;
```

#### Remove from focus

```sql
UPDATE tasks
SET isFocus = FALSE, updatedAt = CURRENT_TIMESTAMP
WHERE id = ?;
```

#### Delete task (cascades subtasks)

```sql
DELETE FROM tasks WHERE id = ?;
```

#### Add subtask

```sql
INSERT INTO subtasks (id, taskId, title, completed, order, createdAt, updatedAt)
VALUES (?, ?, ?, FALSE, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
```

#### Toggle subtask complete

```sql
UPDATE subtasks
SET completed = ?, updatedAt = CURRENT_TIMESTAMP
WHERE id = ?;
```

#### Reorder subtasks (drag and drop)

```sql
UPDATE subtasks
SET order = ?
WHERE id = ?;
```

### ANALYTICS Queries

#### Count completion rate this month

```sql
SELECT 
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
  COUNT(*) as total
FROM tasks
WHERE DATE(createdAt) >= DATE('now', 'start of month');
```

#### Average time to complete

```sql
SELECT AVG(
  (julianday(completedAt) - julianday(createdAt)) * 24 * 60
) as avg_minutes
FROM tasks
WHERE status = 'completed' AND completedAt IS NOT NULL;
```

#### Most used category

```sql
SELECT categoryId, COUNT(*) as count
FROM tasks
GROUP BY categoryId
ORDER BY count DESC
LIMIT 1;
```

---

## Migration System

### How Migrations Work

1. **On first app launch:**
   - App checks if `deadline-tracker.db` exists
   - If not, creates it and runs all migrations
   - Creates indices for performance

2. **On subsequent launches:**
   - App checks version stored in database
   - Runs any new migrations since last launch
   - Ensures backwards compatibility

### Migration Files

Located in `src-tauri/src/db/migrations.sql`:

```sql
-- Migration 1: Initial schema (v1.0.0)
CREATE TABLE IF NOT EXISTS categories (
  -- [full schema above]
);

CREATE TABLE IF NOT EXISTS tasks (
  -- [full schema above]
);

CREATE TABLE IF NOT EXISTS subtasks (
  -- [full schema above]
);

CREATE TABLE IF NOT EXISTS recurring_rules (
  -- [full schema above]
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_tasks_dueDate ON tasks(dueDate);
-- [more indices]

-- Version tracking
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY DEFAULT 1
);
INSERT INTO schema_version (version) VALUES (1);
```

### Example: Adding a New Column

**Scenario:** Add a `tags` field to tasks (future feature)

**Migration:** `src-tauri/src/db/migrations.rs`

```rust
pub fn apply_migration_v2(conn: &Connection) -> Result<()> {
  conn.execute(
    "ALTER TABLE tasks ADD COLUMN tags TEXT;",
    [],
  )?;
  conn.execute(
    "UPDATE schema_version SET version = 2;",
    [],
  )?;
  Ok(())
}
```

**In `db/mod.rs`:**

```rust
fn apply_pending_migrations(conn: &Connection) -> Result<()> {
  let current_version: i32 = conn.query_row(
    "SELECT version FROM schema_version;",
    [],
    |row| row.get(0),
  ).unwrap_or(0);
  
  if current_version < 2 {
    apply_migration_v2(conn)?;
  }
  Ok(())
}
```

This ensures existing users automatically get the new column without data loss.

---

## Backup & Recovery

### Automatic Backups

To implement user backups (planned):

```rust
// In Tauri handler
#[tauri::command]
async fn export_database() -> Result<String, String> {
  let db_path = get_db_path()?;
  let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
  let backup_name = format!("deadline-tracker_backup_{}.db", timestamp);
  
  std::fs::copy(&db_path, &backup_name)
    .map_err(|e| e.to_string())?;
  
  Ok(backup_name)
}
```

### Recovery

**If database is corrupted:**

1. Close the app
2. Delete `.db` file (you'll lose current data)
3. Reopen app (creates fresh database)
4. Restore from backup if available

**Prevention:**
- Frequent backups to cloud (Google Drive, Dropbox)
- SQLite PRAGMA for integrity

```sql
-- Verify database integrity
PRAGMA integrity_check;

-- Result: "ok" if healthy, detailed errors if corrupted
```

---

## Troubleshooting

### Issue: "database is locked" error

**Cause:** Multiple connections trying to write simultaneously

**Solution:**
```rust
// In db/mod.rs, enable WAL (Write-Ahead Logging)
conn.execute_batch(
  "PRAGMA journal_mode = WAL;
   PRAGMA synchronous = NORMAL;"
)?;
```

WAL allows concurrent readers and a single writer.

### Issue: Slow queries

**Diagnosis:**

```sql
-- Enable query timing
.timer on

-- Run query and check time
SELECT * FROM tasks WHERE title LIKE '%search%';
```

**Solution:** Add appropriate index:

```sql
-- Index on title for text search
CREATE INDEX idx_tasks_title ON tasks(title);
```

### Issue: Database file size grows quickly

**Cause:** SQLite keeps deleted data (not reclaimed until VACUUM)

**Solution:**

```rust
// In Tauri handler
#[tauri::command]
async fn optimize_database() -> Result<(), String> {
  let conn = get_connection()?;
  conn.execute("VACUUM;", [])
    .map_err(|e| e.to_string())?;
  Ok(())
}
```

### Issue: Date queries return wrong results

**Cause:** Timezone issues with TIMESTAMP

**Solution:** Always use UTC and `DATE('now')` for consistency

```sql
-- Good - uses UTC
WHERE DATE(dueDate) = DATE('now')

-- Avoid - timezone dependent
WHERE strftime('%Y-%m-%d', dueDate) = strftime('%Y-%m-%d', 'now')
```

---

## Further Reading

- [SQLite Official Docs](https://www.sqlite.org/docs.html)
- [SQLite Best Practices](https://www.sqlite.org/bestpractice.html)
- [SQLite Performance Tuning](https://www.sqlite.org/dbstat.html)
- [Tauri SQLite Plugin](https://github.com/tauri-apps/tauri-plugin-sql)
