import { onMount, createSignal, Show, type JSX } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { Switch } from "@kobalte/core/switch";
import { Tooltip } from "@kobalte/core/tooltip";
import {
  Play,
  FileDown,
  Link2,
  AlertCircle,
  GlobeLock,
  ArrowLeft,
  Calendar,
  Inbox,
} from "lucide-solid";
import { useUIStore } from "@/store/useUIStore";
import { useParseStore } from "@/store/useParseStore";
import { useQueueStore } from "@/store/useQueueStore";
import { ipc } from "@/utils/ipc";
import { isTauri } from "@/utils/tauri";
import { sanitizeTitle } from "@/utils/sanitize";
import { formatDate } from "@/utils/format";
import { logErrorToDb, logParseToDb } from "@/core/logger";
import type { SiteConfig, DownloadJob, InboxItem } from "@/core/types/database.types";
import { isPlaylistPayload, type DiscoveryPayload, type VideoMetadata } from "@/core/types/ytdlp.types";
import { CustomSelect } from "@/components/CustomSelect";


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
          const result = await ipc.getInboxUrlBySlug({ slug: params.slug });
          const item = result.payload ?? null;
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
        setTimeout(() => {
          setInboxItem({
            slug: params.slug,
            url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            status: "pending",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          setUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
          setFetchingDetails(false);
        }, 600);
      }
    })();
  });

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
    const domain = new URL(cleanUrl).hostname.replace("www.", "");
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
      const mockVideo: VideoMetadata = {
        id: `vid-${Date.now()}`,
        title: "Introduction to Tauri & SolidJS - Inbox Processed Guide",
        uploader: "Synclime Core Platform",
        duration: 185,
        view_count: 54200,
        thumbnail:
          "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=480&auto=format&fit=crop&q=60",
        formats: [
          {
            format_id: "bestvideo",
            ext: "mp4",
            format_note: "1080p 60fps",
            width: 1920,
            height: 1080,
            fps: 60,
            filesize: 120000000,
          },
          {
            format_id: "720p",
            ext: "mp4",
            format_note: "720p 30fps",
            width: 1280,
            height: 720,
            fps: 30,
            filesize: 60000000,
          },
          {
            format_id: "bestaudio",
            ext: "m4a",
            format_note: "HQ Audio",
            acodec: "aac",
            abr: 256,
            filesize: 8000000,
          },
        ],
        subtitles: {},
        chapters: [],
        type: "video",
      };
      payload = mockVideo;
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
      {/* Back button & title */}
      <div class="flex items-center gap-3">
        <Tooltip openDelay={200} placement="right">
          <Tooltip.Trigger
            as="button"
            onClick={() => navigate("/inbox")}
            class="p-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            type="button"
          >
            <ArrowLeft class="w-4 h-4" />
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
              <Tooltip.Arrow />
              Back to Inbox Queue
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip>
        <Tooltip openDelay={200} placement="right">
          <Tooltip.Trigger as="div" class="cursor-default inline-flex items-center">
            <Inbox class="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
              <Tooltip.Arrow />
              Inbox Action Center
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip>
      </div>

      <Show
        when={!fetchingDetails()}
        fallback={
          <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div class="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <Tooltip openDelay={200} placement="bottom">
              <Tooltip.Trigger as="span" class="cursor-default text-zinc-400 text-xs font-semibold">
                ·
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                  <Tooltip.Arrow />
                  Querying SQLite database details...
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip>
          </div>
        }
      >
        <Show
          when={inboxItem()}
          fallback={
            <div class="border border-red-200/60 dark:border-red-900/40 bg-red-500/5 p-4 rounded-xl text-center text-red-500 font-semibold text-xs flex items-center justify-center gap-2">
              <span>{errorMsg()}</span>
            </div>
          }
        >
          <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 p-5 rounded-2xl shadow-sm space-y-5">
            {/* Link details box */}
            <Show when={inboxItem()}>
              {(item) => (
                <div class="flex items-start gap-3 bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50">
                  <div class="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                    <Inbox class="w-4.5 h-4.5" />
                  </div>
                  <div class="space-y-1 overflow-hidden min-w-0">
                    <div class="flex items-center gap-2 text-[10px] text-zinc-400 font-medium">
                      <Tooltip openDelay={200} placement="right">
                        <Tooltip.Trigger as="span" class="cursor-default flex items-center gap-1">
                          <Calendar class="w-3 h-3" />
                          {formatDate(item().created_at)}
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                            <Tooltip.Arrow />
                            Date Received
                          </Tooltip.Content>
                        </Tooltip.Portal>
                      </Tooltip>
                      <span>•</span>
                      <Tooltip openDelay={200} placement="right">
                        <Tooltip.Trigger as="span" class="cursor-default">
                          <strong class="text-blue-500 capitalize">{item().status}</strong>
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                            <Tooltip.Arrow />
                            Status
                          </Tooltip.Content>
                        </Tooltip.Portal>
                      </Tooltip>
                    </div>
                    <p class="text-zinc-800 dark:text-zinc-100 font-semibold break-all text-xs">
                      {item().url}
                    </p>
                  </div>
                </div>
              )}
            </Show>

            <form
              onSubmit={(e) => {
                void handleAction(e);
              }}
              class="space-y-5"
            >
              {/* Asset URL field - readonly for safety */}
              <div class="space-y-1.5">
                <Tooltip openDelay={200} placement="right">
                  <Tooltip.Trigger
                    as="label"
                    class="cursor-default text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider"
                  >
                    ·
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                      <Tooltip.Arrow />
                      Target Link Address
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip>
                <div class="relative flex items-center">
                  <div class="absolute left-3.5 text-zinc-400 dark:text-zinc-500">
                    <Link2 class="w-4.5 h-4.5" />
                  </div>
                  <input
                    type="url"
                    value={url()}
                    onInput={(e) => setUrl(e.currentTarget.value)}
                    disabled={loading()}
                    class="w-full pl-10 pr-4 py-2.5 bg-zinc-100/50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 cursor-not-allowed outline-none shadow-inner"
                    readonly
                  />
                </div>
              </div>

              {/* Toggle switch for direct download */}
              <div class="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/80 rounded-xl shadow-inner">
                <div class="flex items-start gap-3">
                  <Tooltip openDelay={200} placement="right">
                    <Tooltip.Trigger
                      as="div"
                      class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 cursor-default inline-flex"
                    >
                      <FileDown class="w-4.5 h-4.5" />
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                        <Tooltip.Arrow />
                        Direct Single File Download
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip>
                </div>

                <Switch
                  checked={directDownload()}
                  onChange={setDirectDownload}
                  disabled={loading()}
                  class="flex items-center"
                >
                  <Switch.Input class="sr-only" />
                  <Switch.Control class="w-10 h-6 bg-zinc-200 dark:bg-zinc-800 rounded-full transition-colors flex items-center cursor-pointer p-0.5 data-[checked]:bg-emerald-500">
                    <Switch.Thumb class="w-5 h-5 bg-white rounded-full shadow-md transform transition-transform translate-x-0 data-[checked]:translate-x-4" />
                  </Switch.Control>
                </Switch>
              </div>

              {/* Site configs */}
              <Show when={!directDownload()}>
                <div class="space-y-1.5 animate-fade-in text-left">
                  <Tooltip openDelay={200} placement="right">
                    <Tooltip.Trigger
                      as="label"
                      class="cursor-default text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider"
                    >
                      ·
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                        <Tooltip.Arrow />
                        Site Configuration Profile (Cookies & Proxy)
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip>

                  <CustomSelect
                    value={selectedSiteSlug()}
                    onChange={setSelectedSiteSlug}
                    options={siteConfigs().map((c) => ({
                      value: c.slug,
                      label: `${c.title} (${c.domain})`,
                    }))}
                    placeholder="No Site Profile (Direct network fallback)"
                    icon={GlobeLock}
                  />
                </div>
              </Show>

              {/* Error block */}
              <Show when={errorMsg()}>
                <div class="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 animate-fade-in text-xs">
                  <AlertCircle class="w-4.5 h-4.5 flex-shrink-0 mt-0.5" />
                  <span class="font-medium text-left leading-normal">{errorMsg()}</span>
                </div>
              </Show>

              {/* Submit Buttons */}
              <div class="pt-2">
                <Tooltip openDelay={200} placement="top">
                  <Tooltip.Trigger
                    as="button"
                    type="submit"
                    disabled={loading()}
                    class={`w-full flex items-center justify-center gap-2 py-3 px-4 font-bold text-white rounded-xl shadow-lg hover:shadow-xl transition-all outline-none ${
                      directDownload()
                        ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-emerald-500/15"
                        : "bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-blue-500/15"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <Show
                      when={loading()}
                      fallback={
                        <>
                          <Show when={directDownload()} fallback={<Play class="w-4 h-4" />}>
                            <FileDown class="w-4 h-4" />
                          </Show>
                        </>
                      }
                    >
                      <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </Show>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                      <Tooltip.Arrow />
                      {loading()
                        ? directDownload()
                          ? "Connecting to stream threads..."
                          : "Polling manifest pipelines..."
                        : directDownload()
                          ? "Begin Direct File Download"
                          : "Analyze & Extract Video Metadata"}
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip>
              </div>
            </form>
          </div>
        </Show>
      </Show>
    </div>
  );
}
