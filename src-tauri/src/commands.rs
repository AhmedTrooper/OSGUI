//! Tauri command surface, grouped by domain.
//!
//! Each submodule exposes a set of `#[tauri::command]` async functions.
//! The frontend invokes them by string name (see
//! `lib.rs::run::invoke_handler`); keeping them grouped here makes the
//! IPC surface easy to audit at a glance.

pub mod clipboard;
pub mod config;
pub mod discovery;
pub mod inbox;
pub mod logs;
pub mod queue;

// Flat re-exports of the most-used commands so callers don't have to
// know which module a command lives in. Internal callers (other
// commands, the engine) keep using the qualified path so the
// dependency direction is obvious.
pub use clipboard::process_clipboard_paste;
pub use discovery::{discover_asset_metadata, insert_parsed_file};
pub use inbox::{
    add_inbox_url, delete_inbox_url, get_active_api_port, get_inbox_url_by_slug, get_inbox_urls,
    get_local_updates, get_online_updates, update_inbox_status,
};
pub use logs::{
    clear_all_logs, get_error_logs, get_parse_logs, insert_error_log, insert_parse_log,
};
pub use queue::{
    clear_all_jobs_records, delete_job_record, get_all_jobs, get_concurrency_limit,
    get_download_chunks, insert_job_record, request_job_pause, reveal_folder_in_explorer,
    reveal_job_in_explorer, trigger_job_start, update_concurrency_limit, update_download_chunks,
};
