import { onMount, createSignal, Show, type JSX } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Tooltip } from "@kobalte/core/tooltip";
import {
  Play,
  FileDown,
  Link2,
  AlertCircle,
  X,
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
import { SiteProfilePicker } from "@/features/home/components/SiteProfilePicker";

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

  return (
    <div class="w-full max-w-2xl mx-auto space-y-5 select-none animate-fade-in text-xs sm:text-sm font-sans px-2 sm:px-4 py-2">
      {/* Title / Header Bar */}
      <div class="flex items-center justify-between pb-3 border-b border-zinc-200/80 dark:border-zinc-800 gap-3">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 flex items-center justify-center bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-500/20 shadow-xs">
            <FileDown class="w-4 h-4" />
          </div>
          <div>
            <h1 class="text-sm font-bold text-zinc-900 dark:text-white tracking-tight">
              Task Controller
            </h1>
            <p class="text-[11px] text-zinc-500 dark:text-zinc-400">
              Download media assets, playlists, or direct file streams.
            </p>
          </div>
        </div>

        {/* Destination Path indicator */}
        <Tooltip openDelay={200} placement="left">
          <Tooltip.Trigger
            as="button"
            type="button"
            onClick={() => navigate("/settings")}
            class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors cursor-pointer text-[11px]"
          >
            <Folder class="w-3.5 h-3.5 text-zinc-400" />
            <span class="truncate max-w-[180px]">
              {useUIStore.state.downloadPath || "~/Downloads"}
            </span>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
              <Tooltip.Arrow />
              Destination folder (Change in Settings)
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip>
      </div>

      {/* Main Task Card */}
      <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/40 p-4 sm:p-5 rounded-2xl shadow-xs space-y-4">
        <form onSubmit={handleAction} class="space-y-4">
          {/* Resource URL Input */}
          <div class="space-y-1.5 text-left">
            <label for="media-url-input" class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Media Link or Resource URL
            </label>

            <div class="relative flex items-center group">
              <div class="absolute left-3 text-zinc-400 group-focus-within:text-blue-500 dark:text-zinc-500 dark:group-focus-within:text-blue-400 transition-colors pointer-events-none">
                <Link2 class="w-4 h-4" />
              </div>

              <input
                id="media-url-input"
                type="url"
                placeholder="https://..."
                value={url()}
                onInput={(e) => setUrl(e.currentTarget.value)}
                disabled={loading()}
                class="w-full pl-9 pr-9 py-2 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-950 focus:ring-2 focus:ring-blue-500/10 transition-all outline-none text-xs text-zinc-900 dark:text-white shadow-2xs font-mono"
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
                      class="absolute right-2.5 p-1 rounded-md text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-500/10 transition-colors cursor-pointer"
                    >
                      <ClipboardPaste class="w-3.5 h-3.5" />
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                        <Tooltip.Arrow />
                        Paste from clipboard
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
                    class="absolute right-2.5 p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                  >
                    <X class="w-3.5 h-3.5" />
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                      <Tooltip.Arrow />
                      Clear
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip>
              </Show>
            </div>
          </div>

          {/* Desktop Native Segmented Switch: Download Mode */}
          <div class="space-y-1.5 text-left">
            <span class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Download Strategy
            </span>
            <div class="grid grid-cols-2 p-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl gap-1">
              {/* Option 1: Analysis */}
              <button
                type="button"
                onClick={() => setDirectDownload(false)}
                disabled={loading()}
                class={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  !directDownload()
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs"
                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                <Play class="w-3.5 h-3.5" />
                <span>Metadata Analysis</span>
              </button>

              {/* Option 2: Direct Download */}
              <button
                type="button"
                onClick={() => setDirectDownload(true)}
                disabled={loading()}
                class={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  directDownload()
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs"
                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                <FileDown class="w-3.5 h-3.5" />
                <span>Direct Queue</span>
              </button>
            </div>
            <p class="text-[11px] text-zinc-400 dark:text-zinc-500">
              {directDownload()
                ? "Directly adds to download queue and fetches with best available quality."
                : "Probes metadata, formats, audio codecs, and subtitles before queueing."}
            </p>
          </div>

          {/* Site Profile and Proxy Picker */}
          <div class="space-y-1.5 text-left">
            <div class="flex items-center justify-between">
              <span class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Network Rule & Proxy Profile
              </span>
              <button
                type="button"
                onClick={() => navigate("/sites_config")}
                class="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Manage
              </button>
            </div>

            <SiteProfilePicker
              configs={siteConfigs()}
              selectedSlug={selectedSiteSlug()}
              onSelect={setSelectedSiteSlug}
              onManageClick={() => navigate("/sites_config")}
            />
          </div>

          {/* Error Alert Banner */}
          <Show when={errorMsg()}>
            <div class="flex items-start gap-2.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-500/5 dark:bg-red-500/10 border border-red-500/20 p-3 rounded-xl animate-fade-in text-left">
              <AlertCircle class="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div class="flex-1 min-w-0">
                <div class="font-bold">Extraction Failed</div>
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
          <div class="pt-1">
            <button
              type="submit"
              disabled={loading() || !url().trim()}
              class="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs hover:shadow transition-all active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none tracking-wide cursor-pointer"
            >
              <Show
                when={loading()}
                fallback={
                  <>
                    <Show when={directDownload()} fallback={<Play class="w-3.5 h-3.5" />}>
                      <FileDown class="w-3.5 h-3.5" />
                    </Show>
                    <span>
                      {directDownload() ? "Enqueue & Start Download" : "Analyze Resource"}
                    </span>
                  </>
                }
              >
                <span class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Extracting Parameters...</span>
              </Show>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
