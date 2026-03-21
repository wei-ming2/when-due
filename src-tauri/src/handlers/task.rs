// Task handlers - Tauri commands for task operations
use crate::db;
use chrono::{Local, Utc};
use tauri::AppHandle;
use uuid::Uuid;

fn normalize_category_ids(category_ids: Vec<String>) -> Vec<String> {
    let mut deduped = Vec::new();

    for category_id in category_ids {
        let trimmed = category_id.trim();
        if trimmed.is_empty() {
            continue;
        }

        if !deduped.iter().any(|existing| existing == trimmed) {
            deduped.push(trimmed.to_string());
        }
    }

    deduped
}

fn parse_category_ids(csv: Option<String>, fallback: Option<String>) -> Vec<String> {
    let mut parsed = Vec::new();

    if let Some(csv) = csv {
        for value in csv.split(',') {
            let trimmed = value.trim();
            if trimmed.is_empty() {
                continue;
            }

            if !parsed.iter().any(|existing| existing == trimmed) {
                parsed.push(trimmed.to_string());
            }
        }
    }

    if parsed.is_empty() {
        if let Some(category_id) = fallback {
            let trimmed = category_id.trim();
            if !trimmed.is_empty() {
                parsed.push(trimmed.to_string());
            }
        }
    }

    parsed
}

fn sync_task_tags(
    conn: &rusqlite::Connection,
    task_id: &str,
    category_ids: &[String],
    updated_at: &str,
) -> Result<(), rusqlite::Error> {
    conn.execute(
        "DELETE FROM task_tags WHERE taskId = ?",
        rusqlite::params![task_id],
    )?;

    for category_id in category_ids {
        conn.execute(
            "INSERT OR IGNORE INTO task_tags (taskId, categoryId, createdAt) VALUES (?, ?, ?)",
            rusqlite::params![task_id, category_id, updated_at],
        )?;
    }

    let primary_category = category_ids.first().cloned();
    conn.execute(
        "UPDATE tasks SET categoryId = ?, updatedAt = ? WHERE id = ?",
        rusqlite::params![primary_category, updated_at, task_id],
    )?;

    Ok(())
}

fn row_to_json(row: &rusqlite::Row) -> rusqlite::Result<serde_json::Value> {
    let category_id = row.get::<_, Option<String>>(6)?;
    let category_ids = parse_category_ids(row.get::<_, Option<String>>(12)?, category_id.clone());

    Ok(serde_json::json!({
      "id": row.get::<_, String>(0)?,
      "title": row.get::<_, String>(1)?,
      "description": row.get::<_, Option<String>>(2)?,
      "dueDate": row.get::<_, Option<String>>(3)?,
      "priority": row.get::<_, String>(4)?,
      "timeEstimate": row.get::<_, Option<i32>>(5)?,
      "categoryId": category_id.clone().or_else(|| category_ids.first().cloned()),
      "categoryIds": category_ids,
      "status": row.get::<_, String>(7)?,
      "isFocus": row.get::<_, bool>(8)?,
      "completedAt": row.get::<_, Option<String>>(9)?,
      "createdAt": row.get::<_, String>(10)?,
      "updatedAt": row.get::<_, String>(11)?,
      "subtaskCount": row.get::<_, i64>(13)?,
      "subtaskCompletedCount": row.get::<_, i64>(14)?,
      "attachmentCount": row.get::<_, i64>(15)?
    }))
}

#[tauri::command]
pub async fn get_tasks(
    app: AppHandle,
    filter: Option<String>,
    include_completed: Option<bool>,
    _sort_by: Option<String>,
) -> Result<serde_json::Value, String> {
    let conn = db::get_connection(&app).map_err(|e| e.to_string())?;

    let today = Local::now().format("%Y-%m-%d").to_string();
    let include_completed = include_completed.unwrap_or(false);
    let status_clause = if include_completed {
        "status IN ('active', 'completed')"
    } else {
        "status = 'active'"
    };
    let order_clause = "ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, CASE WHEN dueDate IS NULL THEN 1 ELSE 0 END, COALESCE(dueDate, '9999-12-31T23:59:59Z') ASC, CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, CASE WHEN isFocus THEN 0 ELSE 1 END";
    let select_fields = "SELECT tasks.id, tasks.title, tasks.description, tasks.dueDate, tasks.priority, tasks.timeEstimate, tasks.categoryId, tasks.status, tasks.isFocus, tasks.completedAt, tasks.createdAt, tasks.updatedAt,
      COALESCE((SELECT GROUP_CONCAT(categoryId, ',') FROM task_tags WHERE taskId = tasks.id), '') AS categoryIds,
      (SELECT COUNT(*) FROM subtasks WHERE taskId = tasks.id) AS subtaskCount,
      (SELECT COUNT(*) FROM subtasks WHERE taskId = tasks.id AND completed = TRUE) AS subtaskCompletedCount,
      (SELECT COUNT(*) FROM task_attachments WHERE taskId = tasks.id) AS attachmentCount
      FROM tasks";

    // Execute query based on filter
    let tasks: Vec<serde_json::Value> = match filter.as_deref() {
        Some("today") => {
            let query = format!(
                "{}
         WHERE {} AND dueDate IS NOT NULL AND date(dueDate, 'localtime') = date(?)
         {}",
                select_fields, status_clause, order_clause
            );
            let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;

            let result = stmt
                .query_map(rusqlite::params![&today], row_to_json)
                .map_err(|e| e.to_string())?
                .collect::<Result<Vec<_>, _>>()
                .map_err(|e| e.to_string())?;
            result
        }
        Some("week") => {
            let week_from_now = (Local::now() + chrono::Duration::days(7))
                .format("%Y-%m-%d")
                .to_string();
            let query = format!(
        "{}
         WHERE {} AND dueDate IS NOT NULL AND date(dueDate, 'localtime') > date(?) AND date(dueDate, 'localtime') <= date(?)
         {}",
        select_fields, status_clause, order_clause
      );
            let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;

            let result = stmt
                .query_map(rusqlite::params![&today, &week_from_now], row_to_json)
                .map_err(|e| e.to_string())?
                .collect::<Result<Vec<_>, _>>()
                .map_err(|e| e.to_string())?;
            result
        }
        Some("overdue") => {
            let query = format!(
                "{}
         WHERE {} AND dueDate IS NOT NULL AND date(dueDate, 'localtime') < date(?)
         {}",
                select_fields, status_clause, order_clause
            );
            let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;

            let result = stmt
                .query_map(rusqlite::params![&today], row_to_json)
                .map_err(|e| e.to_string())?
                .collect::<Result<Vec<_>, _>>()
                .map_err(|e| e.to_string())?;
            result
        }
        _ => {
            let query = format!(
                "{}
         WHERE {}
         {}",
                select_fields, status_clause, order_clause
            );
            let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;

            let result = stmt
                .query_map([], row_to_json)
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
    category_ids: Option<Vec<String>>,
) -> Result<serde_json::Value, String> {
    let conn = db::get_connection(&app).map_err(|e| e.to_string())?;

    let title = title.trim().to_string();
    if title.is_empty() {
        return Err("Task title cannot be empty".to_string());
    }

    let id = Uuid::new_v4().to_string();
    let priority = priority.unwrap_or_else(|| "medium".to_string());
    let now = Utc::now().to_rfc3339();
    let normalized_category_ids = normalize_category_ids(match category_ids {
        Some(category_ids) => category_ids,
        None => category_id.clone().into_iter().collect(),
    });
    let primary_category = normalized_category_ids.first().cloned();

    conn.execute(
    "INSERT INTO tasks (id, title, description, dueDate, priority, timeEstimate, categoryId, status, isFocus, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'active', FALSE, ?, ?)",
    rusqlite::params![&id, &title, description, due_date, priority, time_estimate, primary_category, now, now],
  ).map_err(|e| e.to_string())?;

    sync_task_tags(&conn, &id, &normalized_category_ids, &now).map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
      "id": id,
      "title": title,
      "description": description,
      "dueDate": due_date,
      "priority": priority,
      "timeEstimate": time_estimate,
      "categoryId": primary_category.clone(),
      "categoryIds": normalized_category_ids,
      "status": "active",
      "isFocus": false,
      "completedAt": null,
      "createdAt": now,
      "updatedAt": now,
      "subtaskCount": 0,
      "subtaskCompletedCount": 0,
      "attachmentCount": 0
    }))
}

#[tauri::command]
pub async fn update_task(
    app: AppHandle,
    id: String,
    title: Option<String>,
    description: Option<String>,
    clear_description: Option<bool>,
    due_date: Option<String>,
    clear_due_date: Option<bool>,
    priority: Option<String>,
    time_estimate: Option<i32>,
    clear_time_estimate: Option<bool>,
    category_id: Option<String>,
    clear_category_id: Option<bool>,
    category_ids: Option<Vec<String>>,
    clear_category_ids: Option<bool>,
) -> Result<serde_json::Value, String> {
    let conn = db::get_connection(&app).map_err(|e| e.to_string())?;

    let now = Utc::now().to_rfc3339();

    if let Some(t) = title {
        let trimmed_title = t.trim().to_string();
        if trimmed_title.is_empty() {
            return Err("Task title cannot be empty".to_string());
        }
        conn.execute(
            "UPDATE tasks SET title = ?, updatedAt = ? WHERE id = ?",
            rusqlite::params![trimmed_title, &now, &id],
        )
        .map_err(|e| e.to_string())?;
    }

    if clear_description.unwrap_or(false) {
        conn.execute(
            "UPDATE tasks SET description = NULL, updatedAt = ? WHERE id = ?",
            rusqlite::params![&now, &id],
        )
        .map_err(|e| e.to_string())?;
    } else if description.is_some() {
        conn.execute(
            "UPDATE tasks SET description = ?, updatedAt = ? WHERE id = ?",
            rusqlite::params![description, &now, &id],
        )
        .map_err(|e| e.to_string())?;
    }

    if clear_due_date.unwrap_or(false) {
        conn.execute(
            "UPDATE tasks SET dueDate = NULL, updatedAt = ? WHERE id = ?",
            rusqlite::params![&now, &id],
        )
        .map_err(|e| e.to_string())?;
    } else if due_date.is_some() {
        conn.execute(
            "UPDATE tasks SET dueDate = ?, updatedAt = ? WHERE id = ?",
            rusqlite::params![due_date, &now, &id],
        )
        .map_err(|e| e.to_string())?;
    }

    if let Some(p) = priority {
        conn.execute(
            "UPDATE tasks SET priority = ?, updatedAt = ? WHERE id = ?",
            rusqlite::params![p, &now, &id],
        )
        .map_err(|e| e.to_string())?;
    }

    if clear_time_estimate.unwrap_or(false) {
        conn.execute(
            "UPDATE tasks SET timeEstimate = NULL, updatedAt = ? WHERE id = ?",
            rusqlite::params![&now, &id],
        )
        .map_err(|e| e.to_string())?;
    } else if time_estimate.is_some() {
        conn.execute(
            "UPDATE tasks SET timeEstimate = ?, updatedAt = ? WHERE id = ?",
            rusqlite::params![time_estimate, &now, &id],
        )
        .map_err(|e| e.to_string())?;
    }

    if clear_category_ids.unwrap_or(false) || category_ids.is_some() {
        let next_category_ids = if clear_category_ids.unwrap_or(false) {
            Vec::new()
        } else {
            normalize_category_ids(category_ids.unwrap_or_default())
        };
        sync_task_tags(&conn, &id, &next_category_ids, &now).map_err(|e| e.to_string())?;
    } else if clear_category_id.unwrap_or(false) {
        sync_task_tags(&conn, &id, &[], &now).map_err(|e| e.to_string())?;
    } else if category_id.is_some() {
        let next_category_ids = normalize_category_ids(category_id.into_iter().collect());
        sync_task_tags(&conn, &id, &next_category_ids, &now).map_err(|e| e.to_string())?;
    }

    Ok(serde_json::json!({ "success": true, "updatedAt": now }))
}

#[tauri::command]
pub async fn delete_task(app: AppHandle, id: String) -> Result<serde_json::Value, String> {
    let conn = db::get_connection(&app).map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE tasks SET status = 'archived', updatedAt = ? WHERE id = ?",
        rusqlite::params![&now, &id],
    )
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
    )
    .map_err(|e| e.to_string())?;

    Ok(serde_json::json!({ "success": true, "completed": completed, "updatedAt": now }))
}

#[tauri::command]
pub async fn archive_completed_tasks(
    app: AppHandle,
    days_threshold: i64,
) -> Result<serde_json::Value, String> {
    let conn = db::get_connection(&app).map_err(|e| e.to_string())?;
    let archived_count =
        auto_archive_completed_tasks(&conn, days_threshold).map_err(|e| e.to_string())?;

    Ok(serde_json::json!({ "success": true, "archivedCount": archived_count }))
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
    "SELECT tasks.id, tasks.title, tasks.description, tasks.dueDate, tasks.priority, tasks.timeEstimate, tasks.categoryId, tasks.status, tasks.isFocus, tasks.completedAt, tasks.createdAt, tasks.updatedAt,
      COALESCE((SELECT GROUP_CONCAT(categoryId, ',') FROM task_tags WHERE taskId = tasks.id), '') AS categoryIds,
      (SELECT COUNT(*) FROM subtasks WHERE taskId = tasks.id) AS subtaskCount,
      (SELECT COUNT(*) FROM subtasks WHERE taskId = tasks.id AND completed = TRUE) AS subtaskCompletedCount,
      (SELECT COUNT(*) FROM task_attachments WHERE taskId = tasks.id) AS attachmentCount
     FROM tasks
     WHERE status = 'active' AND (title LIKE ? OR description LIKE ?)
     ORDER BY dueDate ASC, priority DESC
     LIMIT ?"
  ).map_err(|e| e.to_string())?;

    let tasks = stmt
        .query_map(
            rusqlite::params![&search_pattern, &search_pattern, limit],
            row_to_json,
        )
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(serde_json::json!({ "tasks": tasks, "count": tasks.len() }))
}

/// Auto-archive completed tasks older than the specified days threshold
/// Called on app startup to keep active database clean
pub fn auto_archive_completed_tasks(
    conn: &rusqlite::Connection,
    days_threshold: i64,
) -> Result<usize, rusqlite::Error> {
    use chrono::Duration;

    let archive_before = (Utc::now() - Duration::days(days_threshold)).to_rfc3339();
    let now = Utc::now().to_rfc3339();

    // Archive completed tasks where completedAt is older than threshold
    let affected = conn.execute(
        "UPDATE tasks SET status = 'archived', updatedAt = ? 
     WHERE status = 'completed' AND completedAt IS NOT NULL AND completedAt < ?",
        rusqlite::params![&now, &archive_before],
    )?;

    eprintln!(
        "[auto_archive] Archived {} completed tasks older than {} days",
        affected, days_threshold
    );
    Ok(affected)
}

#[cfg(test)]
mod tests {
    use super::auto_archive_completed_tasks;
    use chrono::{Duration, Utc};
    use rusqlite::Connection;

    fn setup_connection() -> Connection {
        let conn = Connection::open_in_memory().expect("in-memory db");

        conn.execute(
            "CREATE TABLE tasks (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        completedAt TEXT,
        updatedAt TEXT NOT NULL
      )",
            [],
        )
        .expect("create tasks table");

        conn
    }

    #[test]
    fn archives_only_completed_tasks_older_than_threshold() {
        let conn = setup_connection();
        let now = Utc::now().to_rfc3339();
        let old_completion = (Utc::now() - Duration::days(10)).to_rfc3339();
        let recent_completion = (Utc::now() - Duration::days(2)).to_rfc3339();

        conn.execute(
      "INSERT INTO tasks (id, status, completedAt, updatedAt) VALUES ('old', 'completed', ?, ?)",
      rusqlite::params![old_completion, &now],
    )
    .expect("insert old task");
        conn.execute(
      "INSERT INTO tasks (id, status, completedAt, updatedAt) VALUES ('recent', 'completed', ?, ?)",
      rusqlite::params![recent_completion, &now],
    )
    .expect("insert recent task");
        conn.execute(
      "INSERT INTO tasks (id, status, completedAt, updatedAt) VALUES ('active', 'active', NULL, ?)",
      rusqlite::params![&now],
    )
    .expect("insert active task");

        let archived = auto_archive_completed_tasks(&conn, 7).expect("archive tasks");
        assert_eq!(archived, 1);

        let old_status: String = conn
            .query_row("SELECT status FROM tasks WHERE id = 'old'", [], |row| {
                row.get(0)
            })
            .expect("query old status");
        let recent_status: String = conn
            .query_row("SELECT status FROM tasks WHERE id = 'recent'", [], |row| {
                row.get(0)
            })
            .expect("query recent status");
        let active_status: String = conn
            .query_row("SELECT status FROM tasks WHERE id = 'active'", [], |row| {
                row.get(0)
            })
            .expect("query active status");

        assert_eq!(old_status, "archived");
        assert_eq!(recent_status, "completed");
        assert_eq!(active_status, "active");
    }
}
