/**
 * Typed mirrors of the Rust `yt-dlp --dump-single-json` payloads defined in
 * `src-tauri/src/engine/structures.rs`.
 *
 * Every field is `optional` because yt-dlp extractor behavior varies wildly
 * across sources — the parser is forgiving, the decoder narrows.
 */

export interface Format {
  format_id: string;
  format_note?: string;
  ext?: string;
  protocol?: string;
  acodec?: string;
  vcodec?: string;
  url?: string;
  width?: number;
  height?: number;
  fps?: number;
  audio_ext?: string;
  video_ext?: string;
  vbr?: number;
  abr?: number;
  tbr?: number;
  resolution?: string;
  aspect_ratio?: number;
  filesize?: number;
  filesize_approx?: number;
  format?: string;
  asr?: number;
  audio_channels?: number;
}

export interface Thumbnail {
  url?: string;
  id?: string;
  preference?: number;
  height?: number;
  width?: number;
  resolution?: string;
}

export interface SubtitleEntry {
  ext: string;
  url: string;
  name?: string;
}

export type SubtitleMap = Record<string, SubtitleEntry[]>;

export interface Chapter {
  start_time: number;
  end_time: number;
  title: string;
}

export type YtdlpAssetType = "video" | "playlist" | "url" | "multi_video";

export interface VideoMetadata {
  id: string;
  title: string;
  formats: Format[];
  thumbnails?: Thumbnail[];
  thumbnail?: string;
  description?: string;
  channel_id?: string;
  channel_url?: string;
  duration?: number;
  view_count?: number;
  webpage_url?: string;
  uploader?: string;
  upload_date?: string;
  original_url?: string;
  extractor?: string;
  subtitles?: SubtitleMap;
  automatic_captions?: SubtitleMap;
  chapters?: Chapter[];
  type?: "video";
}

export interface PlaylistThumbnail {
  url: string;
  height?: number;
  width?: number;
  id?: string;
  resolution?: string;
}

export interface PlaylistEntry {
  type?: YtdlpAssetType;
  ie_key?: string;
  id: string;
  url: string;
  title: string;
  description?: string;
  duration?: number;
  channel_id?: string;
  channel?: string;
  channel_url?: string;
  uploader?: string;
  uploader_id?: string;
  uploader_url?: string;
  thumbnails?: PlaylistThumbnail[];
  view_count?: number;
}

export interface GenericPlaylistMetadata {
  id: string;
  title: string;
  description?: string;
  playlist_count?: number;
  entries: PlaylistEntry[];
  webpage_url?: string;
  original_url?: string;
  extractor?: string;
  thumbnails?: PlaylistThumbnail[];
  channel?: string;
  channel_id?: string;
  type?: "playlist";
}

export type DiscoveryPayload = VideoMetadata | GenericPlaylistMetadata;

export const isPlaylistPayload = (
  payload: DiscoveryPayload | { entries?: unknown[]; _type?: string; type?: string },
): payload is GenericPlaylistMetadata =>
  ("type" in payload && payload.type === "playlist") ||
  ("_type" in payload && (payload as { _type?: string })._type === "playlist") ||
  Array.isArray((payload as { entries?: unknown[] }).entries);

export interface ParsedFile {
  slug: string;
  url: string;
  title: string;
  sanitizedTitle: string;
  isPlaylist: boolean;
  thumbnail: string;
  duration: number;
  author: string;
  views: number;
  payload: DiscoveryPayload;
  parsedAt: string;
  parentPlaylistSlug?: string;
  siteConfigSlug?: string;
}

export interface SubtitleOption {
  lang: string;
  name: string;
}

export interface PresetOption {
  label: string;
  value: string;
}
