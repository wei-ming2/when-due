use crate::db;
use chrono::Utc;
use std::path::{Path, PathBuf};
use tauri::AppHandle;
use uuid::Uuid;

const MAX_ATTACHMENT_BYTES: usize = 15 * 1024 * 1024;

fn attachment_row_to_json(row: &rusqlite::Row) -> rusqlite::Result<serde_json::Value> {
    Ok(serde_json::json!({
      "id": row.get::<_, String>(0)?,
      "taskId": row.get::<_, String>(1)?,
      "name": row.get::<_, String>(2)?,
      "mimeType": row.get::<_, String>(3)?,
      "filePath": row.get::<_, String>(4)?,
      "createdAt": row.get::<_, String>(5)?
    }))
}

fn get_attachments_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let db_path = db::get_db_path(app).map_err(|e| e.to_string())?;
    let base_dir = db_path
        .parent()
        .ok_or_else(|| "Could not determine app data directory".to_string())?;
    let attachments_dir = base_dir.join("attachments");
    std::fs::create_dir_all(&attachments_dir).map_err(|e| e.to_string())?;
    Ok(attachments_dir)
}

fn infer_extension(file_name: &str, mime_type: &str) -> &'static str {
    let ext = Path::new(file_name)
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();

    match ext.as_str() {
        "png" => "png",
        "jpg" | "jpeg" => "jpg",
        "gif" => "gif",
        "webp" => "webp",
        "svg" => "svg",
        "avif" => "avif",
        _ => match mime_type {
            "image/png" => "png",
            "image/jpeg" => "jpg",
            "image/gif" => "gif",
            "image/webp" => "webp",
            "image/svg+xml" => "svg",
            "image/avif" => "avif",
            _ => "img",
        },
    }
}

#[tauri::command]
pub async fn get_task_attachments(
    app: AppHandle,
    task_id: String,
) -> Result<serde_json::Value, String> {
    let conn = db::get_connection(&app).map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, taskId, name, mimeType, filePath, createdAt
             FROM task_attachments
             WHERE taskId = ?
             ORDER BY createdAt ASC",
        )
        .map_err(|e| e.to_string())?;

    let attachments = stmt
        .query_map(rusqlite::params![task_id], attachment_row_to_json)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(serde_json::json!({ "attachments": attachments }))
}

#[tauri::command]
pub async fn get_task_attachment_bytes(
    app: AppHandle,
    id: String,
) -> Result<serde_json::Value, String> {
    let conn = db::get_connection(&app).map_err(|e| e.to_string())?;
    let file_path = conn
        .query_row(
            "SELECT filePath FROM task_attachments WHERE id = ?",
            rusqlite::params![&id],
            |row| row.get::<_, String>(0),
        )
        .map_err(|e| e.to_string())?;

    let bytes = std::fs::read(&file_path).map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "bytes": bytes }))
}

#[tauri::command]
pub async fn add_task_attachment(
    app: AppHandle,
    task_id: String,
    file_name: String,
    mime_type: String,
    bytes: Vec<u8>,
) -> Result<serde_json::Value, String> {
    if !mime_type.starts_with("image/") {
        return Err("Only image attachments are supported right now.".to_string());
    }

    if bytes.is_empty() {
        return Err("Attachment is empty.".to_string());
    }

    if bytes.len() > MAX_ATTACHMENT_BYTES {
        return Err("Images larger than 15 MB are not supported.".to_string());
    }

    let conn = db::get_connection(&app).map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let extension = infer_extension(&file_name, &mime_type);
    let attachments_dir = get_attachments_dir(&app)?;
    let task_dir = attachments_dir.join(&task_id);
    std::fs::create_dir_all(&task_dir).map_err(|e| e.to_string())?;

    let stored_file_name = format!("{id}.{extension}");
    let file_path = task_dir.join(stored_file_name);
    std::fs::write(&file_path, bytes).map_err(|e| e.to_string())?;

    let file_path_string = file_path.to_string_lossy().to_string();
    conn.execute(
        "INSERT INTO task_attachments (id, taskId, name, mimeType, filePath, createdAt)
         VALUES (?, ?, ?, ?, ?, ?)",
        rusqlite::params![&id, &task_id, &file_name, &mime_type, &file_path_string, &now],
    )
    .map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
      "id": id,
      "taskId": task_id,
      "name": file_name,
      "mimeType": mime_type,
      "filePath": file_path_string,
      "createdAt": now
    }))
}

#[tauri::command]
pub async fn delete_task_attachment(app: AppHandle, id: String) -> Result<serde_json::Value, String> {
    let conn = db::get_connection(&app).map_err(|e| e.to_string())?;
    let record = conn
        .query_row(
            "SELECT filePath FROM task_attachments WHERE id = ?",
            rusqlite::params![&id],
            |row| row.get::<_, String>(0),
        )
        .map_err(|e| e.to_string())?;

    conn.execute(
        "DELETE FROM task_attachments WHERE id = ?",
        rusqlite::params![&id],
    )
    .map_err(|e| e.to_string())?;

    if let Err(error) = std::fs::remove_file(&record) {
        if error.kind() != std::io::ErrorKind::NotFound {
            return Err(error.to_string());
        }
    }

    Ok(serde_json::json!({ "success": true }))
}
