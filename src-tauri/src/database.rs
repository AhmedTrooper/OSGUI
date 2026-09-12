//! `SQLite` persistence layer.
//!
//! All access to the application database flows through this module.
//! Higher layers ([`crate::commands`], [`crate::engine`]) acquire a
//! [`parking_lot::Mutex<Connection>`] handle from
//! [`crate::AppEngineState::db_conn`] and then call free functions in
//! [`operations`]. This keeps SQL contained to a single module so the
//! rest of the codebase stays storage-agnostic.

pub mod operations;

pub use operations::{DownloadJobRow, ParsedFileRow};
