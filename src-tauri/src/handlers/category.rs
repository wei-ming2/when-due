// Category handlers
use uuid::Uuid;
use tauri::AppHandle;
use crate::db;
use chrono::Utc;

fn category_row_to_json(row: &rusqlite::Row) -> rusqlite::Result<serde_json::Value> {
  Ok(serde_json::json!({
    "id": row.get::<_, String>(0)?,
    "name": row.get::<_, String>(1)?,
    "color": row.get::<_, String>(2)?,
    "icon": row.get::<_, Option<String>>(3)?,
    "createdAt": row.get::<_, String>(4)?,
    "updatedAt": row.get::<_, String>(5)?
  }))
}

#[tauri::command]
pub async fn get_categories(app: AppHandle) -> Result<serde_json::Value, String> {
  let conn = db::get_connection(&app).map_err(|e| e.to_string())?;
  
  let mut stmt = conn.prepare(
    "SELECT id, name, color, icon, createdAt, updatedAt FROM categories ORDER BY name ASC"
  ).map_err(|e| e.to_string())?;
  
  let categories = stmt.query_map([], category_row_to_json)
    .map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;

  Ok(serde_json::json!({ "categories": categories }))
}

#[tauri::command]
pub async fn create_category(
  app: AppHandle,
  name: String,
  color: String,
  icon: Option<String>,
) -> Result<serde_json::Value, String> {
  let conn = db::get_connection(&app).map_err(|e| e.to_string())?;
  
  let id = Uuid::new_v4().to_string();
  let now = Utc::now().to_rfc3339();
  
  conn.execute(
    "INSERT INTO categories (id, name, color, icon, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
    rusqlite::params![&id, &name, &color, icon, &now, &now],
  ).map_err(|e| e.to_string())?;

  Ok(serde_json::json!({
    "id": id,
    "name": name,
    "color": color,
    "icon": icon,
    "createdAt": now,
    "updatedAt": now
  }))
}

#[tauri::command]
pub async fn update_category(
  app: AppHandle,
  id: String,
  name: Option<String>,
  color: Option<String>,
  icon: Option<String>,
) -> Result<serde_json::Value, String> {
  let conn = db::get_connection(&app).map_err(|e| e.to_string())?;
  
  let now = Utc::now().to_rfc3339();
  
  if let Some(n) = name {
    conn.execute("UPDATE categories SET name = ?, updatedAt = ? WHERE id = ?", 
      rusqlite::params![n, &now, &id]).map_err(|e| e.to_string())?;
  }
  if let Some(c) = color {
    conn.execute("UPDATE categories SET color = ?, updatedAt = ? WHERE id = ?", 
      rusqlite::params![c, &now, &id]).map_err(|e| e.to_string())?;
  }
  if icon.is_some() {
    conn.execute("UPDATE categories SET icon = ?, updatedAt = ? WHERE id = ?", 
      rusqlite::params![icon, &now, &id]).map_err(|e| e.to_string())?;
  }

  Ok(serde_json::json!({ "success": true, "updatedAt": now }))
}

#[tauri::command]
pub async fn delete_category(app: AppHandle, id: String) -> Result<serde_json::Value, String> {
  let conn = db::get_connection(&app).map_err(|e| e.to_string())?;
  
  conn.execute("DELETE FROM categories WHERE id = ?", rusqlite::params![&id])
    .map_err(|e| e.to_string())?;

  Ok(serde_json::json!({ "success": true }))
}
