//! Crate-wide error types and shared aliases.
//!
//! Two distinct error categories live here:
//!
//! * [`DbError`] — typed errors raised from the [`crate::database`] layer.
//!   Internally we use `Result<T, DbError>` so the cause is preserved;
//!   at the Tauri command boundary we collapse to `String` via
//!   `.map_err(|e| e.to_string())` for the frontend.
//!
//! * [`EngineError`] — typed errors raised from [`crate::engine`] when a
//!   download worker cannot be started.
//!
//! Application-level infallible bootstrapping ([`crate::run`]) does not
//! return a `Result` — a failed boot is treated as a fatal condition
//! and terminates the process, which matches the surrounding Tauri
//! ergonomics.

use thiserror::Error;

/// Errors raised by the `database` module.
///
/// `Display` is derived via `thiserror` so the boundary conversion
/// `DbError -> String` is a single `.to_string()` call.
#[derive(Debug, Error)]
pub enum DbError {
    /// Underlying `rusqlite` failure (constraint, IO, codec, …).
    #[error("sqlite error: {0}")]
    Sqlite(#[from] rusqlite::Error),
}

/// Convenience alias for fallible database operations.
pub type DbResult<T> = std::result::Result<T, DbError>;

/// Errors raised by the download-engine worker.
#[derive(Debug, Error)]
pub enum EngineError {
    /// `tokio::process::Command::spawn` returned an error, or the child
    /// process exited before we could acquire its stdout pipe.
    #[error("failed to spawn download process: {0}")]
    Spawn(String),

    /// The download job slug does not exist in the `download_jobs` table.
    #[error("download job not found: {0}")]
    NotFound(String),
}

/// Convenience alias for fallible engine operations.
pub type EngineResult<T> = std::result::Result<T, EngineError>;
