//! Background work execution and payload decoding.
//!
//! * [`process`] — the download worker that spawns `yt-dlp`, parses
//!   progress lines, and reports back through the [`crate::progress_cache`].
//! * [`structures`] — serde models for `yt-dlp --dump-single-json`
//!   output and the resilient decoder that picks between playlist and
//!   single-video payloads.

pub mod process;
pub mod structures;
