/**
 * Domain-level entity types. These mirror the rusqlite row shapes
 * from `src-tauri/src/database/operations.rs`.
 *
 * Naming convention:
 *   - snake_case fields map directly to SQLite column names
 *   - camelCase fields are computed / JS-friendly mirrors that the
 *     frontend uses (e.g. `createdAt` ↔ `created_at`)
 */

export type InboxStatus = "pending" | "parsed" | "downloaded";

export interface InboxItem {
  slug: string;
  url: string;
  status: InboxStatus;
  created_at: string;
  updated_at: string;
}

export interface SiteConfig {
  slug: string;
  title: string;
  domain: string;
  cookie_profile_slug: string | null;
  proxy_profile_slug: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CookieProfile {
  slug: string;
  title: string;
  domain: string;
  cookie_data: string;
  created_at: string;
  updated_at: string;
}

export interface ProxyProfile {
  slug: string;
  title: string;
  proxy_string: string;
  created_at: string;
  updated_at: string;
}

export type DownloadStatus = "pending" | "downloading" | "paused" | "completed" | "error";

export type FileType = "video" | "audio" | "subtitle" | "playlist" | "direct_document";

export interface DownloadJob {
  slug: string;
  name: string;
  url: string;
  progress: number;
  status: DownloadStatus;
  message: string;
  fileType: FileType;
  createdAt: string;
  parsedFileSlug?: string;
  isPlaylist?: boolean;
  playlistName?: string;
  parentPlaylistSlug?: string;
  associatedMediaJobSlug?: string;
}

export interface ErrorLog {
  slug: string;
  download_job_slug: string;
  command_executed: string;
  error_message: string;
  is_resolved: number;
  timestamp: string;
}

export interface ParseLog {
  slug: string;
  parsed_file_slug: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number;
  command_executed: string;
  exit_code: number | null;
  bytes_returned: number;
}

export interface JobRecordPayload {
  slug: string;
  url: string;
  parsed_file_slug?: string | null;
  file_type: FileType;
  associated_media_job_slug?: string | null;
  is_from_playlist?: boolean | null;
  format_string: string;
  download_path: string;
  created_at: string;
  custom_title?: string | null;
  selected_subtitles?: string | null;
  site_config_slug?: string | null;
}

export interface ParsedFileRecordPayload {
  slug: string;
  url: string;
  title: string;
  sanitized_title: string;
  is_playlist: number;
  parent_playlist_slug: string | null;
  playlist_name: string | null;
  sanitized_playlist_name: string | null;
  json_metadata: string;
  created_at: string;
  site_config_slug: string | null;
}

export interface UserConfig {
  lastSavedSlug?: string;
  theme?: "light" | "dark";
  sidebarCollapsed?: boolean;
  badges?: Record<string, number>;
  downloadPath?: string;
}

export interface UpdatesSchema {
  latest_update: string;
  updates: UpdateItem[];
}

export interface UpdateItem {
  version_slug: string;
  application_online_version: string;
  date: string;
  features: string[];
  fixes: string[];
  severity: "critical" | "normal" | string;
}
