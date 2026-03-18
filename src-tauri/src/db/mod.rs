// Database module
// Handles SQLite initialization, connection pooling, and migrations

use rusqlite::Connection;
use std::path::PathBuf;
use tauri::AppHandle;

pub fn init(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
  let db_path = get_db_path(app)?;
  
  // Create parent directory if it doesn't exist
  std::fs::create_dir_all(db_path.parent().unwrap())?;
  
  let conn = Connection::open(&db_path)?;
  
  // Enable WAL mode for better concurrency
  conn.execute_batch("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;")?;
  
  // Run migrations
  apply_migrations(&conn)?;
  
  Ok(())
}

pub fn get_db_path(_app: &AppHandle) -> Result<PathBuf, Box<dyn std::error::Error>> {
  // Get app data directory based on OS
  let data_dir = if cfg!(target_os = "macos") {
    PathBuf::from(std::env::var("HOME")?)
      .join("Library/Application Support/deadline-tracker")
  } else if cfg!(target_os = "windows") {
    PathBuf::from(std::env::var("APPDATA")?)
      .join("deadline-tracker")
  } else {
    // Linux
    PathBuf::from(std::env::var("HOME")?)
      .join(".local/share/deadline-tracker")
  };
  
  // Create directory if it doesn't exist
  std::fs::create_dir_all(&data_dir)?;
  
  Ok(data_dir.join("deadline-tracker.db"))
}

pub fn get_connection(app: &AppHandle) -> Result<Connection, Box<dyn std::error::Error>> {
  let db_path = get_db_path(app)?;
  let conn = Connection::open(db_path)?;
  conn.execute_batch("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;")?;
  Ok(conn)
}

fn apply_migrations(conn: &Connection) -> Result<(), rusqlite::Error> {
  // Create schema_version table if it doesn't exist
  conn.execute(
    "CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY DEFAULT 1);",
    [],
  )?;
  
  let version: i32 = conn.query_row(
    "SELECT version FROM schema_version LIMIT 1;",
    [],
    |row| row.get(0),
  ).unwrap_or(0);
  
  if version < 1 {
    apply_migration_v1(conn)?;
  }
  
  Ok(())
}

fn apply_migration_v1(conn: &Connection) -> Result<(), rusqlite::Error> {
  // Create categories table
  conn.execute(
    "CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL,
      icon TEXT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );",
    [],
  )?;
  
  // Create tasks table
  conn.execute(
    "CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      dueDate TIMESTAMP,
      priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
      timeEstimate INTEGER,
      categoryId TEXT REFERENCES categories(id) ON DELETE SET NULL,
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
      isFocus BOOLEAN DEFAULT FALSE,
      completedAt TIMESTAMP,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );",
    [],
  )?;
  
  // Create subtasks table
  conn.execute(
    "CREATE TABLE IF NOT EXISTS subtasks (
      id TEXT PRIMARY KEY,
      taskId TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      completed BOOLEAN DEFAULT FALSE,
      \"order\" INTEGER NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );",
    [],
  )?;
  
  // Create recurring_rules table
  conn.execute(
    "CREATE TABLE IF NOT EXISTS recurring_rules (
      id TEXT PRIMARY KEY,
      taskId TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      pattern TEXT NOT NULL CHECK (pattern IN ('daily', 'weekly', 'monthly')),
      endDate TIMESTAMP,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );",
    [],
  )?;
  
  // Create indices
  conn.execute("CREATE INDEX IF NOT EXISTS idx_tasks_dueDate ON tasks(dueDate);", [])?;
  conn.execute("CREATE INDEX IF NOT EXISTS idx_tasks_categoryId ON tasks(categoryId);", [])?;
  conn.execute("CREATE INDEX IF NOT EXISTS idx_tasks_isFocus ON tasks(isFocus) WHERE isFocus = TRUE;", [])?;
  conn.execute("CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status) WHERE status = 'active';", [])?;
  conn.execute("CREATE INDEX IF NOT EXISTS idx_subtasks_taskId ON subtasks(taskId);", [])?;
  
  // Update version
  conn.execute("INSERT OR REPLACE INTO schema_version (version) VALUES (1);", [])?;
  
  Ok(())
}
