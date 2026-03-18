// Subtask handlers
use uuid::Uuid;
use tauri::AppHandle;
use crate::db;
use chrono::Utc;

fn subtask_row_to_json(row: &rusqlite::Row) -> rusqlite::Result<serde_json::Value> {
  Ok(serde_json::json!({
    "id": row.get::<_, String>(0)?,
    "taskId": row.get::<_, String>(1)?,
    "title": row.get::<_, String>(2)?,
    "completed": row.get::<_, bool>(3)?,
    "order": row.get::<_, i32>(4)?,
    "createdAt": row.get::<_, String>(5)?,
    "updatedAt": row.get::<_, String>(6)?
  }))
}

#[tauri::command]
pub async fn add_subtask(
  app: AppHandle,
  task_id: String,
  title: String,
  order: Option<i32>,
) -> Result<serde_json::Value, String> {
  let conn = db::get_connection(&app).map_err(|e| e.to_string())?;
  
  let id = Uuid::new_v4().to_string();
  let now = Utc::now().to_rfc3339();
  
  // If no order provided, get the max order for this task and increment
  let order = if let Some(o) = order {
    o
  } else {
    let max_order: i32 = conn.query_row(
      "SELECT COALESCE(MAX(\"order\"), -1) FROM subtasks WHERE taskId = ?",
      rusqlite::params![&task_id],
      |row| row.get(0),
    ).map_err(|e| e.to_string())?;
    max_order + 1
  };
  
  conn.execute(
    "INSERT INTO subtasks (id, taskId, title, completed, \"order\", createdAt, updatedAt) VALUES (?, ?, ?, FALSE, ?, ?, ?)",
    rusqlite::params![&id, &task_id, &title, order, &now, &now],
  ).map_err(|e| e.to_string())?;

  Ok(serde_json::json!({
    "id": id,
    "taskId": task_id,
    "title": title,
    "completed": false,
    "order": order,
    "createdAt": now,
    "updatedAt": now
  }))
}

#[tauri::command]
pub async fn get_subtasks(
  app: AppHandle,
  task_id: String,
) -> Result<serde_json::Value, String> {
  let conn = db::get_connection(&app).map_err(|e| e.to_string())?;
  
  let mut stmt = conn.prepare(
    "SELECT id, taskId, title, completed, \"order\", createdAt, updatedAt FROM subtasks WHERE taskId = ? ORDER BY \"order\" ASC"
  ).map_err(|e| e.to_string())?;
  
  let subtasks = stmt.query_map(rusqlite::params![&task_id], subtask_row_to_json)
    .map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;

  Ok(serde_json::json!({ "subtasks": subtasks }))
}

#[tauri::command]
pub async fn toggle_subtask_complete(
  app: AppHandle,
  id: String,
  completed: bool,
) -> Result<serde_json::Value, String> {
  let conn = db::get_connection(&app).map_err(|e| e.to_string())?;
  
  let now = Utc::now().to_rfc3339();
  
  conn.execute(
    "UPDATE subtasks SET completed = ?, updatedAt = ? WHERE id = ?",
    rusqlite::params![completed, &now, &id],
  ).map_err(|e| e.to_string())?;

  Ok(serde_json::json!({ "success": true, "completed": completed, "updatedAt": now }))
}

#[tauri::command]
pub async fn update_subtask(
  app: AppHandle,
  id: String,
  title: Option<String>,
  order: Option<i32>,
) -> Result<serde_json::Value, String> {
  let conn = db::get_connection(&app).map_err(|e| e.to_string())?;
  
  let now = Utc::now().to_rfc3339();
  
  if let Some(t) = title {
    conn.execute("UPDATE subtasks SET title = ?, updatedAt = ? WHERE id = ?", 
      rusqlite::params![t, &now, &id]).map_err(|e| e.to_string())?;
  }
  if let Some(o) = order {
    conn.execute("UPDATE subtasks SET \"order\" = ?, updatedAt = ? WHERE id = ?", 
      rusqlite::params![o, &now, &id]).map_err(|e| e.to_string())?;
  }

  Ok(serde_json::json!({ "success": true, "updatedAt": now }))
}

#[tauri::command]
pub async fn delete_subtask(app: AppHandle, id: String) -> Result<serde_json::Value, String> {
  let conn = db::get_connection(&app).map_err(|e| e.to_string())?;
  
  conn.execute("DELETE FROM subtasks WHERE id = ?", rusqlite::params![&id])
    .map_err(|e| e.to_string())?;

  Ok(serde_json::json!({ "success": true }))
}
