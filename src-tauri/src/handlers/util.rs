// Utility handlers
#[tauri::command]
pub async fn get_app_version() -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
      "version": env!("CARGO_PKG_VERSION")
    }))
}

#[tauri::command]
pub async fn export_database() -> Result<serde_json::Value, String> {
    // TODO: Implement database export
    Ok(serde_json::json!({
      "tasks": [],
      "categories": [],
      "subtasks": [],
      "exportedAt": chrono::Utc::now().to_rfc3339()
    }))
}
