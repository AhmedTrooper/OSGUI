//! Synclime backend library.
//!
//! This crate is the Tauri-side counterpart to the Vue/Solid frontend
//! in `../src`. It exposes a SQLite-backed job queue for `yt-dlp`,
//! spins up an axum HTTP listener on `127.0.0.1:14221` so browser
//! extensions can inject URLs, and broadcasts progress updates to the
//! UI through Tauri's event system.
//!
//! Architectural overview:
//!
//! ```text
//!   ┌─────────────────┐    ┌───────────────────┐    ┌────────────────┐
//!   │  Tauri commands │───▶│ AppEngineState    │───▶│  SQLite (rusqlite) │
//!   └─────────────────┘    │  + job registry   │    └────────────────┘
//!           │              └───────────────────┘
//!           │                       │
//!           ▼                       ▼
//!   ┌─────────────────┐    ┌───────────────────┐
//!   │  Event bus      │◀───│  Engine workers   │────▶  yt-dlp process
//!   └─────────────────┘    └───────────────────┘
//! ```
//!
//! Public surface lives in the [`commands`], [`database`], and
//! [`engine`] modules. Everything else is an implementation detail.

// Application, not a published library: Tauri command `Result<T,
// String>` boundaries intentionally don't document error conditions.
#![allow(clippy::missing_errors_doc)]
// Cosmetic lint about temporary lifetimes — flagged in many places
// where the temporary is held across an `await` and there's no real
// resource pressure.
#![allow(clippy::significant_drop_tightening)]
// Long doc-comment opening paragraphs; pure style preference.
#![allow(clippy::too_long_first_doc_paragraph)]
#![cfg_attr(mobile, tauri::mobile_entry_point)]

pub mod commands;
pub mod database;
pub mod engine;
pub mod error;

use parking_lot::{Mutex, RwLock};
use rusqlite::Connection;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager};
use tokio::process::Child;
use tokio::sync::{mpsc, Semaphore};

pub use error::{DbError, EngineError};

/// Cancellation signal sent from a Tauri command to the worker task.
#[derive(Debug)]
pub enum QueueSignal {
    /// Stop the `yt-dlp` child process for the job identified by `slug`.
    PauseJob(String),
}

/// Tracks every `tokio::process::Child` currently running on behalf of
/// the engine. The pause path reaches into this map to send signals.
pub struct ActiveProcessRegistry {
    /// Inner map. Stored as `Arc<RwLock>` so reads (e.g. `contains_key`)
    /// can proceed without contending with writers.
    pub instances: Arc<RwLock<HashMap<String, Child>>>,
}

/// Snapshot of a running job's progress, captured by line-parser and
/// flushed to `SQLite` + the frontend event bus every second.
pub struct ProgressSnapshot {
    /// 0.0 ..= 100.0
    pub progress: f64,
    /// Last meaningful log line from the worker.
    pub status_message: String,
    /// One of `pending` / `downloading` / `paused` / `completed` / `error`.
    pub status: String,
}

/// Application-wide state, managed by Tauri and accessed by every
/// `#[tauri::command]` via `State<'_, AppEngineState>`.
#[derive(Clone)]
pub struct AppEngineState {
    /// Concurrency-limit semaphore (wrapped in `Arc` so updates from
    /// `update_concurrency_limit` are visible to existing workers).
    pub pool_semaphore: Arc<RwLock<Arc<Semaphore>>>,
    /// Absolute path to the `SQLite` database file.
    pub db_path: PathBuf,
    /// Shared `SQLite` handle. Single-writer by convention; held briefly.
    pub db_conn: Arc<Mutex<Connection>>,
    /// Active child processes per job slug.
    pub active_processes: Arc<ActiveProcessRegistry>,
    /// Sender side of the cancellation channel.
    pub signal_tx: mpsc::Sender<QueueSignal>,
    /// Per-job progress cache, flushed every second.
    pub progress_cache: Arc<Mutex<HashMap<String, ProgressSnapshot>>>,
}

/// Initial SQL schema applied on first launch.
///
/// Lives as a single `execute_batch` so the database file is
/// single-shot initialised; subsequent boots reuse the existing file.
const DATABASE_MIGRATION_SCHEMA: &str = r"
CREATE TABLE IF NOT EXISTS cookie_profiles (
    slug TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    domain TEXT NOT NULL,
    cookie_data TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS proxy_profiles (
    slug TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    proxy_string TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS site_configs (
    slug TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    domain TEXT NOT NULL,
    cookie_profile_slug TEXT REFERENCES cookie_profiles(slug) ON DELETE SET NULL,
    proxy_profile_slug TEXT REFERENCES proxy_profiles(slug) ON DELETE SET NULL,
    is_default INTEGER NOT NULL CHECK (is_default IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
);
INSERT OR IGNORE INTO app_settings (key, value) VALUES ('concurrency_limit', '3');
INSERT OR IGNORE INTO app_settings (key, value) VALUES ('download_chunks', '1');

CREATE TABLE IF NOT EXISTS parsed_files (
    slug TEXT PRIMARY KEY NOT NULL,
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    sanitized_title TEXT NOT NULL,
    is_playlist INTEGER NOT NULL CHECK (is_playlist IN (0, 1)),
    parent_playlist_slug REFERENCES parsed_files(slug) ON DELETE SET NULL,
    playlist_name TEXT,
    sanitized_playlist_name TEXT,
    json_metadata TEXT,
    created_at TEXT NOT NULL,
    site_config_slug TEXT REFERENCES site_configs(slug) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS download_jobs (
    slug TEXT PRIMARY KEY NOT NULL,
    parsed_file_slug TEXT REFERENCES parsed_files(slug) ON DELETE SET NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('video', 'audio', 'subtitle', 'direct_document')),
    associated_media_job_slug TEXT REFERENCES download_jobs(slug) ON DELETE CASCADE,
    is_direct_url INTEGER NOT NULL CHECK (is_direct_url IN (0, 1)),
    direct_url TEXT,
    is_from_playlist INTEGER NOT NULL CHECK (is_from_playlist IN (0, 1)),
    current_part INTEGER NOT NULL DEFAULT 1,
    total_parts INTEGER NOT NULL DEFAULT 1,
    base_download_path TEXT NOT NULL,
    custom_download_path TEXT,
    cookie_profile_slug TEXT REFERENCES cookie_profiles(slug) ON DELETE SET NULL,
    proxy_profile_slug TEXT REFERENCES proxy_profiles(slug) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'downloading', 'paused', 'completed', 'error')),
    progress REAL NOT NULL DEFAULT 0.00,
    tracking_message TEXT,
    format_string TEXT NOT NULL,
    audio_format TEXT,
    video_format TEXT,
    selected_subtitles TEXT,
    last_pid INTEGER NOT NULL DEFAULT 0,
    priority_index INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    resumed_at TEXT,
    restarted_at TEXT,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS parse_logs (
    slug TEXT PRIMARY KEY NOT NULL,
    parsed_file_slug TEXT NOT NULL REFERENCES parsed_files(slug) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed')),
    started_at TEXT NOT NULL,
    finished_at TEXT,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    command_executed TEXT NOT NULL,
    exit_code INTEGER,
    bytes_returned INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS error_logs (
    slug TEXT PRIMARY KEY NOT NULL,
    download_job_slug TEXT NOT NULL REFERENCES download_jobs(slug) ON DELETE CASCADE,
    command_executed TEXT NOT NULL,
    error_message TEXT NOT NULL,
    is_resolved INTEGER NOT NULL CHECK (is_resolved IN (0, 1)),
    timestamp TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_parsed_files_parent ON parsed_files (parent_playlist_slug) WHERE parent_playlist_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_download_jobs_parsed_file ON download_jobs (parsed_file_slug) WHERE parsed_file_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_download_jobs_subtitles ON download_jobs (associated_media_job_slug) WHERE file_type = 'subtitle' AND associated_media_job_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_download_jobs_queue_priority ON download_jobs (status, priority_index DESC, created_at ASC);

CREATE TABLE IF NOT EXISTS inbox_urls (
    slug TEXT PRIMARY KEY NOT NULL,
    url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'parsed', 'downloaded')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
";

/// Resolves the platform-appropriate data directory and runs the
/// schema-initialisation SQL against a fresh or existing file.
///
/// # Errors
/// Propagates any IO failure from creating the directory or opening
/// the `SQLite` file. The caller is expected to treat this as fatal.
fn initialize_database(app: &tauri::App) -> Result<PathBuf, Box<dyn std::error::Error>> {
    let app_dir = app.path().app_data_dir()?;
    if !app_dir.exists() {
        fs::create_dir_all(&app_dir)?;
    }

    let db_path = app_dir.join("synclime_core.db");
    let conn = Connection::open(&db_path)?;

    conn.execute("PRAGMA foreign_keys = ON;", [])?;
    conn.execute_batch(DATABASE_MIGRATION_SCHEMA)?;

    // Idempotent column addition for users upgrading from an older
    // build that pre-dated the site-config relationship.
    let _ = conn.execute(
        "ALTER TABLE parsed_files ADD COLUMN site_config_slug TEXT REFERENCES site_configs(slug) ON DELETE SET NULL;",
        [],
    );
    let _ = conn.execute(
        "UPDATE app_settings SET value = '1' WHERE key = 'download_chunks' AND value = '4';",
        [],
    );

    // Fallback rows are referenced when an error log has no real job.
    // They carry a sentinel slug so the foreign-key constraint holds.
    let _ = conn.execute(
        "INSERT OR IGNORE INTO parsed_files (slug, url, title, sanitized_title, is_playlist, created_at) \
         VALUES ('app_fallback', 'n/a', 'Fallback Cache Profile', 'fallback', 0, datetime('now'));",
        [],
    );
    let _ = conn.execute(
        "INSERT OR IGNORE INTO download_jobs (slug, file_type, is_direct_url, is_from_playlist, base_download_path, status, format_string, created_at, updated_at) \
         VALUES ('app_fallback', 'video', 1, 0, 'n/a', 'error', 'n/a', datetime('now'), datetime('now'));",
        [],
    );

    Ok(db_path)
}

/// Cancellation worker: receives `QueueSignal::PauseJob` over `rx` and
/// terminates the matching child process group.
///
/// On Unix this sends `SIGKILL` to the whole process group so children
/// of `yt-dlp` (e.g. `ffmpeg`) are reaped too. On other platforms the
/// Tokio `Child::kill` is used.
async fn run_cancellation_worker(
    mut rx: mpsc::Receiver<QueueSignal>,
    registry: Arc<ActiveProcessRegistry>,
) {
    while let Some(signal) = rx.recv().await {
        match signal {
            QueueSignal::PauseJob(slug) => {
                let target_process = {
                    let mut active_instances = registry.instances.write();
                    active_instances.remove(&slug)
                };

                if let Some(child_process) = target_process {
                    #[cfg(unix)]
                    {
                        if let Some(pid) = child_process.id() {
                            let _ = std::process::Command::new("kill")
                                .args(["-9", &format!("-{pid}")])
                                .status();
                        }
                    }
                    #[cfg(not(unix))]
                    {
                        let _ = child_process.kill().await;
                    }
                }
            }
        }
    }
}

/// Progress-flush worker: every second, drain in-memory snapshots into
/// `SQLite` and broadcast them on the `download-progress-token` event.
async fn run_progress_flusher(
    conn: Arc<Mutex<Connection>>,
    cache: Arc<Mutex<HashMap<String, ProgressSnapshot>>>,
    emitter: AppHandle,
) {
    loop {
        tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
        let mut cache = cache.lock();
        if cache.is_empty() {
            continue;
        }
        let conn = conn.lock();
        for (slug, snapshot) in cache.iter() {
            let _ = conn.execute(
                "UPDATE download_jobs SET progress = ?1, tracking_message = ?2, status = ?3, updated_at = datetime('now') WHERE slug = ?4;",
                rusqlite::params![snapshot.progress, snapshot.status_message, snapshot.status, slug],
            );

            let _ = emitter.emit(
                "download-progress-token",
                serde_json::json!({
                    "slug": slug,
                    "progress": snapshot.progress,
                    "message": snapshot.status_message,
                    "status": snapshot.status
                }),
            );
        }
        cache.clear();
    }
}

/// Deletes any `synclime_cookie_*.txt` files the previous session left
/// behind. Cookies are written into the app data dir with `0600`
/// permissions and a `Drop` guard normally deletes them when the
/// worker exits; this is a belt-and-braces cleanup at boot.
fn scrub_cookie_files(app_dir: &Path) {
    let Ok(entries) = fs::read_dir(app_dir) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let Some(filename) = path.file_name().and_then(|n| n.to_str()) else {
            continue;
        };
        if filename.starts_with("synclime_cookie_")
            && std::path::Path::new(filename)
                .extension()
                .is_some_and(|ext| ext.eq_ignore_ascii_case("txt"))
        {
            let _ = fs::remove_file(path);
        }
    }
}

#[allow(clippy::too_many_lines)]
async fn start_axum_server(app_handle: AppHandle, db_conn: Arc<Mutex<Connection>>) {
    use axum::{
        routing::{get, post},
        Json, Router,
    };
    use serde::Deserialize;
    use std::net::SocketAddr;
    use tower_http::cors::CorsLayer;

    #[derive(Deserialize)]
    struct AddUrlPayload {
        url: String,
    }

    let app = Router::new()
        .route(
            "/health",
            get(|| async {
                Json(serde_json::json!({
                    "status": "ok",
                    "message": "Synclime Local API server is healthy and online",
                    "version": "0.1.0"
                }))
            }),
        )
        .route(
            "/add",
            post({
                let app_handle = app_handle.clone();
                let db_conn = db_conn.clone();
                move |Json(payload): Json<AddUrlPayload>| {
                    let app_handle = app_handle.clone();
                    let db_conn = db_conn.clone();
                    async move {
                        let url = payload.url.trim();
                        if url.is_empty() {
                            return (
                                axum::http::StatusCode::BAD_REQUEST,
                                Json(serde_json::json!({
                                    "success": false,
                                    "message": "URL cannot be empty"
                                })),
                            );
                        }

                        let slug = format!("inbox-{}", chrono::Utc::now().timestamp_millis());
                        let conn = db_conn.lock();
                        let query = "
                            INSERT OR IGNORE INTO inbox_urls (slug, url, status, created_at, updated_at)
                            VALUES (?1, ?2, 'pending', datetime('now'), datetime('now'));
                        ";

                        match conn.execute(query, rusqlite::params![slug, url]) {
                            Ok(rows) if rows > 0 => {
                                let _ = app_handle.emit("inbox-updated", ());
                                (
                                    axum::http::StatusCode::OK,
                                    Json(serde_json::json!({
                                        "success": true,
                                        "message": "URL successfully added to inbox",
                                        "slug": slug
                                    })),
                                )
                            }
                            Ok(_) => (
                                axum::http::StatusCode::OK,
                                Json(serde_json::json!({
                                    "success": false,
                                    "message": "URL already exists in inbox"
                                })),
                            ),
                            Err(e) => (
                                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                                Json(serde_json::json!({
                                    "success": false,
                                    "message": format!("Database insert error: {e}")
                                })),
                            ),
                        }
                    }
                }
            }),
        )
        .layer(CorsLayer::permissive());

    for port in 14221..=14230 {
        let addr = SocketAddr::from(([127, 0, 0, 1], port));
        let Ok(listener) = tokio::net::TcpListener::bind(addr).await else {
            eprintln!("[Axum Server] Port {port} is in use, trying next...");
            continue;
        };

        println!("[Axum Server] Successfully bound to port {port}");
        {
            let conn = db_conn.lock();
            let _ = conn.execute(
                "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('active_api_port', ?1);",
                rusqlite::params![port.to_string()],
            );
        }
        if let Err(e) = axum::serve(listener, app).await {
            eprintln!("[Axum Server] Error serving axum: {e}");
        }
        return;
    }

    eprintln!("[Axum Server] Critical: Could not bind to any port in range 14221 to 14230!");
}

/// Reads `concurrency_limit` from `app_settings`, defaulting to 3.
fn read_concurrency_limit(conn: &Connection) -> usize {
    conn.query_row(
        "SELECT value FROM app_settings WHERE key = 'concurrency_limit'",
        [],
        |row| row.get::<_, String>(0),
    )
    .ok()
    .and_then(|v| v.parse().ok())
    .unwrap_or(3)
}

/// On boot, roll back any `downloading`/`pending` rows left over from
/// a previous crash so they pick up from `paused` on the next start.
fn pause_in_flight_jobs(conn: &Connection) {
    let _ = conn.execute(
        "UPDATE download_jobs SET status = 'paused', updated_at = datetime('now') WHERE status = 'downloading' OR status = 'pending';",
        [],
    );
}

/// Build the `tauri::generate_handler![...]` macro invocation that
/// registers every `#[tauri::command]` on the IPC surface. Kept out
/// of `run()` to keep that function under the clippy `too_many_lines`
/// threshold; the body is otherwise identical.
#[allow(clippy::too_many_lines)]
fn build_invoke_handler() -> impl Fn(tauri::ipc::Invoke<tauri::Wry>) -> bool {
    tauri::generate_handler![
        commands::clipboard::process_clipboard_paste,
        commands::queue::trigger_job_start,
        commands::queue::request_job_pause,
        commands::queue::insert_job_record,
        commands::queue::delete_job_record,
        commands::queue::clear_all_jobs_records,
        commands::queue::get_all_jobs,
        commands::queue::reveal_job_in_explorer,
        commands::queue::reveal_folder_in_explorer,
        commands::queue::update_concurrency_limit,
        commands::queue::get_concurrency_limit,
        commands::queue::update_download_chunks,
        commands::queue::get_download_chunks,
        commands::discovery::discover_asset_metadata,
        commands::discovery::insert_parsed_file,
        commands::config::add_cookie_profile,
        commands::config::get_cookie_profiles,
        commands::config::update_cookie_data,
        commands::config::delete_cookie_profile,
        commands::config::batch_delete_cookie_profiles,
        commands::config::add_proxy_profile,
        commands::config::get_proxy_profiles,
        commands::config::update_proxy_data,
        commands::config::delete_proxy_profile,
        commands::config::batch_delete_proxy_profiles,
        commands::config::add_site_config,
        commands::config::get_site_configs,
        commands::config::update_site_config,
        commands::config::delete_site_config,
        commands::config::update_download_path,
        commands::config::get_download_path,
        commands::logs::get_error_logs,
        commands::logs::get_parse_logs,
        commands::logs::insert_error_log,
        commands::logs::insert_parse_log,
        commands::logs::clear_all_logs,
        commands::inbox::get_inbox_urls,
        commands::inbox::get_inbox_url_by_slug,
        commands::inbox::add_inbox_url,
        commands::inbox::update_inbox_status,
        commands::inbox::delete_inbox_url,
        commands::inbox::get_local_updates,
        commands::inbox::get_online_updates,
        commands::inbox::get_active_api_port,
    ]
}

/// Application entry point. Constructs the Tauri builder, registers
/// all plugins/commands/handlers, and starts the runtime.
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            let db_path = match initialize_database(app) {
                Ok(path) => path,
                Err(err) => {
                    eprintln!("[CRITICAL] Failed to map local data schemas: {err}");
                    std::process::exit(1);
                }
            };

            let db_conn = match Connection::open(&db_path) {
                Ok(c) => {
                    let _ = c.execute("PRAGMA foreign_keys = ON;", []);
                    Arc::new(Mutex::new(c))
                }
                Err(err) => {
                    eprintln!(
                        "[CRITICAL] Failed to open native SQLite thread-safe connection: {err}"
                    );
                    std::process::exit(1);
                }
            };

            let concurrency_limit = {
                let conn = db_conn.lock();
                pause_in_flight_jobs(&conn);
                read_concurrency_limit(&conn)
            };

            let process_registry = Arc::new(ActiveProcessRegistry {
                instances: Arc::new(RwLock::new(HashMap::new())),
            });

            let (signal_tx, signal_rx) = mpsc::channel::<QueueSignal>(32);
            let worker_registry = Arc::clone(&process_registry);
            tauri::async_runtime::spawn(async move {
                run_cancellation_worker(signal_rx, worker_registry).await;
            });

            let progress_cache: Arc<Mutex<HashMap<String, ProgressSnapshot>>> =
                Arc::new(Mutex::new(HashMap::new()));
            let flush_conn = Arc::clone(&db_conn);
            let flush_cache = Arc::clone(&progress_cache);
            let tic_emitter = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                run_progress_flusher(flush_conn, flush_cache, tic_emitter).await;
            });

            if let Some(app_dir) = db_path.parent() {
                scrub_cookie_files(app_dir);
            }

            let axum_app_handle = app.handle().clone();
            let axum_db_conn = Arc::clone(&db_conn);
            tauri::async_runtime::spawn(async move {
                start_axum_server(axum_app_handle, axum_db_conn).await;
            });

            app.manage(AppEngineState {
                pool_semaphore: Arc::new(RwLock::new(Arc::new(Semaphore::new(concurrency_limit)))),
                db_path,
                db_conn,
                active_processes: process_registry,
                signal_tx,
                progress_cache,
            });

            Ok(())
        })
        .invoke_handler(build_invoke_handler());

    if let Err(err) = builder.run(tauri::generate_context!()) {
        eprintln!("error while running tauri application: {err}");
    }
}
