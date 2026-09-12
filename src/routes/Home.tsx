import { onMount, createSignal, Show, type JSX } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Tooltip } from "@kobalte/core/tooltip";
import {
  Play,
  FileDown,
  Link2,
  AlertCircle,
  X,
  GlobeLock,
  ClipboardPaste,
  Folder,
} from "lucide-solid";
import { useUIStore } from "@/store/useUIStore";
import { useParseStore } from "@/store/useParseStore";
import { useQueueStore } from "@/store/useQueueStore";
import { ipc } from "@/utils/ipc";
import { isTauri } from "@/utils/tauri";
import { sanitizeTitle } from "@/utils/sanitize";
import { logErrorToDb, logParseToDb } from "@/core/logger";
import type { SiteConfig, DownloadJob } from "@/core/types/database.types";
import { isPlaylistPayload, type DiscoveryPayload } from "@/core/types/ytdlp.types";
import { CustomSelect } from "@/components/CustomSelect";

export default function Home(): JSX.Element {
  const navigate = useNavigate();

  const [url, setUrl] = createSignal("");
  const [directDownload, setDirectDownload] = createSignal(false);
  const [loading, setLoading] = createSignal(false);
  const [errorMsg, setErrorMsg] = createSignal("");
  const [siteConfigs, setSiteConfigs] = createSignal<SiteConfig[]>([]);
  const [selectedSiteSlug, setSelectedSiteSlug] = createSignal<string>("");

  onMount(() => {
    useUIStore.setActivePath("/");
    void (async () => {
      try {
        const configs = await ipc.getSiteConfigs();
        setSiteConfigs(configs);
        const defaultCfg = configs.find((c) => c.is_default);
        if (defaultCfg) {
          setSelectedSiteSlug(defaultCfg.slug);
        }
      } catch (e) {
        await logErrorToDb(String(e), "fetchConfigs");
      }
    })();
  });

  const handlePasteClipboard = async (): Promise<void> => {
    try {
      const text = await ipc.readClipboardText();
      if (text.trim()) {
        setUrl(text.trim());
      }
    } catch (e) {
      console.warn("Failed to read clipboard:", e);
    }
  };

  const sanitizeUrl = async (raw: string): Promise<string> => {
    try {
      const cleanRes = await ipc.processClipboardPaste({ rawInput: raw });
      if (cleanRes.success && cleanRes.sanitized_url) {
        return cleanRes.sanitized_url;
      }
    } catch (e) {
      await logErrorToDb(String(e), "process_clipboard_paste");
    }
    return raw;
  };

  const handleAction = async (e: Event): Promise<void> => {
    e.preventDefault();
    const trimmed = url().trim();
    if (!trimmed) {
      setErrorMsg("Please enter a valid media link or web URL.");
      return;
    }

    setErrorMsg("");
    setLoading(true);

    try {
      const cleanUrl = await sanitizeUrl(trimmed);

      // Direct Download Mode
      if (directDownload()) {
        let domain = "web";
        try {
          domain = new URL(cleanUrl).hostname.replace("www.", "");
        } catch {
          // ignore parsing error for domain
        }

        const uniqueSlug = `doc-${Date.now()}`;
        const newJob: DownloadJob = {
          slug: uniqueSlug,
          name: `Direct Document (${domain})`,
          url: cleanUrl,
          progress: 0,
          status: "pending",
          message: "Queued for direct document parsing...",
          fileType: "direct_document",
          createdAt: new Date().toISOString(),
        };

        useQueueStore.addJob(newJob);

        if (isTauri()) {
          try {
            const insertRes = await ipc.insertJobRecord({
              payload: {
                slug: newJob.slug,
                url: newJob.url,
                file_type: newJob.fileType,
                format_string: "bestvideo+bestaudio/best",
                download_path: useUIStore.state.downloadPath,
                created_at: newJob.createdAt,
                site_config_slug: selectedSiteSlug() || null,
              },
            });
            if (!insertRes.success) {
              throw new Error(insertRes.message ?? "Failed to insert job record.");
            }
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            await logErrorToDb(msg, "insert_job_record_direct", newJob.slug);
            throw new Error(msg || "Failed to create download job in database.");
          }
        }

        try {
          const res = await ipc.triggerJobStart({ jobSlug: uniqueSlug });
          if (!res.success) {
            throw new Error(res.message ?? "Failed to trigger download start.");
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          await logErrorToDb(msg, "trigger_job_start_direct", uniqueSlug);
          useQueueStore.updateJobStatus(uniqueSlug, "error");
          useQueueStore.updateJobProgress(
            uniqueSlug,
            0,
            msg || "Failed to start native download worker.",
          );
        }

        navigate("/downloads");
        return;
      }

      // Metadata Extraction Mode
      useParseStore.setParsing(true);
      const startedAt = new Date().toISOString();
      const startTime = Date.now();

      let payload: DiscoveryPayload | null = null;
      try {
        const discoverRes = await ipc.discoverAssetMetadata({
          targetUrl: cleanUrl,
          siteConfigSlug: selectedSiteSlug() || null,
        });

        if (discoverRes.success && discoverRes.payload) {
          payload = discoverRes.payload;
          await logParseToDb(
            payload.id || `file-${Date.now()}`,
            "success",
            startedAt,
            new Date().toISOString(),
            Date.now() - startTime,
            `yt-dlp --dump-single-json ${cleanUrl}`,
            0,
            JSON.stringify(payload).length,
          );
        } else {
          throw new Error(discoverRes.error_message || "Metadata extraction probe rejected URL.");
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await logParseToDb(
          "unknown_target",
          "failed",
          startedAt,
          new Date().toISOString(),
          Date.now() - startTime,
          `yt-dlp --dump-single-json ${cleanUrl}`,
          1,
          0,
        );
        await logErrorToDb(msg, "discover_asset_metadata");
        throw e;
      }

      if (!payload) {
        throw new Error("No metadata returned for the provided URL.");
      }

      const isPlaylist = isPlaylistPayload(payload);
      const titleText = payload.title || "Untitled Extraction Target";
      const parsedFile = {
        slug: payload.id || `file-${Date.now()}`,
        url: cleanUrl,
        title: titleText,
        sanitizedTitle: sanitizeTitle(titleText),
        isPlaylist,
        thumbnail:
          ("thumbnail" in payload && payload.thumbnail) || payload.thumbnails?.[0]?.url || "",
        duration: "duration" in payload && payload.duration !== undefined ? payload.duration : 0,
        author:
          ("uploader" in payload && payload.uploader) ||
          ("channel" in payload && payload.channel) ||
          "External Publisher",
        views: ("view_count" in payload && payload.view_count) || 0,
        payload,
        parsedAt: new Date().toISOString(),
        ...(selectedSiteSlug() ? { siteConfigSlug: selectedSiteSlug() } : {}),
      };

      useParseStore.addParsedFile(parsedFile);

      if (isTauri()) {
        try {
          await ipc.insertParsedFile({
            payload: {
              slug: parsedFile.slug,
              url: parsedFile.url,
              title: parsedFile.title,
              sanitized_title: parsedFile.sanitizedTitle,
              is_playlist: parsedFile.isPlaylist ? 1 : 0,
              parent_playlist_slug: null,
              playlist_name: parsedFile.isPlaylist ? parsedFile.title : null,
              sanitized_playlist_name: parsedFile.isPlaylist ? parsedFile.sanitizedTitle : null,
              json_metadata: JSON.stringify(payload),
              created_at: parsedFile.parsedAt,
              site_config_slug: selectedSiteSlug() || null,
            },
          });
        } catch (e) {
          await logErrorToDb(String(e), "insert_parsed_file", parsedFile.slug);
        }
      }

      navigate(`/parsed_file/${parsedFile.slug}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await logErrorToDb(msg, "home_action_failure");
      setErrorMsg(msg || "Failed to process the URL.");
    } finally {
      setLoading(false);
      useParseStore.setParsing(false);
    }
  };

  const selectedConfig = (): SiteConfig | undefined =>
    siteConfigs().find((c) => c.slug === selectedSiteSlug());

  return (
    <div class="w-full max-w-3xl mx-auto space-y-6 select-none animate-fade-in text-xs sm:text-sm font-sans px-2 sm:px-4 py-2">
      {/* Title / Header Bar */}
      <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800 gap-3">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 flex items-center justify-center bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-500/20 shadow-sm">
            <FileDown class="w-4 h-4" />
          </div>
          <div>
            <h1 class="text-sm sm:text-base font-bold text-zinc-900 dark:text-white tracking-tight">
              Task Controller
            </h1>
            <p class="text-[11px] text-zinc-500 dark:text-zinc-400">
              Analyze media metadata or start direct background downloads.
            </p>
          </div>
        </div>

        {/* Destination Path indicator */}
        <Tooltip openDelay={200} placement="left">
          <Tooltip.Trigger
            as="button"
            type="button"
            onClick={() => navigate("/settings")}
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors cursor-pointer text-[11px] self-start sm:self-auto"
          >
            <Folder class="w-3.5 h-3.5 text-zinc-400" />
            <span class="truncate max-w-[220px]">
              {useUIStore.state.downloadPath || "~/Downloads"}
            </span>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
              <Tooltip.Arrow />
              Download Destination (Click to change in Settings)
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip>
      </div>

      {/* Main Form Card */}
      <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/40 p-5 sm:p-6 rounded-2xl shadow-sm">
        <form onSubmit={handleAction} class="space-y-5">
          {/* Resource URL Input */}
          <div class="space-y-2 text-left">
            <label for="media-url-input" class="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Resource URL
            </label>

            <div class="relative flex items-center group">
              <div class="absolute left-3.5 text-zinc-400 group-focus-within:text-blue-500 dark:text-zinc-500 dark:group-focus-within:text-blue-400 transition-colors pointer-events-none">
                <Link2 class="w-4 h-4" />
              </div>

              <input
                id="media-url-input"
                type="url"
                placeholder="Paste media link, video URL, playlist, or file URL..."
                value={url()}
                onInput={(e) => setUrl(e.currentTarget.value)}
                disabled={loading()}
                class="w-full pl-10 pr-10 py-2.5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-950 focus:ring-2 focus:ring-blue-500/10 transition-all outline-none text-xs sm:text-sm text-zinc-900 dark:text-white shadow-inner font-sans font-medium"
              />

              <Show
                when={url()}
                fallback={
                  <Tooltip openDelay={200} placement="left">
                    <Tooltip.Trigger
                      as="button"
                      type="button"
                      onClick={() => {
                        void handlePasteClipboard();
                      }}
                      class="absolute right-3 p-1.5 rounded-md text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-500/10 transition-colors cursor-pointer"
                    >
                      <ClipboardPaste class="w-4 h-4" />
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                        <Tooltip.Arrow />
                        Paste from Clipboard
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip>
                }
              >
                <Tooltip openDelay={200} placement="left">
                  <Tooltip.Trigger
                    as="button"
                    type="button"
                    onClick={() => setUrl("")}
                    class="absolute right-3 p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                  >
                    <X class="w-4 h-4" />
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                      <Tooltip.Arrow />
                      Clear URL
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip>
              </Show>
            </div>
          </div>

          {/* Download Mode Selection */}
          <div class="space-y-2 text-left">
            <span class="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Download Mode
            </span>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Mode 1: Metadata Extraction */}
              <button
                type="button"
                onClick={() => setDirectDownload(false)}
                disabled={loading()}
                class={`flex flex-col items-start text-left p-3.5 rounded-xl border transition-all relative overflow-hidden cursor-pointer ${
                  !directDownload()
                    ? "border-blue-500/80 bg-blue-500/[0.04] dark:bg-blue-500/[0.06] text-zinc-900 dark:text-white shadow-sm ring-1 ring-blue-500/30"
                    : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/20 text-zinc-500 dark:text-zinc-400"
                }`}
              >
                <div class="flex items-center gap-2 mb-1">
                  <div
                    class={`p-1.5 rounded-lg ${
                      !directDownload()
                        ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    <Play class="w-3.5 h-3.5" />
                  </div>
                  <span class="text-xs font-bold">Metadata Analysis</span>
                </div>
                <p class="text-[11px] text-zinc-400 dark:text-zinc-500 leading-normal pl-0.5">
                  Inspect video qualities, audio formats, and subtitles before queueing.
                </p>
              </button>

              {/* Mode 2: Direct Downloader */}
              <button
                type="button"
                onClick={() => setDirectDownload(true)}
                disabled={loading()}
                class={`flex flex-col items-start text-left p-3.5 rounded-xl border transition-all relative overflow-hidden cursor-pointer ${
                  directDownload()
                    ? "border-blue-500/80 bg-blue-500/[0.04] dark:bg-blue-500/[0.06] text-zinc-900 dark:text-white shadow-sm ring-1 ring-blue-500/30"
                    : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/20 text-zinc-500 dark:text-zinc-400"
                }`}
              >
                <div class="flex items-center gap-2 mb-1">
                  <div
                    class={`p-1.5 rounded-lg ${
                      directDownload()
                        ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    <FileDown class="w-3.5 h-3.5" />
                  </div>
                  <span class="text-xs font-bold">Direct Queue</span>
                </div>
                <p class="text-[11px] text-zinc-400 dark:text-zinc-500 leading-normal pl-0.5">
                  Bypass parameter analysis and download immediately with best quality.
                </p>
              </button>
            </div>
          </div>

          {/* Site Profile Picker */}
          <div class="space-y-2 text-left">
            <span class="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Site Profile & Proxy
            </span>
            <CustomSelect
              value={selectedSiteSlug()}
              onChange={setSelectedSiteSlug}
              options={siteConfigs().map((c) => ({
                value: c.slug,
                label: `${c.title} (${c.domain})`,
              }))}
              placeholder="Direct Connection (Default Network Bypass)"
              icon={GlobeLock}
            />

            {/* Active profile summary badge when selected */}
            <Show when={selectedConfig()}>
              {(cfg) => (
                <div class="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                  <span class="font-semibold text-zinc-700 dark:text-zinc-300">
                    {cfg().domain}
                  </span>
                  <span>•</span>
                  <span>
                    Cookies:{" "}
                    <strong class="text-zinc-700 dark:text-zinc-300">
                      {cfg().cookie_profile_slug ? "Enabled" : "None"}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Proxy:{" "}
                    <strong class="text-zinc-700 dark:text-zinc-300">
                      {cfg().proxy_profile_slug ? "Active" : "None"}
                    </strong>
                  </span>
                </div>
              )}
            </Show>
          </div>

          {/* Error Alert Banner */}
          <Show when={errorMsg()}>
            <div class="flex items-start gap-2.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-500/5 dark:bg-red-500/10 border border-red-500/20 p-3.5 rounded-xl animate-fade-in text-left">
              <AlertCircle class="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div class="flex-1 min-w-0">
                <div class="font-bold">Extraction Error</div>
                <div class="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5 break-words">
                  {errorMsg()}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setErrorMsg("")}
                class="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
              >
                <X class="w-3.5 h-3.5" />
              </button>
            </div>
          </Show>

          {/* Submit Action Button */}
          <div class="pt-2">
            <button
              type="submit"
              disabled={loading() || !url().trim()}
              class="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-3 px-5 rounded-xl shadow-sm hover:shadow transition-all active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none min-h-[44px] tracking-wide uppercase cursor-pointer"
            >
              <Show
                when={loading()}
                fallback={
                  <>
                    <Show when={directDownload()} fallback={<Play class="w-4 h-4" />}>
                      <FileDown class="w-4 h-4" />
                    </Show>
                    <span>
                      {directDownload() ? "Start Direct Download" : "Analyze Resource"}
                    </span>
                  </>
                }
              >
                <span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </Show>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
