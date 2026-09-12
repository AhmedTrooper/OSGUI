//! Asset metadata discovery commands.
//!
//! `discover_asset_metadata` shells out to `yt-dlp --dump-single-json
//! --flat-playlist` and feeds the output into the resilient decoder
//! in [`crate::engine::structures`]. `insert_parsed_file` is the
//! companion that records a successful parse into the `SQLite` cache.

use crate::engine::structures::DiscoveryResult;
use crate::AppEngineState;
use rusqlite::{params, Connection};
use std::path::PathBuf;
use std::process::Stdio;
use tauri::AppHandle;
use tauri::Manager;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

#[derive(serde::Serialize)]
pub struct DiscoveryResponse {
    pub success: bool,
    pub payload: Option<DiscoveryResult>,
    pub error_message: Option<String>,
}

#[derive(serde::Deserialize)]
pub struct InsertParsedFilePayload {
    pub slug: String,
    pub url: String,
    pub title: String,
    pub sanitized_title: String,
    pub is_playlist: i32,
    pub parent_playlist_slug: Option<String>,
    pub playlist_name: Option<String>,
    pub sanitized_playlist_name: Option<String>,
    pub json_metadata: Option<String>,
    pub created_at: String,
    pub site_config_slug: Option<String>,
}

/// Save (insert or replace) a parsed file row.
#[tauri::command]
#[allow(clippy::unused_async)]
pub async fn insert_parsed_file(
    state: tauri::State<'_, AppEngineState>,
    payload: InsertParsedFilePayload,
) -> Result<crate::commands::queue::CommandResponse, String> {
    let row = crate::database::operations::ParsedFileRow {
        slug: payload.slug,
        url: payload.url,
        title: payload.title,
        sanitized_title: payload.sanitized_title,
        is_playlist: payload.is_playlist,
        parent_playlist_slug: payload.parent_playlist_slug,
        playlist_name: payload.playlist_name,
        sanitized_playlist_name: payload.sanitized_playlist_name,
        json_metadata: payload.json_metadata,
        created_at: payload.created_at,
        site_config_slug: payload.site_config_slug,
    };

    let conn = state.db_conn.lock();
    match crate::database::operations::save_parsed_file(&conn, &row) {
        Ok(()) => Ok(crate::commands::queue::CommandResponse {
            success: true,
            message: "Parsed file registered in SQLite successfully.".to_string(),
        }),
        Err(e) => Ok(crate::commands::queue::CommandResponse {
            success: false,
            message: e.to_string(),
        }),
    }
}

/// Resolved cookie + proxy credentials for a `site_configs` row.
struct SiteConfigCredentials {
    cookie_data: Option<String>,
    proxy_string: Option<String>,
}

/// Resolve the cookie blob and proxy string attached to a `site_configs` slug.
fn resolve_site_credentials(conn: &Connection, slug: &str) -> SiteConfigCredentials {
    let query = "
        SELECT c.cookie_data, pr.proxy_string
        FROM site_configs s
        LEFT JOIN cookie_profiles c ON s.cookie_profile_slug = c.slug
        LEFT JOIN proxy_profiles pr ON s.proxy_profile_slug = pr.slug
        WHERE s.slug = ?1;
    ";

    if let Ok(mut stmt) = conn.prepare(query) {
        if let Ok(mut rows) = stmt.query(params![slug]) {
            if let Ok(Some(row)) = rows.next() {
                return SiteConfigCredentials {
                    cookie_data: row.get(0).ok(),
                    proxy_string: row.get(1).ok(),
                };
            }
        }
    }
    SiteConfigCredentials {
        cookie_data: None,
        proxy_string: None,
    }
}

/// RAII guard: deletes the temporary Netscape cookie file when the
/// owning scope exits.
struct CookieFileCleanup(Option<PathBuf>);

impl Drop for CookieFileCleanup {
    fn drop(&mut self) {
        if let Some(path) = &self.0 {
            if std::fs::remove_file(path).is_ok() {
                println!(
                    "[SYNCLIME BACKEND] Secure temporary cookies file successfully deleted: {}",
                    path.display()
                );
            } else {
                println!(
                    "[SYNCLIME BACKEND] WARNING: Failed to delete secure temporary cookies file: {}",
                    path.display()
                );
            }
        }
    }
}

/// Write the cookie blob to a per-call file and return its path along
/// with a guard that removes it when the scope exits.
fn materialize_cookie_file(app_dir: Option<&std::path::Path>, cookies: &str) -> Option<PathBuf> {
    if cookies.trim().is_empty() {
        return None;
    }
    let app_dir = app_dir?;
    let unique_id = chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0);
    let file_path = app_dir.join(format!("synclime_cookie_{unique_id}.txt"));

    #[cfg(unix)]
    let wrote = {
        use std::os::unix::fs::OpenOptionsExt;
        std::fs::OpenOptions::new()
            .create(true)
            .write(true)
            .truncate(true)
            .mode(0o600)
            .open(&file_path)
            .ok()
            .and_then(|mut f| std::io::Write::write_all(&mut f, cookies.as_bytes()).ok())
            .is_some()
    };

    #[cfg(not(unix))]
    let wrote = std::fs::write(&file_path, cookies).is_ok();

    if wrote {
        println!("[SYNCLIME BACKEND] Secure Netscape cookies file created:");
        println!("  - Path: {}", file_path.display());
        println!("  - Size: {} bytes", cookies.len());
        Some(file_path)
    } else {
        println!(
            "[SYNCLIME BACKEND] ERROR: Failed to write secure temporary cookie file at {}",
            file_path.display()
        );
        None
    }
}

/// Resolve the [`SiteConfigCredentials`] for `site_config_slug`, logging
/// the outcome for visibility in the worker console.
fn resolve_site_credentials_with_log(
    state: &AppEngineState,
    site_config_slug: Option<&str>,
) -> SiteConfigCredentials {
    site_config_slug.map_or_else(
        || {
            println!("[SYNCLIME BACKEND] No site configuration selected (direct connection)");
            SiteConfigCredentials {
                cookie_data: None,
                proxy_string: None,
            }
        },
        |slug| {
            let conn = state.db_conn.lock();
            let credentials = resolve_site_credentials(&conn, slug);
            println!("[SYNCLIME BACKEND] Resolved site configuration for slug '{slug}'");
            println!(
                "  - Proxy resolved: {}",
                credentials.proxy_string.as_deref().unwrap_or("(none)")
            );
            let cookie_chars = credentials.cookie_data.as_deref().map_or(0, str::len);
            println!("  - Cookies resolved: {cookie_chars} characters");
            credentials
        },
    )
}

/// Build the `yt-dlp` argv list, wire in optional cookie/proxy flags,
/// and return the unspawned `Command` and the (optional) cookie path
/// guard that owns the cleanup.
fn build_ytdlp_command(
    site_credentials: &SiteConfigCredentials,
    state: &AppEngineState,
    target_url: &str,
) -> (Command, Option<PathBuf>, CookieFileCleanup) {
    let mut cmd = Command::new("yt-dlp");
    cmd.arg("--dump-single-json").arg("--flat-playlist");

    if let Some(proxy) = site_credentials
        .proxy_string
        .as_deref()
        .filter(|p| !p.trim().is_empty())
    {
        cmd.arg("--proxy").arg(proxy);
    }

    let temp_cookie_path = site_credentials
        .cookie_data
        .as_deref()
        .filter(|c| !c.trim().is_empty())
        .and_then(|cookies| materialize_cookie_file(state.db_path.parent(), cookies));

    let cookie_guard = CookieFileCleanup(temp_cookie_path.clone());

    if let Some(p) = &temp_cookie_path {
        cmd.arg("--cookies").arg(p);
    }

    cmd.arg(target_url);
    cmd.stdout(Stdio::piped()).stderr(Stdio::piped());

    println!("[SYNCLIME BACKEND] Spawning parsing command:");
    println!(
        "  - Extractor command: yt-dlp --dump-single-json --flat-playlist{}",
        if site_credentials.proxy_string.is_some() {
            " --proxy <proxy_url>"
        } else {
            ""
        }
    );
    if let Some(p) = &temp_cookie_path {
        println!("  - Using temporary cookies file: {}", p.display());
    }
    println!("  - Target URL: '{target_url}'");

    (cmd, temp_cookie_path, cookie_guard)
}

/// Discovery: shell out to `yt-dlp --dump-single-json --flat-playlist`
/// and parse the streamed stdout into a [`DiscoveryResponse`].
#[tauri::command]
#[allow(clippy::unused_async)]
pub async fn discover_asset_metadata(
    app_handle: AppHandle,
    target_url: String,
    site_config_slug: Option<String>,
) -> Result<DiscoveryResponse, String> {
    let state = app_handle.state::<AppEngineState>();
    let site_credentials = resolve_site_credentials_with_log(&state, site_config_slug.as_deref());

    let (mut cmd, _temp_cookie_path, _cookie_guard) =
        build_ytdlp_command(&site_credentials, &state, &target_url);

    let mut child = match cmd.spawn() {
        Ok(c) => c,
        Err(err) => {
            return Ok(DiscoveryResponse {
                success: false,
                payload: None,
                error_message: Some(format!("Failed to initialize extraction sub-engine: {err}")),
            });
        }
    };

    let Some(stdout_pipe) = child.stdout.take() else {
        return Ok(DiscoveryResponse {
            success: false,
            payload: None,
            error_message: Some("Failed to hook standard output allocation handle.".to_string()),
        });
    };
    let stderr_pipe = child.stderr.take();

    let mut reader = BufReader::new(stdout_pipe).lines();
    let mut raw_json_accumulator = String::new();
    while let Ok(Some(line)) = reader.next_line().await {
        raw_json_accumulator.push_str(&line);
    }
    let _ = child.wait().await;

    if !raw_json_accumulator.is_empty() {
        let raw_json_for_decode = raw_json_accumulator.clone();
        return match crate::engine::structures::parse_extraction_payload(&raw_json_for_decode) {
            Ok(discovery_variant) => Ok(DiscoveryResponse {
                success: true,
                payload: Some(discovery_variant),
                error_message: None,
            }),
            Err(parse_err) => Ok(DiscoveryResponse {
                success: false,
                payload: None,
                error_message: Some(parse_err),
            }),
        };
    }

    // Process produced empty stdout; surface whatever was on stderr.
    let stderr_msg = if let Some(stderr) = stderr_pipe {
        let mut err_reader = BufReader::new(stderr).lines();
        let mut err_lines: Vec<String> = Vec::new();
        while let Ok(Some(line)) = err_reader.next_line().await {
            let clean = line.trim();
            if !clean.is_empty() {
                err_lines.push(clean.to_string());
            }
        }
        let last = err_lines.last().cloned().unwrap_or_default();
        if last.is_empty() {
            err_lines.join(" ")
        } else {
            last
        }
    } else {
        String::new()
    };

    let final_err = if stderr_msg.is_empty() {
        "Extraction sub-engine returned a completely empty stream buffer data block.".to_string()
    } else {
        stderr_msg.trim().to_string()
    };

    Ok(DiscoveryResponse {
        success: false,
        payload: None,
        error_message: Some(final_err),
    })
}
