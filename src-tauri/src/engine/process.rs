//! Download-worker engine.
//!
//! [`execute_download_worker`] is the entry point called by
//! `trigger_job_start`. It resolves the job's configuration from
//! `SQLite`, acquires a concurrency permit, spawns `yt-dlp`, parses
//! stdout lines into progress snapshots, and finalises the row's
//! status when the child exits.

use crate::error::EngineError;
use crate::{AppEngineState, ProgressSnapshot};
use rusqlite::{params, Connection};
use std::path::PathBuf;
use std::process::Stdio;
use tauri::{AppHandle, Manager};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{Child, Command};

/// Aggregated, fully-resolved configuration for a single job.
pub struct ResolvedJobConfig {
    pub target_url: String,
    pub format_string: String,
    pub file_type: String,
    pub selected_subtitles: Option<String>,
    pub cookie_data: Option<String>,
    pub proxy_string: Option<String>,
    pub resolved_path: String,
    pub custom_title: Option<String>,
    pub sanitized_title: String,
    pub download_chunks: usize,
    pub is_direct_url: bool,
}

/// ANSI escape character (used to strip colour codes from log lines).
const ANSI_ESCAPE: char = '\x1b';

/// Parse a single `yt-dlp` progress line into a `(percent, status)` pair.
///
/// Returns `None` for non-progress lines (e.g. extractor messages).
pub fn parse_progress_line(line: &str) -> Option<(f64, String)> {
    if !line.contains("[download]") || !line.contains('%') {
        return None;
    }

    // 1. Strip common ANSI control sequences to keep parsing clean.
    let mut clean_line = String::with_capacity(line.len());
    let mut in_ansi = false;
    for c in line.chars() {
        if c == ANSI_ESCAPE {
            in_ansi = true;
        } else if in_ansi {
            if c.is_ascii_alphabetic() {
                in_ansi = false;
            }
        } else {
            clean_line.push(c);
        }
    }
    let clean_str = clean_line.trim();

    // 2. Find the percent index.
    let pct_idx = clean_str.find('%')?;
    if pct_idx == 0 {
        return None;
    }

    // 3. Scan backward to extract the numeric string.
    let chars: Vec<char> = clean_str.chars().collect();
    let mut numeric_chars = Vec::new();
    let mut i = pct_idx;
    while i > 0 {
        i -= 1;
        let c = chars[i];
        if c.is_ascii_digit() || c == '.' {
            numeric_chars.push(c);
        } else if c.is_whitespace() {
            if numeric_chars.is_empty() {
                continue;
            }
            break;
        } else {
            break;
        }
    }

    if numeric_chars.is_empty() {
        return None;
    }

    numeric_chars.reverse();
    let num_str: String = numeric_chars.into_iter().collect();
    let percentage = num_str.parse::<f64>().ok()?;

    // Extract status message (everything after the percentage symbol).
    let status_msg = clean_str[pct_idx + 1..].trim().to_string();

    Some((percentage, status_msg))
}

/// Parse a single `aria2c` progress line into a `(percent, status)` pair.
pub fn parse_aria2_progress(line: &str) -> Option<(f64, String)> {
    if !line.contains('%') {
        return None;
    }

    // Try finding a percentage match dynamically by checking all '%' chars.
    let chars: Vec<char> = line.chars().collect();
    for pct_idx in 0..chars.len() {
        if chars[pct_idx] != '%' {
            continue;
        }
        // Scan backward to locate the corresponding opening parenthesis '('.
        let mut i = pct_idx;
        while i > 0 {
            i -= 1;
            if chars[i] == '(' {
                let pct_str: String = chars[i + 1..pct_idx].iter().collect();
                if let Ok(percentage) = pct_str.trim().parse::<f64>() {
                    if (0.0..=100.0).contains(&percentage) {
                        // Extract a clean status message: prefer a
                        // bracketed `[#xxxxxx ...]` segment if present.
                        let status_msg = line.find('[').map_or_else(
                            || line.trim().to_string(),
                            |start_idx| {
                                let end_idx = line.rfind(']').unwrap_or(line.len());
                                line[start_idx..=end_idx].trim().to_string()
                            },
                        );
                        return Some((percentage, status_msg));
                    }
                }
                break;
            }
        }
    }

    None
}

/// Return the OS-standard Downloads directory as a fallback.
fn system_downloads_fallback() -> String {
    directories::UserDirs::new()
        .and_then(|dirs| {
            dirs.download_dir()
                .map(|p| p.to_string_lossy().into_owned())
        })
        .unwrap_or_else(|| ".".to_string())
}

/// Coerce a free-form title into a filesystem-safe slug.
fn sanitize_title(title: &str) -> String {
    title
        .to_lowercase()
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { '_' })
        .collect::<String>()
        .split('_')
        .filter(|s| !s.is_empty())
        .collect::<Vec<&str>>()
        .join("_")
}

/// Append `Synclime` to `path` if not already present.
fn ensure_synclime_dir(path: PathBuf) -> PathBuf {
    if path
        .file_name()
        .is_some_and(|n| n.to_string_lossy().eq_ignore_ascii_case("synclime"))
    {
        path
    } else {
        path.join("Synclime")
    }
}

/// Query `SQLite` for every parameter attached to a job row, including
/// the resolved cookies / proxy string and the final filesystem path.
/// Bundle of typed columns extracted from the joined query row in
/// `resolve_job_parameters`. Keeping them on a struct avoids passing
/// 14 arguments to the layout helper.
struct JobRowParts {
    url: String,
    format: String,
    cookie: Option<String>,
    proxy: Option<String>,
    base_path: Option<String>,
    custom_title: Option<String>,
    sanitized_title: Option<String>,
    sanitized_playlist: Option<String>,
    file_type: String,
    selected_subtitles: Option<String>,
    is_from_playlist: i32,
    is_playlist_parent: i32,
    parent_playlist_slug: Option<String>,
    parsed_file_slug: Option<String>,
    is_direct_url: i32,
}

/// Run the large SQL join and pull each column out into a typed bundle.
fn query_job_row(conn: &Connection, job_slug: &str) -> Result<JobRowParts, String> {
    let query = "
        SELECT
            COALESCE(j.direct_url, p.url) as target_url,
            j.format_string,
            COALESCE(sc_cookie.cookie_data, c.cookie_data) as cookie_data,
            COALESCE(sc_proxy.proxy_string, pr.proxy_string) as proxy_string,
            j.base_download_path,
            j.custom_download_path,
            p.sanitized_title,
            p.sanitized_playlist_name,
            j.file_type,
            j.selected_subtitles,
            j.is_from_playlist,
            COALESCE(p.is_playlist, 0) as is_playlist_parent,
            p.parent_playlist_slug,
            j.parsed_file_slug,
            j.is_direct_url
        FROM download_jobs j
        LEFT JOIN parsed_files p ON j.parsed_file_slug = p.slug
        LEFT JOIN parsed_files parent_p ON p.parent_playlist_slug = parent_p.slug
        -- Resolve selected site config for the parsed file or its parent playlist.
        LEFT JOIN site_configs sc ON COALESCE(p.site_config_slug, parent_p.site_config_slug) = sc.slug
        LEFT JOIN cookie_profiles sc_cookie ON sc.cookie_profile_slug = sc_cookie.slug
        LEFT JOIN proxy_profiles sc_proxy ON sc.proxy_profile_slug = sc_proxy.slug
        -- direct profile links fallbacks.
        LEFT JOIN cookie_profiles c ON j.cookie_profile_slug = c.slug
        LEFT JOIN proxy_profiles pr ON j.proxy_profile_slug = pr.slug
        WHERE j.slug = ?1;
    ";

    let mut stmt = conn.prepare(query).map_err(|e| e.to_string())?;
    let mut rows = stmt.query(params![job_slug]).map_err(|e| e.to_string())?;

    let Some(row) = rows.next().map_err(|e| e.to_string())? else {
        return Err(
            "Target download job configuration missing from database record registries.".into(),
        );
    };

    Ok(JobRowParts {
        url: row.get(0).map_err(|e| e.to_string())?,
        format: row.get(1).map_err(|e| e.to_string())?,
        cookie: row.get(2).ok(),
        proxy: row.get(3).ok(),
        base_path: row.get(4).ok(),
        custom_title: row.get(5).ok(),
        sanitized_title: row.get(6).ok(),
        sanitized_playlist: row.get(7).ok(),
        file_type: row.get(8).unwrap_or_default(),
        selected_subtitles: row.get(9).ok(),
        is_from_playlist: row.get(10).unwrap_or(0),
        is_playlist_parent: row.get(11).unwrap_or(0),
        parent_playlist_slug: row.get(12).ok(),
        parsed_file_slug: row.get(13).ok(),
        is_direct_url: row.get(14).unwrap_or(0),
    })
}

/// Pull the user's global download-path setting, falling back to the
/// job's recorded base path, and finally to the OS Downloads folder.
fn pick_root_destination(conn: &Connection, base_path: Option<String>) -> String {
    let global_download_path = conn
        .query_row(
            "SELECT value FROM app_settings WHERE key = 'download_path'",
            [],
            |r| r.get::<_, String>(0),
        )
        .ok();

    global_download_path
        .filter(|s| !s.trim().is_empty())
        .or_else(|| base_path.filter(|s| !s.trim().is_empty()))
        .unwrap_or_else(system_downloads_fallback)
}

/// Compose `Synclime/<playlist>/<video>` (or just `Synclime/<video>`
/// for a standalone clip) on top of the chosen root destination.
/// Returns `(final_path, clean_video_name)` so callers can also stamp
/// the clean name onto the [`ResolvedJobConfig::sanitized_title`]
/// without recomputing it.
fn apply_layout_to_path(root: String, parts: &JobRowParts) -> (PathBuf, String) {
    let mut final_path = ensure_synclime_dir(PathBuf::from(root));

    let is_playlist_item = parts.is_from_playlist == 1
        || !parts
            .parent_playlist_slug
            .clone()
            .unwrap_or_default()
            .trim()
            .is_empty();

    let raw_video_name = parts
        .sanitized_title
        .clone()
        .or_else(|| parts.custom_title.clone())
        .unwrap_or_else(|| "video".to_string());
    let video_slug = parts
        .parsed_file_slug
        .clone()
        .unwrap_or_else(|| "video".to_string());
    let clean_video_name = {
        let base = sanitize_title(&raw_video_name);
        let clean_slug = sanitize_title(&video_slug);
        if base.is_empty() {
            clean_slug
        } else {
            format!("{base}_{clean_slug}")
        }
    };

    if parts.is_direct_url == 1 {
        // Direct standalone file: no video subfolder. Sits
        // directly under the Synclime directory.
    } else if is_playlist_item {
        let raw_playlist_name = if parts.is_playlist_parent == 1 {
            parts
                .sanitized_title
                .clone()
                .unwrap_or_else(|| "playlist".to_string())
        } else {
            parts
                .sanitized_playlist
                .clone()
                .unwrap_or_else(|| "playlist".to_string())
        };
        let playlist_slug = if parts.is_playlist_parent == 1 {
            parts
                .parsed_file_slug
                .clone()
                .unwrap_or_else(|| "playlist".to_string())
        } else {
            parts
                .parent_playlist_slug
                .clone()
                .unwrap_or_else(|| "playlist".to_string())
        };
        let clean_playlist_name = {
            let base = sanitize_title(&raw_playlist_name);
            let clean_slug = sanitize_title(&playlist_slug);
            if base.is_empty() {
                clean_slug
            } else {
                format!("{base}_{clean_slug}")
            }
        };

        final_path = final_path.join(clean_playlist_name).join(&clean_video_name);
    } else {
        // Standalone video.
        final_path = final_path.join(&clean_video_name);
    }

    (final_path, clean_video_name)
}

/// Query `SQLite` for every parameter attached to a job row, including
/// the resolved cookies / proxy string and the final filesystem path.
pub fn resolve_job_parameters(
    conn: &Connection,
    job_slug: &str,
) -> Result<ResolvedJobConfig, String> {
    let parts = query_job_row(conn, job_slug)?;

    let download_chunks = conn
        .query_row(
            "SELECT value FROM app_settings WHERE key = 'download_chunks'",
            [],
            |r| r.get::<_, String>(0),
        )
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(1);

    let root_destination = pick_root_destination(conn, parts.base_path.clone());
    let (final_path, clean_video_name) = apply_layout_to_path(root_destination, &parts);

    if !final_path.exists() {
        let _ = std::fs::create_dir_all(&final_path);
    }

    Ok(ResolvedJobConfig {
        target_url: parts.url,
        format_string: parts.format,
        file_type: parts.file_type,
        selected_subtitles: parts.selected_subtitles,
        cookie_data: parts.cookie,
        proxy_string: parts.proxy,
        resolved_path: final_path.to_string_lossy().into_owned(),
        custom_title: parts.custom_title,
        sanitized_title: clean_video_name,
        download_chunks,
        is_direct_url: parts.is_direct_url == 1,
    })
}

/// RAII guard: deletes the temporary Netscape cookie file when the
/// owning scope exits. Used by both `discover_asset_metadata` and
/// `execute_download_worker`.
struct CookieFileCleanup(Option<PathBuf>);

impl Drop for CookieFileCleanup {
    fn drop(&mut self) {
        if let Some(path) = &self.0 {
            if std::fs::remove_file(path).is_ok() {
                println!(
                    "[SYNCLIME] Secure temporary cookies file successfully deleted: {}",
                    path.display()
                );
            } else {
                println!(
                    "[SYNCLIME] WARNING: Failed to delete secure temporary cookies file: {}",
                    path.display()
                );
            }
        }
    }
}

/// Write the cookie blob to a 0600-mode file and return its path
/// along with a guard that deletes it on scope exit.
fn materialize_cookie_file(
    app_dir: Option<&std::path::Path>,
    cookies: &str,
) -> Option<(PathBuf, CookieFileCleanup)> {
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
        println!("[SYNCLIME] Secure Netscape cookies file created:");
        println!("  - Path: {}", file_path.display());
        println!("  - Size: {} bytes", cookies.len());
        let guard = CookieFileCleanup(Some(file_path.clone()));
        Some((file_path, guard))
    } else {
        println!(
            "[SYNCLIME] ERROR: Failed to write secure temporary cookie file at {}",
            file_path.display()
        );
        None
    }
}

/// Record an unrecoverable spawn error: update DB, write to `error_logs`,
/// and surface a final snapshot so the UI can show the failure.
fn log_spawn_error(
    state: &AppEngineState,
    job_slug: &str,
    command_executed: &str,
    error_message: &str,
) {
    let conn = state.db_conn.lock();

    let _ = conn.execute(
        "UPDATE download_jobs SET status = 'error', tracking_message = ?1, updated_at = datetime('now') WHERE slug = ?2;",
        rusqlite::params![error_message, job_slug],
    );

    let error_slug = format!("err_{}", chrono::Utc::now().timestamp_millis());
    let now_str = chrono::Utc::now().to_rfc3339();
    let _ = conn.execute(
        "INSERT INTO error_logs (slug, download_job_slug, command_executed, error_message, is_resolved, timestamp) VALUES (?1, ?2, ?3, ?4, 0, ?5);",
        rusqlite::params![error_slug, job_slug, command_executed, error_message, now_str],
    );

    let mut cache = state.progress_cache.lock();
    cache.insert(
        job_slug.to_string(),
        ProgressSnapshot {
            progress: 0.0,
            status_message: error_message.to_string(),
            status: "error".to_string(),
        },
    );
}

/// Build the full `yt-dlp` argv vector for a resolved job, including
/// the optional cookie/proxy/subtitle arguments.
fn build_command_args(
    config: &ResolvedJobConfig,
    cookies_path: Option<&std::path::Path>,
) -> Vec<String> {
    let mut command_args: Vec<String> = Vec::with_capacity(16);

    command_args.push("--no-playlist".into());
    command_args.push("-f".into());
    command_args.push(config.format_string.clone());
    command_args.push("--newline".into());
    command_args.push("-P".into());
    command_args.push(config.resolved_path.clone());

    if config.is_direct_url {
        // Direct standalone file: prefer aria2c when available, else
        // fall back to a 10 MiB HTTP chunk size.
        if is_aria2c_available() {
            command_args.push("--downloader".into());
            command_args.push("aria2c".into());
            command_args.push("--downloader-args".into());
            command_args.push(format!(
                "aria2c:-x {} -s {}",
                config.download_chunks, config.download_chunks
            ));
        } else {
            command_args.push("--http-chunk-size".into());
            command_args.push("10M".into());
        }
    } else {
        // Parsed video / playlist: concurrent fragments.
        command_args.push("-N".into());
        command_args.push(config.download_chunks.to_string());
    }

    // Pin the absolute output path via `-o` so the directory layout
    // is guaranteed.
    let output_template = config
        .custom_title
        .as_deref()
        .filter(|ct| !ct.trim().is_empty())
        .map_or_else(
            || format!("{}/%(title)s.%(ext)s", config.resolved_path),
            |ct| format!("{}/{}.%(ext)s", config.resolved_path, ct.trim()),
        );
    command_args.push("-o".into());
    command_args.push(output_template);

    if config.file_type == "subtitle" {
        command_args.push("--write-subs".into());
        command_args.push("--write-auto-subs".into());
        command_args.push("--skip-download".into());
        command_args.push("--sub-langs".into());
        command_args.push(
            config
                .selected_subtitles
                .clone()
                .unwrap_or_else(|| "all".into()),
        );
    }

    if let Some(proxy_url) = config
        .proxy_string
        .as_deref()
        .filter(|p| !p.trim().is_empty())
    {
        command_args.push("--proxy".into());
        command_args.push(proxy_url.to_string());
    }

    if let Some(cookies_path) = cookies_path {
        command_args.push("--cookies".into());
        command_args.push(cookies_path.to_string_lossy().into_owned());
    }

    command_args.push(config.target_url.clone());
    command_args
}

/// Probe whether `aria2c` is installed and runnable.
fn is_aria2c_available() -> bool {
    std::process::Command::new("aria2c")
        .arg("--version")
        .output()
        .is_ok()
}

/// Configure an unspawned `tokio::process::Command` for `yt-dlp`.
fn configure_ytdlp_command(args: &[String]) -> Command {
    let mut cmd = Command::new("yt-dlp");
    #[cfg(unix)]
    {
        cmd.process_group(0);
    }
    for arg in args {
        cmd.arg(arg);
    }
    cmd
}

/// Spawn `yt-dlp` and capture its stdout.
fn spawn_ytdlp(args: &[String]) -> Result<(Child, BufReader<tokio::process::ChildStdout>), String> {
    let mut cmd = configure_ytdlp_command(args);
    cmd.stdout(Stdio::piped()).stderr(Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| format!("spawn: {e}"))?;
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "Failed to trap stdout.".to_string())?;
    Ok((child, BufReader::new(stdout)))
}

/// Stream stdout into the per-job progress cache until the child closes.
async fn stream_progress(
    state: &AppEngineState,
    job_slug: &str,
    reader: BufReader<tokio::process::ChildStdout>,
) -> f64 {
    let mut reader = reader.lines();
    let mut current_progress = 0.0;

    while let Ok(Some(line)) = reader.next_line().await {
        let clean_line = line.trim();
        if clean_line.is_empty() {
            continue;
        }

        let parsed_progress =
            parse_progress_line(clean_line).or_else(|| parse_aria2_progress(clean_line));

        if let Some((percentage, _)) = parsed_progress {
            current_progress = percentage;
        }

        let mut cache = state.progress_cache.lock();
        cache.insert(
            job_slug.to_string(),
            ProgressSnapshot {
                progress: current_progress,
                status_message: clean_line.to_string(),
                status: "downloading".to_string(),
            },
        );
    }

    current_progress
}

/// Drain the child's stderr stream into a single trimmed string.
async fn read_stderr(child: &mut Child) -> String {
    let Some(stderr) = child.stderr.take() else {
        return String::new();
    };
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
}

/// Determine the post-exit status of a job and persist it.
fn finalize_job(
    state: &AppEngineState,
    job_slug: &str,
    command_executed: &str,
    clean_exit: bool,
    stderr_msg: &str,
    last_progress: f64,
) {
    let conn = state.db_conn.lock();

    // If the user paused this job, preserve the paused state and
    // clear the tracking message.
    let mut is_paused = false;
    if let Ok(status) = conn.query_row(
        "SELECT status FROM download_jobs WHERE slug = ?1;",
        rusqlite::params![job_slug],
        |row| row.get::<_, String>(0),
    ) {
        if status == "paused" {
            is_paused = true;
        }
    }

    if is_paused {
        let _ = conn.execute(
            "UPDATE download_jobs SET tracking_message = NULL, updated_at = datetime('now') WHERE slug = ?1;",
            rusqlite::params![job_slug],
        );
        let mut cache = state.progress_cache.lock();
        cache.insert(
            job_slug.to_string(),
            ProgressSnapshot {
                progress: last_progress,
                status_message: "Download paused by user.".into(),
                status: "paused".into(),
            },
        );
        return;
    }

    if clean_exit {
        let _ = conn.execute(
            "UPDATE download_jobs SET status = 'completed', progress = 100.0, updated_at = datetime('now') WHERE slug = ?1;",
            rusqlite::params![job_slug],
        );
        let mut cache = state.progress_cache.lock();
        cache.insert(
            job_slug.to_string(),
            ProgressSnapshot {
                progress: 100.0,
                status_message: "Download completed successfully.".into(),
                status: "completed".into(),
            },
        );
        return;
    }

    let error_desc = if stderr_msg.trim().is_empty() {
        "Download process terminated with error status.".to_string()
    } else {
        stderr_msg.trim().to_string()
    };

    let _ = conn.execute(
        "UPDATE download_jobs SET status = 'error', tracking_message = ?1, updated_at = datetime('now') WHERE slug = ?2;",
        rusqlite::params![error_desc, job_slug],
    );
    let error_slug = format!("err_{}", chrono::Utc::now().timestamp_millis());
    let now_str = chrono::Utc::now().to_rfc3339();
    let _ = conn.execute(
        "INSERT INTO error_logs (slug, download_job_slug, command_executed, error_message, is_resolved, timestamp) VALUES (?1, ?2, ?3, ?4, 0, ?5);",
        rusqlite::params![error_slug, job_slug, command_executed, error_desc, now_str],
    );

    let mut cache = state.progress_cache.lock();
    cache.insert(
        job_slug.to_string(),
        ProgressSnapshot {
            progress: last_progress,
            status_message: error_desc,
            status: "error".into(),
        },
    );
}

/// Background task: runs `yt-dlp` for `job_slug`, streams progress into
/// the cache, and writes the final status on exit.
///
/// # Errors
/// Returns [`EngineError::Spawn`] if configuration lookup fails, the
/// concurrency permit is closed, the process cannot be spawned, or
/// stdout cannot be captured. Errors at this point are also recorded
/// in `error_logs` and the cache before returning.
#[allow(clippy::too_many_lines)]
pub async fn execute_download_worker(
    app_handle: AppHandle,
    job_slug: String,
) -> Result<(), EngineError> {
    let state = app_handle.state::<AppEngineState>();
    let mut command_executed = "yt-dlp (failed during setup)".to_string();

    let config = {
        let conn = state.db_conn.lock();
        match resolve_job_parameters(&conn, &job_slug) {
            Ok(cfg) => cfg,
            Err(err) => {
                log_spawn_error(&state, &job_slug, &command_executed, &err);
                return Err(EngineError::Spawn(err));
            }
        }
    };

    let semaphore = {
        let lock = state.pool_semaphore.read();
        std::sync::Arc::clone(&*lock)
    };

    let _permit = match semaphore.acquire_owned().await {
        Ok(p) => p,
        Err(e) => {
            let err_msg = e.to_string();
            log_spawn_error(&state, &job_slug, &command_executed, &err_msg);
            return Err(EngineError::Spawn(err_msg));
        }
    };

    // Cookies are written to a 0600 file before the child starts and
    // deleted on scope exit; this survives panics and early returns.
    let (_cookie_guard, cookies_path) = config
        .cookie_data
        .as_deref()
        .filter(|c| !c.trim().is_empty())
        .and_then(|cookies| materialize_cookie_file(state.db_path.parent(), cookies))
        .map_or_else(
            || (CookieFileCleanup(None), None),
            |(path, guard)| (guard, Some(path)),
        );
    let cookies_arg_path = cookies_path.as_deref();

    let command_args = build_command_args(&config, cookies_arg_path);
    let args_log = command_args.clone();
    command_executed = format!("yt-dlp {}", args_log.join(" "));
    println!("[SYNCLIME DOWNLOADER] Spawning download process:");
    println!("  - Command string: {command_executed}");

    let (child, stdout_reader) = match spawn_ytdlp(&command_args) {
        Ok(pair) => pair,
        Err(err) => {
            log_spawn_error(&state, &job_slug, &command_executed, &err);
            return Err(EngineError::Spawn(err));
        }
    };

    // Register the child so a pause signal can find it.
    {
        let mut active_instances = state.active_processes.instances.write();
        active_instances.insert(job_slug.clone(), child);
    }

    let last_progress = stream_progress(&state, &job_slug, stdout_reader).await;

    // Remove the child from the registry, take ownership back so we
    // can read its stderr and wait on it.
    let mut remaining_child = {
        let mut active_instances = state.active_processes.instances.write();
        active_instances
            .remove(&job_slug)
            .ok_or_else(|| EngineError::NotFound(job_slug.clone()))?
    };

    let stderr_msg = read_stderr(&mut remaining_child).await;
    let clean_exit = remaining_child
        .wait()
        .await
        .is_ok_and(|status| status.success());

    finalize_job(
        &state,
        &job_slug,
        &command_executed,
        clean_exit,
        &stderr_msg,
        last_progress,
    );

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_progress_line_standard() {
        let input = "[download]  23.4% of  12.34MiB at  1.23MiB/s ETA 00:10";
        let res = parse_progress_line(input);
        assert!(res.is_some());
        let (pct, msg) = res.unwrap();
        assert!((pct - 23.4).abs() < f64::EPSILON);
        assert_eq!(msg, "of  12.34MiB at  1.23MiB/s ETA 00:10");
    }

    #[test]
    fn test_parse_progress_line_spacing() {
        let input = "[download]   0.1% of 100.0MiB";
        let res = parse_progress_line(input);
        assert!(res.is_some());
        let (pct, msg) = res.unwrap();
        assert!((pct - 0.1).abs() < f64::EPSILON);
        assert_eq!(msg, "of 100.0MiB");
    }

    #[test]
    fn test_parse_progress_line_ansi() {
        let input = "\x1b[0;32m[download]  45.6% of  100.00MiB\x1b[0m";
        let res = parse_progress_line(input);
        assert!(res.is_some());
        let (pct, msg) = res.unwrap();
        assert!((pct - 45.6).abs() < f64::EPSILON);
        assert_eq!(msg, "of  100.00MiB");
    }

    #[test]
    fn test_parse_progress_line_invalid() {
        let input = "[youtube] Extracting subtitles...";
        let res = parse_progress_line(input);
        assert!(res.is_none());
    }
}
