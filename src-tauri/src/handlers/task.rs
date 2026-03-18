// Task handlers - Tauri commands for task operations
use uuid::Uuid;
use tauri::AppHandle;
use crate::db;
use chrono::Utc;

fn row_to_json(row: &rusqlite::Row) -> rusqlite::Result<serde_json::Value> {
  Ok(serde_json::json!({
    "id": row.get::<_, String>(0)?,
    "title": row.get::<_, String>(1)?,
    "description": row.get::<_, Option<String>>(2)?,
    "dueDate": row.get::<_, Option<String>>(3)?,
    "priority": row.get::<_, String>(4)?,
    "timeEstimate": row.get::<_, Option<i32>>(5)?,
    "categoryId": row.get::<_, Option<String>>(6)?,
    "status": row.get::<_, String>(7)?,
    "isFocus": row.get::<_, bool>(8)?,
    "completedAt": row.get::<_, Option<String>>(9)?,
    "createdAt": row.get::<_, String>(10)?,
    "updatedAt": row.get::<_, String>(11)?
  }))
}

#[tauri::command]
pub async fn get_tasks(
  app: AppHandle,
  filter: Option<String>,
  _sort_by: Option<String>,
) -> Result<serde_json::Value, String> {
  let conn = db::get_connection(&app).map_err(|e| e.to_string())?;
  
  let today = Utc::now().format("%Y-%m-%d").to_string();
  
  // Execute query based on filter
  let tasks: Vec<serde_json::Value> = match filter.as_deref() {
    Some("today") => {
      // Tasks due today or earlier (not completed)
      let mut stmt = conn.prepare(
        "SELECT id, title, description, dueDate, priority, timeEstimate, categoryId, status, isFocus, completedAt, createdAt, updatedAt 
         FROM tasks 
         WHERE status = 'active' AND (dueDate IS NULL OR dueDate <= ?) 
         ORDER BY CASE WHEN isFocus THEN 0 ELSE 1 END, COALESCE(dueDate, '9999-12-31') ASC, priority DESC"
      ).map_err(|e| e.to_string())?;
      
      let result = stmt.query_map(rusqlite::params![&today], row_to_json)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
      result
    },
    Some("week") => {
      // Tasks due within 7 days
      let week_from_now = (Utc::now() + chrono::Duration::days(7)).format("%Y-%m-%d").to_string();
      let mut stmt = conn.prepare(
        "SELECT id, title, description, dueDate, priority, timeEstimate, categoryId, status, isFocus, completedAt, createdAt, updatedAt 
         FROM tasks 
         WHERE status = 'active' AND dueDate >= ? AND dueDate <= ?
         ORDER BY dueDate ASC, priority DESC"
      ).map_err(|e| e.to_string())?;
      
      let result = stmt.query_map(rusqlite::params![&today, &week_from_now], row_to_json)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
      result
    },
    Some("overdue") => {
      // Tasks overdue (due date before today, not completed)
      let mut stmt = conn.prepare(
        "SELECT id, title, description, dueDate, priority, timeEstimate, categoryId, status, isFocus, completedAt, createdAt, updatedAt 
         FROM tasks 
         WHERE status = 'active' AND dueDate < ?
         ORDER BY dueDate ASC, priority DESC"
      ).map_err(|e| e.to_string())?;
      
      let result = stmt.query_map(rusqlite::params![&today], row_to_json)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
      result
    },
    _ => {
      // All active tasks
      let mut stmt = conn.prepare(
        "SELECT id, title, description, dueDate, priority, timeEstimate, categoryId, status, isFocus, completedAt, createdAt, updatedAt 
         FROM tasks 
         WHERE status = 'active'
         ORDER BY CASE WHEN isFocus THEN 0 ELSE 1 END, COALESCE(dueDate, '9999-12-31') ASC, priority DESC"
      ).map_err(|e| e.to_string())?;
      
      let result = stmt.query_map([], row_to_json)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
      result
    }
  };

  Ok(serde_json::json!({ "tasks": tasks }))
}

#[tauri::command]
pub async fn create_task(
  app: AppHandle,
  title: String,
  description: Option<String>,
  due_date: Option<String>,
  priority: Option<String>,
  time_estimate: Option<i32>,
  category_id: Option<String>,
) -> Result<serde_json::Value, String> {
  let conn = db::get_connection(&app).map_err(|e| e.to_string())?;
  
  let id = Uuid::new_v4().to_string();
  let priority = priority.unwrap_or_else(|| "medium".to_string());
  let now = Utc::now().to_rfc3339();
  
  conn.execute(
    "INSERT INTO tasks (id, title, description, dueDate, priority, timeEstimate, categoryId, status, isFocus, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'active', FALSE, ?, ?)",
    rusqlite::params![&id, &title, description, due_date, priority, time_estimate, category_id, now, now],
  ).map_err(|e| e.to_string())?;

  Ok(serde_json::json!({
    "id": id,
    "title": title,
    "description": description,
    "dueDate": due_date,
    "priority": priority,
    "timeEstimate": time_estimate,
    "categoryId": category_id,
    "status": "active",
    "isFocus": false,
    "completedAt": null,
    "createdAt": now,
    "updatedAt": now
  }))
}

#[tauri::command]
pub async fn update_task(
  app: AppHandle,
  id: String,
  title: Option<String>,
  description: Option<String>,
  due_date: Option<String>,
  priority: Option<String>,
  time_estimate: Option<i32>,
  category_id: Option<String>,
) -> Result<serde_json::Value, String> {
  let conn = db::get_connection(&app).map_err(|e| e.to_string())?;
  
  let now = Utc::now().to_rfc3339();
  
  // Use simple updates instead of trying to be too clever
  if let Some(t) = title {
    conn.execute("UPDATE tasks SET title = ?, updatedAt = ? WHERE id = ?", 
      rusqlite::params![t, &now, &id]).map_err(|e| e.to_string())?;
  }
  if description.is_some() {
    conn.execute("UPDATE tasks SET description = ?, updatedAt = ? WHERE id = ?", 
      rusqlite::params![description, &now, &id]).map_err(|e| e.to_string())?;
  }
  if due_date.is_some() {
    conn.execute("UPDATE tasks SET dueDate = ?, updatedAt = ? WHERE id = ?", 
      rusqlite::params![due_date, &now, &id]).map_err(|e| e.to_string())?;
  }
  if let Some(p) = priority {
    conn.execute("UPDATE tasks SET priority = ?, updatedAt = ? WHERE id = ?", 
      rusqlite::params![p, &now, &id]).map_err(|e| e.to_string())?;
  }
  if time_estimate.is_some() {
    conn.execute("UPDATE tasks SET timeEstimate = ?, updatedAt = ? WHERE id = ?", 
      rusqlite::params![time_estimate, &now, &id]).map_err(|e| e.to_string())?;
  }
  if category_id.is_some() {
    conn.execute("UPDATE tasks SET categoryId = ?, updatedAt = ? WHERE id = ?", 
      rusqlite::params![category_id, &now, &id]).map_err(|e| e.to_string())?;
  }

  Ok(serde_json::json!({ "success": true, "updatedAt": now }))
}

#[tauri::command]
pub async fn delete_task(app: AppHandle, id: String) -> Result<serde_json::Value, String> {
  let conn = db::get_connection(&app).map_err(|e| e.to_string())?;
  
  conn.execute("DELETE FROM tasks WHERE id = ?", rusqlite::params![&id])
    .map_err(|e| e.to_string())?;

  Ok(serde_json::json!({ "success": true }))
}

#[tauri::command]
pub async fn toggle_task_complete(
  app: AppHandle,
  id: String,
  completed: bool,
) -> Result<serde_json::Value, String> {
  let conn = db::get_connection(&app).map_err(|e| e.to_string())?;
  
  let now = Utc::now().to_rfc3339();
  let new_status = if completed { "completed" } else { "active" };
  let completed_at = if completed { Some(&now) } else { None };
  
  conn.execute(
    "UPDATE tasks SET status = ?, completedAt = ?, updatedAt = ? WHERE id = ?",
    rusqlite::params![new_status, completed_at, &now, &id],
  ).map_err(|e| e.to_string())?;

  Ok(serde_json::json!({ "success": true, "completed": completed, "updatedAt": now }))
}

#[tauri::command]
pub async fn toggle_focus(app: AppHandle, id: String, is_focus: bool) -> Result<serde_json::Value, String> {
  let conn = db::get_connection(&app).map_err(|e| e.to_string())?;
  
  let now = Utc::now().to_rfc3339();
  
  conn.execute(
    "UPDATE tasks SET isFocus = ?, updatedAt = ? WHERE id = ?",
    rusqlite::params![is_focus, &now, &id],
  ).map_err(|e| e.to_string())?;

  Ok(serde_json::json!({ "success": true, "isFocus": is_focus, "updatedAt": now }))
}

#[tauri::command]
pub async fn search_tasks(
  app: AppHandle,
  query: String,
  limit: Option<i32>,
) -> Result<serde_json::Value, String> {
  let conn = db::get_connection(&app).map_err(|e| e.to_string())?;
  
  let limit = limit.unwrap_or(50).min(500); // Cap at 500 for safety
  let search_pattern = format!("%{}%", query);
  
  let mut stmt = conn.prepare(
    "SELECT id, title, description, dueDate, priority, timeEstimate, categoryId, status, isFocus, completedAt, createdAt, updatedAt 
     FROM tasks 
     WHERE status = 'active' AND (title LIKE ? OR description LIKE ?)
     ORDER BY dueDate ASC, priority DESC
     LIMIT ?"
  ).map_err(|e| e.to_string())?;
  
  let tasks = stmt.query_map(
    rusqlite::params![&search_pattern, &search_pattern, limit],
    row_to_json
  ).map_err(|e| e.to_string())?
  .collect::<Result<Vec<_>, _>>()
  .map_err(|e| e.to_string())?;

  Ok(serde_json::json!({ "tasks": tasks, "count": tasks.len() }))
}
