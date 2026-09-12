//! Pure `SQLite` data-access functions.
//!
//! All public functions take a borrowed [`rusqlite::Connection`] so
//! the caller controls locking. Returns [`DbError`] which is the
//! `thiserror`-based enum defined in [`crate::error`]; Tauri command
//! callers `.map_err(|e| e.to_string())` at the IPC boundary.

use rusqlite::{params, Connection, Row};

use crate::error::{DbError, DbResult};

/// Structural representation of an asset row returned by the
/// `yt-dlp --dump-single-json` extraction path.
pub struct ParsedFileRow {
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

/// Structural representation of a download-job row.
pub struct DownloadJobRow {
    pub slug: String,
    pub parsed_file_slug: Option<String>,
    pub file_type: String,
    pub associated_media_job_slug: Option<String>,
    pub is_direct_url: i32,
    pub direct_url: Option<String>,
    pub is_from_playlist: i32,
    pub current_part: i32,
    pub total_parts: i32,
    pub base_download_path: String,
    pub custom_download_path: Option<String>,
    pub cookie_profile_slug: Option<String>,
    pub proxy_profile_slug: Option<String>,
    pub status: String,
    pub format_string: String,
    pub audio_format: Option<String>,
    pub video_format: Option<String>,
    pub selected_subtitles: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// Tiny ergonomic helper: fetch a typed column from a row, converting
/// any `rusqlite::Error` into our [`DbError`] automatically.
fn col<T: rusqlite::types::FromSql>(row: &Row<'_>, idx: usize) -> DbResult<T> {
    row.get(idx).map_err(DbError::from)
}

/// Insert or replace a `parsed_files` row keyed by `slug`.
pub fn save_parsed_file(conn: &Connection, row: &ParsedFileRow) -> DbResult<()> {
    let query = "
        INSERT OR REPLACE INTO parsed_files (
            slug, url, title, sanitized_title, is_playlist,
            parent_playlist_slug, playlist_name, sanitized_playlist_name,
            json_metadata, created_at, site_config_slug
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11);
    ";

    conn.execute(
        query,
        params![
            row.slug,
            row.url,
            row.title,
            row.sanitized_title,
            row.is_playlist,
            row.parent_playlist_slug,
            row.playlist_name,
            row.sanitized_playlist_name,
            row.json_metadata,
            row.created_at,
            row.site_config_slug
        ],
    )?;
    Ok(())
}

/// Insert (or ignore on conflict) a new `download_jobs` row.
pub fn create_download_job(conn: &Connection, job: &DownloadJobRow) -> DbResult<()> {
    let query = "
        INSERT OR IGNORE INTO download_jobs (
            slug, parsed_file_slug, file_type, associated_media_job_slug,
            is_direct_url, direct_url, is_from_playlist, current_part, total_parts,
            base_download_path, custom_download_path, cookie_profile_slug, proxy_profile_slug,
            status, format_string, audio_format, video_format, selected_subtitles,
            created_at, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20);
    ";

    conn.execute(
        query,
        params![
            job.slug,
            job.parsed_file_slug,
            job.file_type,
            job.associated_media_job_slug,
            job.is_direct_url,
            job.direct_url,
            job.is_from_playlist,
            job.current_part,
            job.total_parts,
            job.base_download_path,
            job.custom_download_path,
            job.cookie_profile_slug,
            job.proxy_profile_slug,
            job.status,
            job.format_string,
            job.audio_format,
            job.video_format,
            job.selected_subtitles,
            job.created_at,
            job.updated_at
        ],
    )?;
    Ok(())
}

/// Fetch the next `pending` job, ordered by priority then age.
pub fn get_next_pending_job(conn: &Connection) -> DbResult<Option<DownloadJobRow>> {
    let query = "
        SELECT
            slug, parsed_file_slug, file_type, associated_media_job_slug,
            is_direct_url, direct_url, is_from_playlist, current_part, total_parts,
            base_download_path, custom_download_path, cookie_profile_slug, proxy_profile_slug,
            status, format_string, audio_format, video_format, selected_subtitles,
            created_at, updated_at
        FROM download_jobs
        WHERE status = 'pending'
        ORDER BY priority_index DESC, created_at ASC
        LIMIT 1;
    ";

    let mut stmt = conn.prepare(query)?;
    let mut rows = stmt.query([])?;

    match rows.next()? {
        Some(row) => Ok(Some(DownloadJobRow {
            slug: col(row, 0)?,
            parsed_file_slug: row.get(1)?,
            file_type: col(row, 2)?,
            associated_media_job_slug: row.get(3)?,
            is_direct_url: col(row, 4)?,
            direct_url: row.get(5)?,
            is_from_playlist: col(row, 6)?,
            current_part: col(row, 7)?,
            total_parts: col(row, 8)?,
            base_download_path: col(row, 9)?,
            custom_download_path: row.get(10)?,
            cookie_profile_slug: row.get(11)?,
            proxy_profile_slug: row.get(12)?,
            status: col(row, 13)?,
            format_string: col(row, 14)?,
            audio_format: row.get(15)?,
            video_format: row.get(16)?,
            selected_subtitles: row.get(17)?,
            created_at: col(row, 18)?,
            updated_at: col(row, 19)?,
        })),
        None => Ok(None),
    }
}

/// Delete a single `download_jobs` row by slug.
pub fn delete_download_job(conn: &Connection, job_slug: &str) -> DbResult<()> {
    conn.execute(
        "DELETE FROM download_jobs WHERE slug = ?1;",
        params![job_slug],
    )?;
    Ok(())
}

/// Delete every `completed` or `error` job. Pending / downloading /
/// paused jobs are preserved so the user can resume after a crash.
pub fn clear_all_download_jobs(conn: &Connection) -> DbResult<()> {
    conn.execute(
        "DELETE FROM download_jobs WHERE status IN ('completed', 'error');",
        [],
    )?;
    Ok(())
}
