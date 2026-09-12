/**
 * Typed wrapper around `@tauri-apps/api/core#invoke`.
 *
 * Every IPC call in the application flows through here so the contract
 * stays in one file. Browser-preview builds return safe mock data
 * through `previewMock()` to keep Storybook / `vite preview` happy.
 */

import { invoke } from "@tauri-apps/api/core";
import {
  readText as tauriReadText,
  writeText as tauriWriteText,
} from "@tauri-apps/plugin-clipboard-manager";
import { isTauri } from "./tauri";
import type {
  AddCookieProfileArgs,
  AddCookieProfileResult,
  AddProxyProfileArgs,
  AddProxyProfileResult,
  AddSiteConfigArgs,
  AddSiteConfigResult,
  BatchDeleteCookieProfilesArgs,
  BatchDeleteCookieProfilesResult,
  BatchDeleteProxyProfilesArgs,
  BatchDeleteProxyProfilesResult,
  ClearAllJobsRecordsResult,
  ClearAllLogsResult,
  ClipboardSanitizeArgs,
  ClipboardSanitizeResult,
  DeleteCookieProfileArgs,
  DeleteCookieProfileResult,
  DeleteInboxUrlArgs,
  DeleteInboxUrlResult,
  DeleteJobRecordArgs,
  DeleteJobRecordResult,
  DeleteProxyProfileArgs,
  DeleteProxyProfileResult,
  DeleteSiteConfigArgs,
  DeleteSiteConfigResult,
  DiscoverAssetMetadataArgs,
  DiscoverAssetMetadataResult,
  GetActiveApiPortResult,
  GetAllJobsResult,
  GetConcurrencyLimitResult,
  GetCookieProfilesResult,
  GetDownloadChunksResult,
  GetErrorLogsResult,
  GetInboxUrlBySlugArgs,
  GetInboxUrlBySlugResult,
  GetInboxUrlsArgs,
  GetInboxUrlsResult,
  GetLocalUpdatesResult,
  GetOnlineUpdatesResult,
  GetParseLogsResult,
  GetProxyProfilesResult,
  GetSiteConfigsResult,
  InsertJobRecordArgs,
  InsertJobRecordResult,
  InsertParsedFileArgs,
  InsertParsedFileResult,
  RequestJobPauseArgs,
  RequestJobPauseResult,
  RevealFolderInExplorerArgs,
  RevealFolderInExplorerResult,
  RevealJobInExplorerArgs,
  RevealJobInExplorerResult,
  TriggerJobStartArgs,
  TriggerJobStartResult,
  UpdateConfigArgs,
  UpdateConfigResult,
  UpdateCookieDataArgs,
  UpdateCookieDataResult,
  UpdateInboxStatusArgs,
  UpdateInboxStatusResult,
  UpdateProxyDataArgs,
  UpdateProxyDataResult,
  UpdateSiteConfigArgs,
  UpdateSiteConfigResult,
} from "@/core/types/ipc.types";

/** Build an `ApiResult`-shaped success envelope for browser preview mocks. */
const mockOk = <T>(payload?: T): { success: true; message: string } & { payload?: T } => ({
  success: true,
  message: "browser preview mock",
  ...(payload === undefined ? {} : { payload }),
});

/**
 * Internal helper — invokes a Tauri command with typed args. Args are
 * widened to `Record<string, unknown>` to satisfy Tauri's invoke
 * signature without losing the outer type contract enforced by callers.
 */
const callTauri = <T>(cmd: string, args: Record<string, unknown> = {}): Promise<T> =>
  invoke<T>(cmd, args as unknown as Record<string, unknown>);

/**
 * Runtime guard for raw `invoke` calls — refuses to execute anything
 * against the OS bridge outside of Tauri.
 */
export const ipcInvoke = async <T>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
  if (!isTauri()) {
    throw new Error(`ipcInvoke('${cmd}') called outside Tauri runtime`);
  }
  return invoke<T>(cmd, args);
};

export const ipc = {
  // ── clipboard ────────────────────────────────────────────────────────────
  processClipboardPaste: async (args: ClipboardSanitizeArgs): Promise<ClipboardSanitizeResult> => {
    if (!isTauri()) {
      return { success: true, sanitized_url: args.rawInput.trim() };
    }
    return callTauri<ClipboardSanitizeResult>(
      "process_clipboard_paste",
      args as unknown as Record<string, unknown>,
    );
  },

  /**
   * Read plain text from the system clipboard.
   *
   * Prefers the Tauri `clipboard-manager` plugin when running inside
   * the desktop shell (works in WebView, no permission prompt), and
   * falls back to the browser `navigator.clipboard` API otherwise so
   * `vite preview` / Storybook keep working.
   */
  readClipboardText: async (): Promise<string> => {
    if (isTauri()) {
      try {
        return await tauriReadText();
      } catch (err) {
        console.warn("Tauri clipboard read failed, falling back to browser API:", err);
      }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      return navigator.clipboard.readText();
    }
    return "";
  },

  /**
   * Write plain text to the system clipboard.
   *
   * Same fallback strategy as `readClipboardText`: Tauri plugin first,
   * browser API when running outside the desktop shell.
   */
  writeClipboardText: async (text: string): Promise<void> => {
    if (isTauri()) {
      try {
        await tauriWriteText(text);
        return;
      } catch (err) {
        console.warn("Tauri clipboard write failed, falling back to browser API:", err);
      }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    }
  },

  // ── config ───────────────────────────────────────────────────────────────
  getConcurrencyLimit: async (): Promise<GetConcurrencyLimitResult> => {
    if (!isTauri()) {
      return { ...mockOk(3), limit: 3 };
    }
    const res = await callTauri<number | { limit: number }>("get_concurrency_limit");
    const limit = typeof res === "number" ? res : (res?.limit ?? 3);
    return { ...mockOk(limit), limit };
  },

  getDownloadChunks: async (): Promise<GetDownloadChunksResult> => {
    if (!isTauri()) {
      return { ...mockOk(1), chunks: 1 };
    }
    const res = await callTauri<number | { chunks: number }>("get_download_chunks");
    const chunks = typeof res === "number" ? res : (res?.chunks ?? 1);
    return { ...mockOk(chunks), chunks };
  },

  updateConfig: async (args: UpdateConfigArgs): Promise<UpdateConfigResult> => {
    if (!isTauri()) {
      return mockOk();
    }
    if (args.concurrency_limit !== undefined) {
      await callTauri("update_concurrency_limit", { limit: args.concurrency_limit });
    }
    if (args.chunks !== undefined) {
      await callTauri("update_download_chunks", { chunks: args.chunks });
    }
    if (args.path !== undefined) {
      await callTauri("update_download_path", { path: args.path });
    }
    return mockOk();
  },

  // ── discovery ────────────────────────────────────────────────────────────
  discoverAssetMetadata: (args: DiscoverAssetMetadataArgs): Promise<DiscoverAssetMetadataResult> =>
    isTauri()
      ? callTauri<DiscoverAssetMetadataResult>(
          "discover_asset_metadata",
          args as unknown as Record<string, unknown>,
        )
      : Promise.resolve({ success: true, payload: null, error_message: null }),

  // ── inbox ─────────────────────────────────────────────────────────────────
  getInboxUrls: (args?: GetInboxUrlsArgs): Promise<GetInboxUrlsResult> =>
    isTauri()
      ? callTauri<GetInboxUrlsResult>("get_inbox_urls", args as unknown as Record<string, unknown>)
      : Promise.resolve({
          items: [],
          total: 0,
          pending_count: 0,
          page: 1,
          page_size: 15,
          total_pages: 1,
        }),

  getInboxUrlBySlug: (args: GetInboxUrlBySlugArgs): Promise<GetInboxUrlBySlugResult> =>
    isTauri()
      ? callTauri<GetInboxUrlBySlugResult>(
          "get_inbox_url_by_slug",
          args as unknown as Record<string, unknown>,
        )
      : Promise.resolve(null),

  deleteInboxUrl: (args: DeleteInboxUrlArgs): Promise<DeleteInboxUrlResult> =>
    isTauri()
      ? callTauri<DeleteInboxUrlResult>(
          "delete_inbox_url",
          args as unknown as Record<string, unknown>,
        )
      : Promise.resolve(mockOk()),

  updateInboxStatus: (args: UpdateInboxStatusArgs): Promise<UpdateInboxStatusResult> =>
    isTauri()
      ? callTauri<UpdateInboxStatusResult>(
          "update_inbox_status",
          args as unknown as Record<string, unknown>,
        )
      : Promise.resolve(mockOk()),

  // ── logs ──────────────────────────────────────────────────────────────────
  getErrorLogs: (): Promise<GetErrorLogsResult> =>
    isTauri()
      ? callTauri<GetErrorLogsResult>("get_error_logs")
      : Promise.resolve({ ...mockOk([]), payload: [] }),

  getParseLogs: (): Promise<GetParseLogsResult> =>
    isTauri()
      ? callTauri<GetParseLogsResult>("get_parse_logs")
      : Promise.resolve({ ...mockOk([]), payload: [] }),

  clearAllLogs: (): Promise<ClearAllLogsResult> =>
    isTauri() ? callTauri<ClearAllLogsResult>("clear_all_logs") : Promise.resolve(mockOk()),

  // ── queue ─────────────────────────────────────────────────────────────────
  insertJobRecord: (args: InsertJobRecordArgs): Promise<InsertJobRecordResult> =>
    isTauri()
      ? callTauri<InsertJobRecordResult>(
          "insert_job_record",
          args as unknown as Record<string, unknown>,
        )
      : Promise.resolve(mockOk()),

  getAllJobs: (): Promise<GetAllJobsResult> =>
    isTauri()
      ? callTauri<GetAllJobsResult>("get_all_jobs")
      : Promise.resolve({ ...mockOk([]), payload: [] }),

  deleteJobRecord: (args: DeleteJobRecordArgs): Promise<DeleteJobRecordResult> =>
    isTauri()
      ? callTauri<DeleteJobRecordResult>(
          "delete_job_record",
          args as unknown as Record<string, unknown>,
        )
      : Promise.resolve(mockOk()),

  clearAllJobsRecords: (): Promise<ClearAllJobsRecordsResult> =>
    isTauri()
      ? callTauri<ClearAllJobsRecordsResult>("clear_all_jobs_records")
      : Promise.resolve(mockOk()),

  triggerJobStart: (args: TriggerJobStartArgs): Promise<TriggerJobStartResult> =>
    isTauri()
      ? callTauri<TriggerJobStartResult>(
          "trigger_job_start",
          args as unknown as Record<string, unknown>,
        )
      : Promise.resolve(mockOk()),

  requestJobPause: (args: RequestJobPauseArgs): Promise<RequestJobPauseResult> =>
    isTauri()
      ? callTauri<RequestJobPauseResult>(
          "request_job_pause",
          args as unknown as Record<string, unknown>,
        )
      : Promise.resolve(mockOk()),

  revealJobInExplorer: (args: RevealJobInExplorerArgs): Promise<RevealJobInExplorerResult> =>
    isTauri()
      ? callTauri<RevealJobInExplorerResult>(
          "reveal_job_in_explorer",
          args as unknown as Record<string, unknown>,
        )
      : Promise.resolve(mockOk()),

  revealFolderInExplorer: (
    args: RevealFolderInExplorerArgs,
  ): Promise<RevealFolderInExplorerResult> =>
    isTauri()
      ? callTauri<RevealFolderInExplorerResult>(
          "reveal_folder_in_explorer",
          args as unknown as Record<string, unknown>,
        )
      : Promise.resolve(mockOk()),

  // ── sites / parsed files ─────────────────────────────────────────────────
  getSiteConfigs: (): Promise<GetSiteConfigsResult> =>
    isTauri() ? callTauri<GetSiteConfigsResult>("get_site_configs") : Promise.resolve([]),

  addSiteConfig: (args: AddSiteConfigArgs): Promise<AddSiteConfigResult> =>
    isTauri()
      ? callTauri<AddSiteConfigResult>(
          "add_site_config",
          args as unknown as Record<string, unknown>,
        )
      : Promise.resolve(mockOk()),

  updateSiteConfig: (args: UpdateSiteConfigArgs): Promise<UpdateSiteConfigResult> =>
    isTauri()
      ? callTauri<UpdateSiteConfigResult>(
          "update_site_config",
          args as unknown as Record<string, unknown>,
        )
      : Promise.resolve(mockOk()),

  deleteSiteConfig: (args: DeleteSiteConfigArgs): Promise<DeleteSiteConfigResult> =>
    isTauri()
      ? callTauri<DeleteSiteConfigResult>(
          "delete_site_config",
          args as unknown as Record<string, unknown>,
        )
      : Promise.resolve(mockOk()),

  insertParsedFile: (args: InsertParsedFileArgs): Promise<InsertParsedFileResult> =>
    isTauri()
      ? callTauri<InsertParsedFileResult>(
          "insert_parsed_file",
          args as unknown as Record<string, unknown>,
        )
      : Promise.resolve(mockOk()),

  // ── cookie profiles ────────────────────────────────────────────────────────
  getCookieProfiles: (): Promise<GetCookieProfilesResult> =>
    isTauri() ? callTauri<GetCookieProfilesResult>("get_cookie_profiles") : Promise.resolve([]),

  addCookieProfile: (args: AddCookieProfileArgs): Promise<AddCookieProfileResult> =>
    isTauri()
      ? callTauri<AddCookieProfileResult>(
          "add_cookie_profile",
          args as unknown as Record<string, unknown>,
        )
      : Promise.resolve(mockOk("mock_cookie_slug")),

  updateCookieData: (args: UpdateCookieDataArgs): Promise<UpdateCookieDataResult> =>
    isTauri()
      ? callTauri<UpdateCookieDataResult>(
          "update_cookie_data",
          args as unknown as Record<string, unknown>,
        )
      : Promise.resolve(mockOk()),

  deleteCookieProfile: (args: DeleteCookieProfileArgs): Promise<DeleteCookieProfileResult> =>
    isTauri()
      ? callTauri<DeleteCookieProfileResult>(
          "delete_cookie_profile",
          args as unknown as Record<string, unknown>,
        )
      : Promise.resolve(mockOk()),

  batchDeleteCookieProfiles: (
    args: BatchDeleteCookieProfilesArgs,
  ): Promise<BatchDeleteCookieProfilesResult> =>
    isTauri()
      ? callTauri<BatchDeleteCookieProfilesResult>(
          "batch_delete_cookie_profiles",
          args as unknown as Record<string, unknown>,
        )
      : Promise.resolve(mockOk()),

  // ── proxy profiles ─────────────────────────────────────────────────────────
  getProxyProfiles: (): Promise<GetProxyProfilesResult> =>
    isTauri() ? callTauri<GetProxyProfilesResult>("get_proxy_profiles") : Promise.resolve([]),

  addProxyProfile: (args: AddProxyProfileArgs): Promise<AddProxyProfileResult> =>
    isTauri()
      ? callTauri<AddProxyProfileResult>(
          "add_proxy_profile",
          args as unknown as Record<string, unknown>,
        )
      : Promise.resolve(mockOk("mock_proxy_slug")),

  updateProxyData: (args: UpdateProxyDataArgs): Promise<UpdateProxyDataResult> =>
    isTauri()
      ? callTauri<UpdateProxyDataResult>(
          "update_proxy_data",
          args as unknown as Record<string, unknown>,
        )
      : Promise.resolve(mockOk()),

  deleteProxyProfile: (args: DeleteProxyProfileArgs): Promise<DeleteProxyProfileResult> =>
    isTauri()
      ? callTauri<DeleteProxyProfileResult>(
          "delete_proxy_profile",
          args as unknown as Record<string, unknown>,
        )
      : Promise.resolve(mockOk()),

  batchDeleteProxyProfiles: (
    args: BatchDeleteProxyProfilesArgs,
  ): Promise<BatchDeleteProxyProfilesResult> =>
    isTauri()
      ? callTauri<BatchDeleteProxyProfilesResult>(
          "batch_delete_proxy_profiles",
          args as unknown as Record<string, unknown>,
        )
      : Promise.resolve(mockOk()),

  // ── updates / app info ───────────────────────────────────────────────────
  getOnlineUpdates: (): Promise<GetOnlineUpdatesResult> =>
    isTauri()
      ? callTauri<GetOnlineUpdatesResult>("get_online_updates")
      : Promise.reject(new Error("offline")),

  getLocalUpdates: (): Promise<GetLocalUpdatesResult> =>
    isTauri()
      ? callTauri<GetLocalUpdatesResult>("get_local_updates")
      : Promise.reject(new Error("offline")),

  getActiveApiPort: async (): Promise<GetActiveApiPortResult> => {
    if (!isTauri()) return { ...mockOk(14221), port: 14221 };
    const rawPort = await callTauri<number>("get_active_api_port");
    return { ...mockOk(rawPort), port: rawPort };
  },
} as const;
