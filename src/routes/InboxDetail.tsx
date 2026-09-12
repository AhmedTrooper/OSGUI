import { onMount, createSignal, Show, type JSX } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { AdaptiveTooltip } from "@/components/AdaptiveTooltip";
import {
  Link2,
  AlertCircle,
  ArrowLeft,
  Calendar,
  Clock,
  Inbox,
  Copy,
  Check,
  Globe,
} from "lucide-solid";
import { useUIStore } from "@/store/useUIStore";
import { useParseStore } from "@/store/useParseStore";
import { useQueueStore } from "@/store/useQueueStore";
import { ipc } from "@/utils/ipc";
import { isTauri } from "@/utils/tauri";
import { sanitizeTitle } from "@/utils/sanitize";
import { formatDate, formatTime } from "@/utils/format";
import { logErrorToDb, logParseToDb } from "@/core/logger";
import type { SiteConfig, DownloadJob, InboxItem } from "@/core/types/database.types";
import { isPlaylistPayload, type DiscoveryPayload } from "@/core/types/ytdlp.types";
import { SiteProfilePicker } from "@/features/home/components/SiteProfilePicker";

function extractDomain(urlStr: string): string {
  try {
    const parsed = new URL(urlStr);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "external";
  }
}

export default function InboxDetail(): JSX.Element {
  const navigate = useNavigate();
  const params = useParams<{ slug: string }>();

  const [inboxItem, setInboxItem] = createSignal<InboxItem | null>(null);
  const [url, setUrl] = createSignal("");
  const [directDownload, setDirectDownload] = createSignal(false);
  const [loading, setLoading] = createSignal(false);
  const [fetchingDetails, setFetchingDetails] = createSignal(true);
  const [errorMsg, setErrorMsg] = createSignal("");
  const [siteConfigs, setSiteConfigs] = createSignal<SiteConfig[]>([]);
  const [selectedSiteSlug, setSelectedSiteSlug] = createSignal<string>("");
  const [copied, setCopied] = createSignal(false);

  onMount(() => {
    useUIStore.setActivePath("/inbox");
    void (async () => {
      try {
        const configs = await ipc.getSiteConfigs();
        setSiteConfigs(configs);
      } catch (e) {
        await logErrorToDb(String(e), "fetchConfigs_inbox_detail");
      }

      if (isTauri()) {
        try {
          const item = await ipc.getInboxUrlBySlug({ slug: params.slug });
          if (item) {
            setInboxItem(item);
            setUrl(item.url);
          } else {
            setErrorMsg("Inbox link not found in database.");
          }
        } catch (e) {
          console.error(e);
          setErrorMsg("Failed to query inbox link details.");
        } finally {
          setFetchingDetails(false);
        }
      } else {
        setFetchingDetails(false);
        setErrorMsg("Running in browser preview mode.");
      }
    })();
  });

  const handleCopy = async (): Promise<void> => {
    const text = url();
    if (!text) return;
    await ipc.writeClipboardText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const sanitizeUrl = async (raw: string): Promise<string> => {
    if (!isTauri()) return raw;
    try {
      const cleanRes = await ipc.processClipboardPaste({ rawInput: raw });
      if (cleanRes.success && cleanRes.sanitized_url) return cleanRes.sanitized_url;
    } catch (e) {
      await logErrorToDb(String(e), "process_clipboard_paste_inbox");
    }
    return raw;
  };

  const handleDirectDownload = async (cleanUrl: string): Promise<void> => {
    const domain = extractDomain(cleanUrl);
    const uniqueSlug = `doc-${Date.now()}`;
    const newJob: DownloadJob = {
      slug: uniqueSlug,
      name: `Direct Download (${domain})`,
      url: cleanUrl,
      progress: 0,
      status: "pending",
      message: "Queued for direct download...",
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
          throw new Error(insertRes.message ?? "insert_job_record failed");
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await logErrorToDb(msg, "insert_job_record_direct_inbox", newJob.slug);
        throw new Error(msg || "Failed to construct the initial job record in SQLite.");
      }
    }

    try {
      const res = await ipc.triggerJobStart({ jobSlug: uniqueSlug });
      if (!res.success) {
        throw new Error(res.message ?? "trigger_job_start failed");
      }
      if (isTauri()) {
        await ipc.updateInboxStatus({ slug: params.slug, status: "downloaded" });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await logErrorToDb(msg, "trigger_job_start_direct_inbox", uniqueSlug);
      useQueueStore.updateJobStatus(uniqueSlug, "error");
      useQueueStore.updateJobProgress(
        uniqueSlug,
        0,
        msg || "Failed to initialize native direct downloader.",
      );
    }

    navigate("/downloads");
  };

  const handleMetadataExtract = async (cleanUrl: string): Promise<void> => {
    useParseStore.setParsing(true);
    const startedAt = new Date().toISOString();
    const startTime = Date.now();

    let payload: DiscoveryPayload | null = null;
    if (isTauri()) {
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
        await logErrorToDb(msg, "discover_asset_metadata_inbox");
        throw e;
      }
    } else {
      throw new Error("Metadata extraction requires Tauri runtime environment.");
    }

    const isPlaylist = payload ? isPlaylistPayload(payload) : false;
    const titleText = payload?.title || "Untitled Extraction Target";
    const parsedFile = {
      slug: payload?.id || `file-${Date.now()}`,
      url: cleanUrl,
      title: titleText,
      sanitizedTitle: sanitizeTitle(titleText),
      isPlaylist,
      thumbnail:
        (payload && "thumbnail" in payload && payload.thumbnail) ||
        payload?.thumbnails?.[0]?.url ||
        "",
      duration:
        payload && "duration" in payload && payload.duration !== undefined ? payload.duration : 0,
      author:
        (payload && "uploader" in payload && payload.uploader) ||
        (payload && "channel" in payload && payload.channel) ||
        "External Publisher",
      views: (payload && "view_count" in payload && payload.view_count) || 0,
      payload: payload as DiscoveryPayload,
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
        await ipc.updateInboxStatus({ slug: params.slug, status: "parsed" });
      } catch (e) {
        await logErrorToDb(String(e), "insert_parsed_file_inbox", parsedFile.slug);
      }
    }

    navigate(`/parsed_file/${parsedFile.slug}`);
  };

  const handleAction = async (e: Event): Promise<void> => {
    e.preventDefault();
    if (!url().trim()) {
      setErrorMsg("Please provide a valid asset web URL address first.");
      return;
    }
    setErrorMsg("");
    setLoading(true);

    const targetUrl = url().trim();

    try {
      const cleanUrl = await sanitizeUrl(targetUrl);
      if (directDownload()) {
        await handleDirectDownload(cleanUrl);
      } else {
        await handleMetadataExtract(cleanUrl);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await logErrorToDb(msg, "inbox_action_failed");
      setErrorMsg(msg || "Failed to initialize inbox action.");
    } finally {
      useParseStore.setParsing(false);
      setLoading(false);
    }
  };

  return (
    <div class="space-y-4 max-w-2xl mx-auto py-2 select-none animate-fade-in text-xs sm:text-sm font-sans text-left">
      {/* Header */}
      <div class="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div class="flex items-center gap-3">
          <AdaptiveTooltip content="Return to inbox">
            <button
              type="button"
              onClick={() => navigate("/inbox")}
              class="p-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <ArrowLeft class="w-4 h-4" />
            </button>
          </AdaptiveTooltip>
          <div>
            <h1 class="text-sm font-bold text-zinc-900 dark:text-white">Process Inbox Link</h1>
            <p class="text-[11px] text-zinc-500 dark:text-zinc-400">
              Configure extraction strategy and queue options
            </p>
          </div>
        </div>
      </div>

      <Show
        when={!fetchingDetails()}
        fallback={
          <div class="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div class="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span class="text-xs text-zinc-400 font-medium">Loading link details...</span>
          </div>
        }
      >
        <Show
          when={inboxItem()}
          fallback={
            <div class="border border-red-200 dark:border-red-900/40 bg-red-500/5 p-4 rounded-xl text-center text-red-500 font-semibold text-xs flex items-center justify-center gap-2">
              <AlertCircle class="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg() || "Item not found."}</span>
            </div>
          }
        >
          <div class="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-5 rounded-2xl shadow-xs space-y-5">
            {/* Link details box */}
            <Show when={inboxItem()}>
              {(item) => {
                const domain = () => extractDomain(item().url);
                return (
                  <div class="flex items-start gap-3 bg-zinc-50 dark:bg-zinc-950 p-3.5 rounded-xl border border-zinc-200/70 dark:border-zinc-800/70">
                    <div class="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Inbox class="w-4 h-4" />
                    </div>
                    <div class="space-y-1 overflow-hidden min-w-0 flex-1">
                      <div class="flex items-center gap-2 text-[10px] text-zinc-400 font-medium flex-wrap">
                        <span class="inline-flex items-center gap-1 font-mono text-zinc-700 dark:text-zinc-300 font-semibold">
                          <Globe class="w-3 h-3 text-zinc-400" />
                          {domain()}
                        </span>
                        <span>•</span>
                        <span class="flex items-center gap-1">
                          <Calendar class="w-3 h-3" />
                          {formatDate(item().created_at)}
                        </span>
                        <span>•</span>
                        <span class="flex items-center gap-1">
                          <Clock class="w-3 h-3" />
                          {formatTime(item().created_at)}
                        </span>
                        <span>•</span>
                        <span class="capitalize font-semibold text-blue-600 dark:text-blue-400">
                          {item().status}
                        </span>
                      </div>
                      <p class="text-zinc-800 dark:text-zinc-200 font-semibold break-all text-xs">
                        {item().url}
                      </p>
                    </div>
                  </div>
                );
              }}
            </Show>

            <form onSubmit={(e) => void handleAction(e)} class="space-y-4">
              {/* Asset URL field - readonly with copy button */}
              <div class="space-y-1.5 text-left">
                <label class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Target Link Address
                </label>
                <div class="relative flex items-center">
                  <div class="absolute left-3 text-zinc-400">
                    <Link2 class="w-4 h-4" />
                  </div>
                  <input
                    type="url"
                    value={url()}
                    disabled
                    class="w-full pl-9 pr-10 py-2 bg-zinc-100/70 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-600 dark:text-zinc-400 outline-none select-all"
                  />
                  <AdaptiveTooltip content="Copy URL to clipboard">
                    <button
                      type="button"
                      onClick={() => void handleCopy()}
                      class="absolute right-2.5 p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <Show when={copied()} fallback={<Copy class="w-3.5 h-3.5" />}>
                        <Check class="w-3.5 h-3.5 text-emerald-500" />
                      </Show>
                    </button>
                  </AdaptiveTooltip>
                </div>
              </div>

              {/* Mode Selection Segmented Control */}
              <div class="space-y-1.5 text-left">
                <span class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Download Strategy
                </span>
                <div class="grid grid-cols-2 p-1 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl gap-1">
                  <AdaptiveTooltip content="Probe metadata, format streams, codecs, and subtitles before queueing">
                    <button
                      type="button"
                      onClick={() => setDirectDownload(false)}
                      disabled={loading()}
                      class={`w-full flex items-center justify-center py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        !directDownload()
                          ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs"
                          : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                      }`}
                    >
                      Metadata Analysis
                    </button>
                  </AdaptiveTooltip>

                  <AdaptiveTooltip content="Immediately add download job to queue with best available quality">
                    <button
                      type="button"
                      onClick={() => setDirectDownload(true)}
                      disabled={loading()}
                      class={`w-full flex items-center justify-center py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        directDownload()
                          ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs"
                          : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                      }`}
                    >
                      Direct Queue
                    </button>
                  </AdaptiveTooltip>
                </div>
                <p class="text-[11px] text-zinc-400 dark:text-zinc-500">
                  {directDownload()
                    ? "Directly adds to download queue and fetches with best available quality."
                    : "Probes metadata, formats, audio codecs, and subtitles before queueing."}
                </p>
              </div>

              {/* Site Profile & Proxy Picker */}
              <div class="space-y-1.5 text-left">
                <div class="flex items-center justify-between">
                  <span class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Network Rule & Proxy Profile
                  </span>
                  <AdaptiveTooltip content="Manage domain routing rules and proxy profiles">
                    <button
                      type="button"
                      onClick={() => navigate("/sites_config")}
                      class="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      Manage
                    </button>
                  </AdaptiveTooltip>
                </div>

                <SiteProfilePicker
                  configs={siteConfigs()}
                  selectedSlug={selectedSiteSlug()}
                  onSelect={setSelectedSiteSlug}
                  onManageClick={() => navigate("/sites_config")}
                />
              </div>

              {/* Error block */}
              <Show when={errorMsg()}>
                <div class="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 animate-fade-in text-xs">
                  <AlertCircle class="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span class="font-medium text-left leading-normal">{errorMsg()}</span>
                </div>
              </Show>

              {/* Submit Button */}
              <div class="pt-1">
                <AdaptiveTooltip
                  content={
                    directDownload()
                      ? "Directly enqueue resource with best quality"
                      : "Inspect formats, codecs, and subtitles"
                  }
                >
                  <button
                    type="submit"
                    disabled={loading()}
                    class="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs hover:shadow transition-all active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none cursor-pointer tracking-wide"
                  >
                    <Show
                      when={loading()}
                      fallback={directDownload() ? "Enqueue & Start Download" : "Analyze Resource"}
                    >
                      <span class="flex items-center gap-2">
                        <span class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Extracting Parameters...</span>
                      </span>
                    </Show>
                  </button>
                </AdaptiveTooltip>
              </div>
            </form>
          </div>
        </Show>
      </Show>
    </div>
  );
}
