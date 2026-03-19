pub mod db;
pub mod handlers;
pub mod sync;
pub mod utils;

use tauri::Manager;

fn main() {
  tauri::Builder::default()
    .setup(|app| {
      // Initialize database
      let app_handle = app.app_handle();
      db::init(&app_handle)?;

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      // Task handlers
      handlers::task::get_tasks,
      handlers::task::create_task,
      handlers::task::update_task,
      handlers::task::delete_task,
      handlers::task::toggle_task_complete,
      handlers::task::archive_completed_tasks,
      handlers::task::search_tasks,
      // Category handlers
      handlers::category::get_categories,
      handlers::category::create_category,
      handlers::category::update_category,
      handlers::category::delete_category,
      // Subtask handlers
      handlers::subtask::add_subtask,
      handlers::subtask::get_subtasks,
      handlers::subtask::toggle_subtask_complete,
      handlers::subtask::update_subtask,
      handlers::subtask::delete_subtask,
      // Utility handlers
      handlers::util::get_app_version,
      handlers::util::export_database,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
