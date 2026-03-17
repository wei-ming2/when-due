// Subtask handlers stub
#[tauri::command]
pub async fn add_subtask(
  task_id: String,
  title: String,
  order: Option<i32>,
) -> Result<serde_json::Value, String> {
  Ok(serde_json::json!({}))
}

#[tauri::command]
pub async fn get_subtasks(task_id: String) -> Result<serde_json::Value, String> {
  Ok(serde_json::json!({ "subtasks": [] }))
}

#[tauri::command]
pub async fn toggle_subtask_complete(
  id: String,
  completed: bool,
) -> Result<serde_json::Value, String> {
  Ok(serde_json::json!({}))
}

#[tauri::command]
pub async fn update_subtask(
  id: String,
  title: Option<String>,
  order: Option<i32>,
) -> Result<serde_json::Value, String> {
  Ok(serde_json::json!({}))
}

#[tauri::command]
pub async fn delete_subtask(id: String) -> Result<serde_json::Value, String> {
  Ok(serde_json::json!({ "success": true }))
}
