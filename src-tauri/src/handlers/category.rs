// Category handlers stub
#[tauri::command]
pub async fn get_categories() -> Result<serde_json::Value, String> {
  Ok(serde_json::json!({ "categories": [] }))
}

#[tauri::command]
pub async fn create_category(
  name: String,
  color: String,
  icon: Option<String>,
) -> Result<serde_json::Value, String> {
  Ok(serde_json::json!({}))
}

#[tauri::command]
pub async fn update_category(
  id: String,
  name: Option<String>,
  color: Option<String>,
  icon: Option<String>,
) -> Result<serde_json::Value, String> {
  Ok(serde_json::json!({}))
}

#[tauri::command]
pub async fn delete_category(id: String) -> Result<serde_json::Value, String> {
  Ok(serde_json::json!({ "success": true }))
}
