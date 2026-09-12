//! Inbox commands — the lightweight URL inbox that browser
//! extensions and the clipboard path write into, and that the
//! frontend reads back to drive the discovery flow.

use crate::AppEngineState;
use tauri::{AppHandle, Emitter, State};

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct InboxUrlRow {
    pub slug: String,
    pub url: String,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(serde::Serialize)]
pub struct InboxResponse {
    pub success: bool,
    pub message: String,
    pub slug: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct PaginatedInboxUrls {
    pub items: Vec<InboxUrlRow>,
    pub total: i64,
    pub pending_count: i64,
    pub page: u32,
    pub page_size: u32,
    pub total_pages: u32,
}

/// List inbox rows with pagination, newest first.
#[tauri::command]
#[allow(clippy::unused_async)]
pub async fn get_inbox_urls(
    state: State<'_, AppEngineState>,
    page: Option<u32>,
    page_size: Option<u32>,
) -> Result<PaginatedInboxUrls, String> {
    let conn = state.db_conn.lock();

    let total: i64 = conn
        .query_row("SELECT COUNT(*) FROM inbox_urls;", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    let pending_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM inbox_urls WHERE status = 'pending';",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let page = page.unwrap_or(1).max(1);
    let page_size = page_size.unwrap_or(15).max(1);
    let page_size_i64 = i64::from(page_size);
    let offset = i64::from(page - 1) * page_size_i64;
    let total_pages = if total == 0 {
        1
    } else {
        u32::try_from((total + page_size_i64 - 1) / page_size_i64).unwrap_or(1)
    };

    let mut stmt = conn
        .prepare(
            "SELECT slug, url, status, created_at, updated_at FROM inbox_urls ORDER BY created_at DESC LIMIT ?1 OFFSET ?2;",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(rusqlite::params![page_size, offset], |row| {
            Ok(InboxUrlRow {
                slug: row.get(0)?,
                url: row.get(1)?,
                status: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for item in rows.flatten() {
        items.push(item);
    }

    Ok(PaginatedInboxUrls {
        items,
        total,
        pending_count,
        page,
        page_size,
        total_pages,
    })
}

/// Fetch a single inbox row by its slug.
#[tauri::command]
#[allow(clippy::unused_async)]
pub async fn get_inbox_url_by_slug(
    state: State<'_, AppEngineState>,
    slug: String,
) -> Result<Option<InboxUrlRow>, String> {
    let conn = state.db_conn.lock();
    let mut stmt = conn
        .prepare(
            "SELECT slug, url, status, created_at, updated_at FROM inbox_urls WHERE slug = ?1;",
        )
        .map_err(|e| e.to_string())?;

    let mut rows = stmt
        .query_map(rusqlite::params![slug], |row| {
            Ok(InboxUrlRow {
                slug: row.get(0)?,
                url: row.get(1)?,
                status: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;

    if let Some(res) = rows.next() {
        let item = res.map_err(|e| e.to_string())?;
        Ok(Some(item))
    } else {
        Ok(None)
    }
}

/// Insert a URL into the inbox, broadcasting `inbox-updated` on success.
#[tauri::command]
#[allow(clippy::unused_async)]
pub async fn add_inbox_url(
    app_handle: AppHandle,
    state: State<'_, AppEngineState>,
    url: String,
    slug: Option<String>,
) -> Result<InboxResponse, String> {
    let target_slug =
        slug.unwrap_or_else(|| format!("inbox-{}", chrono::Utc::now().timestamp_millis()));
    let conn = state.db_conn.lock();

    let query = "
        INSERT OR IGNORE INTO inbox_urls (slug, url, status, created_at, updated_at)
        VALUES (?1, ?2, 'pending', datetime('now'), datetime('now'));
    ";

    match conn.execute(query, rusqlite::params![target_slug, url]) {
        Ok(rows_affected) if rows_affected > 0 => {
            let _ = app_handle.emit("inbox-updated", ());
            Ok(InboxResponse {
                success: true,
                message: "URL successfully added to inbox.".to_string(),
                slug: Some(target_slug),
            })
        }
        Ok(_) => Ok(InboxResponse {
            success: false,
            message: "URL already exists in inbox.".to_string(),
            slug: None,
        }),
        Err(e) => Err(e.to_string()),
    }
}

/// Transition an inbox row to a new lifecycle status.
#[tauri::command]
#[allow(clippy::unused_async)]
pub async fn update_inbox_status(
    app_handle: AppHandle,
    state: State<'_, AppEngineState>,
    slug: String,
    status: String,
) -> Result<InboxResponse, String> {
    if status != "pending" && status != "parsed" && status != "downloaded" {
        return Err("Invalid inbox status. Must be pending, parsed, or downloaded.".to_string());
    }

    let conn = state.db_conn.lock();
    let query = "UPDATE inbox_urls SET status = ?1, updated_at = datetime('now') WHERE slug = ?2;";

    match conn.execute(query, rusqlite::params![status, slug]) {
        Ok(rows) if rows > 0 => {
            let _ = app_handle.emit("inbox-updated", ());
            Ok(InboxResponse {
                success: true,
                message: format!("Inbox item status updated to {status}."),
                slug: Some(slug),
            })
        }
        Ok(_) => Ok(InboxResponse {
            success: false,
            message: "No inbox item matched the provided slug.".to_string(),
            slug: None,
        }),
        Err(e) => Err(e.to_string()),
    }
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct AppUpdateItem {
    pub version_slug: String,
    pub application_online_version: String,
    pub date: String,
    pub features: Vec<String>,
    pub fixes: Vec<String>,
    pub severity: String,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct AppUpdatesSchema {
    pub latest_update: String,
    pub updates: Vec<AppUpdateItem>,
}

/// Read `updates.json` from the working directory or its parent.
#[tauri::command]
#[allow(clippy::unused_async)]
pub async fn get_local_updates() -> Result<AppUpdatesSchema, String> {
    let data = std::fs::read_to_string("updates.json")
        .or_else(|_| std::fs::read_to_string("../updates.json"))
        .map_err(|e| format!("Failed to read updates.json: {e}"))?;

    let parsed: AppUpdatesSchema =
        serde_json::from_str(&data).map_err(|e| format!("Failed to parse updates.json: {e}"))?;

    Ok(parsed)
}

/// Remove an inbox row entirely.
#[tauri::command]
#[allow(clippy::unused_async)]
pub async fn delete_inbox_url(
    app_handle: AppHandle,
    state: State<'_, AppEngineState>,
    slug: String,
) -> Result<InboxResponse, String> {
    let conn = state.db_conn.lock();
    match conn.execute(
        "DELETE FROM inbox_urls WHERE slug = ?1;",
        rusqlite::params![slug],
    ) {
        Ok(rows) if rows > 0 => {
            let _ = app_handle.emit("inbox-updated", ());
            Ok(InboxResponse {
                success: true,
                message: "Inbox item deleted successfully.".to_string(),
                slug: Some(slug),
            })
        }
        Ok(_) => Ok(InboxResponse {
            success: false,
            message: "No inbox item matched the provided slug.".to_string(),
            slug: None,
        }),
        Err(e) => Err(e.to_string()),
    }
}

/// Fetch the latest `updates.json` directly from GitHub.
#[tauri::command]
pub async fn get_online_updates() -> Result<AppUpdatesSchema, String> {
    let client = reqwest::Client::new();
    let url = "https://raw.githubusercontent.com/AhmedTrooper/Synclime/main/updates.json";

    let response = client
        .get(url)
        .header("User-Agent", "Synclime-Desktop-App")
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {e}"))?;

    if !response.status().is_success() {
        return Err(format!("Server returned error code: {}", response.status()));
    }

    let parsed: AppUpdatesSchema = response
        .json::<AppUpdatesSchema>()
        .await
        .map_err(|e| format!("Failed to parse JSON response: {e}"))?;

    Ok(parsed)
}

/// Read which port the local axum server bound to at boot.
#[tauri::command]
#[allow(clippy::unused_async)]
pub async fn get_active_api_port(state: State<'_, AppEngineState>) -> Result<u16, String> {
    let conn = state.db_conn.lock();
    let val: String = conn
        .query_row(
            "SELECT value FROM app_settings WHERE key = 'active_api_port';",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    val.parse::<u16>()
        .map_err(|_| "Invalid port parsed from SQLite settings".to_string())
}
