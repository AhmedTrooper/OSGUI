/**
 * IPC contract — one TypeScript interface per Tauri command declared in
 * `src-tauri/src/commands/{clipboard,config,discovery,inbox,logs,queue}.rs`.
 *
 * The command name (CamelCase) is the canonical identifier used inside
 * `src/utils/ipc.ts`. Argument names match the Rust `#[tauri::command]`
 * parameter names so the resulting JSON envelope lines up 1:1.
 */

import type {
  CookieProfile,
  DownloadJob,
  ErrorLog,
  InboxItem,
  InboxStatus,
  JobRecordPayload,
  ParsedFileRecordPayload,
  ParseLog,
  ProxyProfile,
  SiteConfig,
  UpdateItem,
  UpdatesSchema,
} from "./database.types";
import type { DiscoveryPayload } from "./ytdlp.types";

export interface CommandResult<T> {
  success: boolean;
  message?: string;
  payload?: T;
}

// ── clipboard ─────────────────────────────────────────────────────────────────
export interface ClipboardSanitizeArgs {
  rawInput: string;
}
export interface ClipboardSanitizeResult extends CommandResult<never> {
  sanitized_url?: string;
}

// ── config ────────────────────────────────────────────────────────────────────
export interface UpdateConfigArgs {
  concurrencyLimit?: number;
  downloadChunks?: number;
  downloadPath?: string;
  concurrency_limit?: number;
  chunks?: number;
  path?: string;
}
export type UpdateConfigResult = CommandResult<unknown>;

export interface GetConcurrencyLimitResult extends CommandResult<number> {
  limit: number;
}

export interface GetDownloadChunksResult extends CommandResult<number> {
  chunks: number;
}

// ── discovery ─────────────────────────────────────────────────────────────────
export interface DiscoverAssetMetadataArgs {
  targetUrl: string;
  siteConfigSlug?: string | null;
  site_config_slug?: string | null;
}
export interface DiscoverAssetMetadataResult {
  success: boolean;
  payload: DiscoveryPayload | null;
  error_message: string | null;
}

export interface PaginatedInboxUrls {
  items: InboxItem[];
  total: number;
  pending_count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface GetInboxUrlsArgs {
  page?: number;
  pageSize?: number;
}
export type GetInboxUrlsResult = PaginatedInboxUrls;

export interface GetInboxUrlBySlugArgs {
  slug: string;
}
export type GetInboxUrlBySlugResult = InboxItem | null;

export interface DeleteInboxUrlArgs {
  slug: string;
}
export type DeleteInboxUrlResult = CommandResult<unknown>;

export interface UpdateInboxStatusArgs {
  slug: string;
  status: InboxStatus;
}
export type UpdateInboxStatusResult = CommandResult<unknown>;

// ── logs ──────────────────────────────────────────────────────────────────────
export interface GetErrorLogsResult extends CommandResult<ErrorLog[]> {
  payload: ErrorLog[];
}

export interface GetParseLogsResult extends CommandResult<ParseLog[]> {
  payload: ParseLog[];
}

export type ClearAllLogsResult = CommandResult<unknown>;

// ── queue ─────────────────────────────────────────────────────────────────────
export interface InsertJobRecordArgs {
  payload: JobRecordPayload;
}
export type InsertJobRecordResult = CommandResult<DownloadJob>;

export interface GetAllJobsResult extends CommandResult<DownloadJob[]> {
  payload: DownloadJob[];
}

export interface DeleteJobRecordArgs {
  jobSlug: string;
}
export type DeleteJobRecordResult = CommandResult<unknown>;

export type ClearAllJobsRecordsResult = CommandResult<unknown>;

export interface TriggerJobStartArgs {
  jobSlug: string;
}
export type TriggerJobStartResult = CommandResult<unknown>;

export interface RequestJobPauseArgs {
  jobSlug: string;
}
export type RequestJobPauseResult = CommandResult<unknown>;

export interface RevealJobInExplorerArgs {
  jobSlug: string;
}
export type RevealJobInExplorerResult = CommandResult<unknown>;

export interface RevealFolderInExplorerArgs {
  path: string;
}
export type RevealFolderInExplorerResult = CommandResult<unknown>;

// ── sites ─────────────────────────────────────────────────────────────────────
export type GetSiteConfigsResult = SiteConfig[];

export interface AddSiteConfigArgs {
  title: string;
  domain: string;
  cookieProfileSlug?: string | null;
  proxyProfileSlug?: string | null;
  isDefault?: boolean;
}
export type AddSiteConfigResult = CommandResult<string>;

export interface UpdateSiteConfigArgs {
  slug: string;
  cookieProfileSlug: string | null;
  proxyProfileSlug: string | null;
}
export type UpdateSiteConfigResult = CommandResult<unknown>;

export interface DeleteSiteConfigArgs {
  slug: string;
}
export type DeleteSiteConfigResult = CommandResult<unknown>;

export interface InsertParsedFileArgs {
  payload: ParsedFileRecordPayload;
}
export type InsertParsedFileResult = CommandResult<unknown>;

// ── cookie profiles ───────────────────────────────────────────────────────────
export type GetCookieProfilesResult = CookieProfile[];

export interface AddCookieProfileArgs {
  title: string;
  domain: string;
  cookieData: string;
}
export type AddCookieProfileResult = CommandResult<string>;

export interface UpdateCookieDataArgs {
  slug: string;
  cookieData: string;
}
export type UpdateCookieDataResult = CommandResult<unknown>;

export interface DeleteCookieProfileArgs {
  slug: string;
}
export type DeleteCookieProfileResult = CommandResult<unknown>;

export interface BatchDeleteCookieProfilesArgs {
  slugs: string[];
}
export type BatchDeleteCookieProfilesResult = CommandResult<unknown>;

// ── proxy profiles ────────────────────────────────────────────────────────────
export type GetProxyProfilesResult = ProxyProfile[];

export interface AddProxyProfileArgs {
  title: string;
  proxyString: string;
}
export type AddProxyProfileResult = CommandResult<string>;

export interface UpdateProxyDataArgs {
  slug: string;
  proxyString: string;
}
export type UpdateProxyDataResult = CommandResult<unknown>;

export interface DeleteProxyProfileArgs {
  slug: string;
}
export type DeleteProxyProfileResult = CommandResult<unknown>;

export interface BatchDeleteProxyProfilesArgs {
  slugs: string[];
}
export type BatchDeleteProxyProfilesResult = CommandResult<unknown>;

// ── updates / app info ───────────────────────────────────────────────────────
export type GetOnlineUpdatesResult = UpdatesSchema;
export type GetLocalUpdatesResult = UpdatesSchema;

export interface GetActiveApiPortResult extends CommandResult<number> {
  port: number;
}

export type UpdateItemSnapshot = UpdateItem;
