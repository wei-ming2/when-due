// Category handlers
use crate::db;
use chrono::Utc;
use tauri::AppHandle;
use uuid::Uuid;

fn category_row_to_json(row: &rusqlite::Row) -> rusqlite::Result<serde_json::Value> {
    Ok(serde_json::json!({
      "id": row.get::<_, String>(0)?,
      "name": row.get::<_, String>(1)?,
      "color": row.get::<_, String>(2)?,
      "icon": row.get::<_, Option<String>>(3)?,
      "sortOrder": row.get::<_, i64>(4)?,
      "createdAt": row.get::<_, String>(5)?,
      "updatedAt": row.get::<_, String>(6)?
    }))
}

#[tauri::command]
pub async fn get_categories(app: AppHandle) -> Result<serde_json::Value, String> {
    let conn = db::get_connection(&app).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, name, color, icon, sortOrder, createdAt, updatedAt FROM categories ORDER BY sortOrder ASC, name ASC",
        )
        .map_err(|e| e.to_string())?;

    let categories = stmt
        .query_map([], category_row_to_json)
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

    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Category name cannot be empty".to_string());
    }

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let sort_order: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(sortOrder), -1) + 1 FROM categories",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    conn.execute(
    "INSERT INTO categories (id, name, color, icon, sortOrder, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
    rusqlite::params![&id, &name, &color, icon, sort_order, &now, &now],
  ).map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
      "id": id,
      "name": name,
      "color": color,
      "icon": icon,
      "sortOrder": sort_order,
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
    sort_order: Option<i64>,
) -> Result<serde_json::Value, String> {
    let conn = db::get_connection(&app).map_err(|e| e.to_string())?;

    let now = Utc::now().to_rfc3339();

    if let Some(n) = name {
        let trimmed_name = n.trim().to_string();
        if trimmed_name.is_empty() {
            return Err("Category name cannot be empty".to_string());
        }
        conn.execute(
            "UPDATE categories SET name = ?, updatedAt = ? WHERE id = ?",
            rusqlite::params![trimmed_name, &now, &id],
        )
        .map_err(|e| e.to_string())?;
    }
    if let Some(c) = color {
        conn.execute(
            "UPDATE categories SET color = ?, updatedAt = ? WHERE id = ?",
            rusqlite::params![c, &now, &id],
        )
        .map_err(|e| e.to_string())?;
    }
    if icon.is_some() {
        conn.execute(
            "UPDATE categories SET icon = ?, updatedAt = ? WHERE id = ?",
            rusqlite::params![icon, &now, &id],
        )
        .map_err(|e| e.to_string())?;
    }
    if let Some(next_sort_order) = sort_order {
        conn.execute(
            "UPDATE categories SET sortOrder = ?, updatedAt = ? WHERE id = ?",
            rusqlite::params![next_sort_order, &now, &id],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(serde_json::json!({ "success": true, "updatedAt": now }))
}

#[tauri::command]
pub async fn reorder_categories(
    app: AppHandle,
    ordered_ids: Vec<String>,
) -> Result<serde_json::Value, String> {
    let mut conn = db::get_connection(&app).map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    for (index, category_id) in ordered_ids.iter().enumerate() {
        tx.execute(
            "UPDATE categories SET sortOrder = ?, updatedAt = ? WHERE id = ?",
            rusqlite::params![index as i64, &now, category_id],
        )
        .map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;

    Ok(serde_json::json!({ "success": true, "updatedAt": now }))
}

#[tauri::command]
pub async fn delete_category(app: AppHandle, id: String) -> Result<serde_json::Value, String> {
    let conn = db::get_connection(&app).map_err(|e| e.to_string())?;

    conn.execute(
        "DELETE FROM categories WHERE id = ?",
        rusqlite::params![&id],
    )
    .map_err(|e| e.to_string())?;

    Ok(serde_json::json!({ "success": true }))
}
