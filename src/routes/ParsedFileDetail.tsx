import { createSignal, createMemo, Show, onMount, type JSX } from "solid-js";
import { useParams, A, useNavigate } from "@solidjs/router";
import { Tooltip } from "@kobalte/core/tooltip";
import { PlayCircle, GlobeLock, ArrowLeft } from "lucide-solid";

import { useParseStore } from "@/store/useParseStore";
import { useUIStore } from "@/store/useUIStore";
import { ipc } from "@/utils/ipc";
import { isTauri } from "@/utils/tauri";
import { formatDuration, formatSize } from "@/utils/format";
import { sanitizeTitle, escapeFormatForFilename } from "@/utils/sanitize";
import { logErrorToDb } from "@/core/logger";
import type { SiteConfig, JobRecordPayload } from "@/core/types/database.types";
import type {
  DiscoveryPayload,
  Format,
  GenericPlaylistMetadata,
  ParsedFile as ParsedFileRecord,
  PresetOption,
  SubtitleOption,
  VideoMetadata,
} from "@/core/types/ytdlp.types";
import { CustomSelect } from "@/components/CustomSelect";

import { HeroCard } from "@/features/parser/components/HeroCard";
import { SingleVideoView } from "@/features/parser/components/SingleVideoView";
import { PlaylistView } from "@/features/parser/components/PlaylistView";
import { ConfigureTrackModal } from "@/features/parser/components/ConfigureTrackModal";

interface PlaylistTrackInfo {
  id: string;
  title: string;
  url: string;
  duration?: number | undefined;
  thumbnails?: Array<{ url: string }> | undefined;
}

const PRESET_LIST: PresetOption[] = [
  { label: "Best Quality (Unlimited / 4K+)", value: "bestvideo+bestaudio/best" },
  {
    label: "Best MP4 Format (Highly Compatible)",
    value: "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
  },
  { label: "Max 1440p (QHD)", value: "bestvideo[height<=1440]+bestaudio/best" },
  { label: "Max 1080p (FHD)", value: "bestvideo[height<=1080]+bestaudio/best" },
  { label: "Max 720p (HD)", value: "bestvideo[height<=720]+bestaudio/best" },
  { label: "Max 480p (SD - Data Saver)", value: "bestvideo[height<=480]+bestaudio/best" },
  { label: "Max 360p (Low - Feature Phone Saver)", value: "bestvideo[height<=360]+bestaudio/best" },
  { label: "Extract Audio Only (Highest)", value: "bestaudio/best" },
  { label: "Extract Audio Only (M4A Native)", value: "bestaudio[ext=m4a]/bestaudio/best" },
];

const PREDEFINED_SUBS: SubtitleOption[] = [
  { lang: "all", name: "All Available Subtitles" },
  { lang: "en", name: "English" },
  { lang: "bn", name: "Bengali" },
  { lang: "es", name: "Spanish" },
  { lang: "hi", name: "Hindi" },
  { lang: "fr", name: "French" },
  { lang: "ar", name: "Arabic" },
  { lang: "ru", name: "Russian" },
  { lang: "pt", name: "Portuguese" },
  { lang: "de", name: "German" },
  { lang: "ja", name: "Japanese" },
];

const subtitleOptionsFrom = (subtitles: VideoMetadata["subtitles"]): SubtitleOption[] => {
  if (!subtitles) return [];
  return Object.keys(subtitles).map((lang) => ({
    lang,
    name: subtitles[lang]?.[0]?.name ?? lang.toUpperCase(),
  }));
};

export default function ParsedFileDetail(): JSX.Element {
  const params = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const file = createMemo<ParsedFileRecord | undefined>(() =>
    useParseStore.state.parsedFiles.find((f) => f.slug === params.slug),
  );
  const payload = createMemo<DiscoveryPayload>(() => file()?.payload ?? ({} as DiscoveryPayload));

  const [siteConfigs, setSiteConfigs] = createSignal<SiteConfig[]>([]);
  const [selectedSiteSlug, setSelectedSiteSlug] = createSignal<string>("");

  onMount(() => {
    useUIStore.setActivePath("/parsed_file");
    void (async () => {
      if (!isTauri()) return;
      try {
        const configs = await ipc.getSiteConfigs();
        setSiteConfigs(configs);
      } catch (err) {
        console.error("Failed to load site configs in ParsedFileDetail:", err);
      }
    })();

    const f = file();
    if (f?.siteConfigSlug) {
      setSelectedSiteSlug(f.siteConfigSlug);
    }
  });

  const [selectedSubs, setSelectedSubs] = createSignal<string[]>([]);
  const [selectionMode, setSelectionMode] = createSignal<"custom" | "fallback">("custom");
  const [selectedVideo, setSelectedVideo] = createSignal<string>("");
  const [selectedAudio, setSelectedAudio] = createSignal<string>("");
  const [selectedPreset, setSelectedPreset] = createSignal<string>("bestvideo+bestaudio/best");
  const [selectedTracks, setSelectedTracks] = createSignal<string[]>([]);

  // Modal specific state
  const [parsingTracks, setParsingTracks] = createSignal<Record<string, boolean>>({});
  const [activeTrackPayload, setActiveTrackPayload] = createSignal<DiscoveryPayload | null>(null);
  const [activeTrackFile, setActiveTrackFile] = createSignal<ParsedFileRecord | null>(null);
  const [showModal, setShowModal] = createSignal(false);
  const [modalSelectedVideo, setModalSelectedVideo] = createSignal("");
  const [modalSelectedAudio, setModalSelectedAudio] = createSignal("");
  const [modalSelectedPreset, setModalSelectedPreset] = createSignal("bestvideo+bestaudio/best");
  const [modalSelectedSubs, setModalSelectedSubs] = createSignal<string[]>([]);
  const [modalSelectionMode, setModalSelectionMode] = createSignal<"custom" | "fallback">("custom");

  const dispatchDownloadJob = async (jobPayload: JobRecordPayload): Promise<void> => {
    const payloadWithConfig: JobRecordPayload = {
      ...jobPayload,
      site_config_slug: selectedSiteSlug() || null,
    };

    if (isTauri()) {
      try {
        const insertRes = await ipc.insertJobRecord({ payload: payloadWithConfig });
        if (!insertRes.success) throw new Error(insertRes.message ?? "insert_job_record failed");

        const startRes = await ipc.triggerJobStart({ jobSlug: payloadWithConfig.slug });
        if (!startRes.success) throw new Error(startRes.message ?? "trigger_job_start failed");
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await logErrorToDb(msg, "dispatch_download_job", payloadWithConfig.slug);
      }
    } else {
      console.log(
        `[Browser Preview] Job ${payloadWithConfig.slug} dispatched to backend mock:`,
        payloadWithConfig,
      );
    }
  };

  const startDownload = async (
    formatString: string,
    isAudio = false,
    customName?: string,
    targetUrl?: string,
  ): Promise<void> => {
    const f = file();
    if (!f) return;

    const uniqueSlug = `dl-${Date.now()}`;
    const urlToUse = targetUrl ?? f.url;
    const fmt = formatString || "bestvideo+bestaudio/best";
    const safeFmt = escapeFormatForFilename(fmt);
    const baseTitle = customName ?? f.title;

    await dispatchDownloadJob({
      slug: uniqueSlug,
      url: urlToUse,
      parsed_file_slug: f.slug,
      file_type: isAudio ? "audio" : "video",
      associated_media_job_slug: null,
      is_from_playlist: f.isPlaylist,
      format_string: fmt,
      download_path: useUIStore.state.downloadPath,
      created_at: new Date().toISOString(),
      custom_title: `[${safeFmt}]_${baseTitle}`,
    });

    if (selectedSubs().length > 0) {
      const subsToDispatch = selectedSubs().includes("all") ? ["all"] : selectedSubs();
      const promises = subsToDispatch.map((sub, index) => {
        const subSlug = `dl-sub-${Date.now()}-${sub}-${index}`;
        return dispatchDownloadJob({
          slug: subSlug,
          url: urlToUse,
          parsed_file_slug: f.slug,
          file_type: "subtitle",
          associated_media_job_slug: uniqueSlug,
          is_from_playlist: f.isPlaylist,
          format_string: "bestvideo+bestaudio/best",
          download_path: useUIStore.state.downloadPath,
          created_at: new Date().toISOString(),
          selected_subtitles: sub,
          custom_title: `[sub_${sub}]_${customName ?? f.title}`,
        });
      });
      await Promise.all(promises);
    }

    navigate("/downloads");
  };

  const handleParseTrack = async (track: PlaylistTrackInfo): Promise<void> => {
    const f = file();
    if (!f) return;

    const existingFile = useParseStore.state.parsedFiles.find(
      (pf) => pf.parentPlaylistSlug === f.slug && pf.title === track.title,
    );

    if (existingFile) {
      setActiveTrackPayload(existingFile.payload);
      setActiveTrackFile(existingFile);
      setModalSelectedVideo("");
      setModalSelectedAudio("");
      setModalSelectedSubs([]);
      setModalSelectedPreset("bestvideo+bestaudio/best");
      setModalSelectionMode("custom");
      setShowModal(true);
      return;
    }

    setParsingTracks((prev) => ({ ...prev, [track.id]: true }));

    try {
      let cleanUrl = track.url;
      if (isTauri()) {
        try {
          const cleanRes = await ipc.processClipboardPaste({ rawInput: track.url });
          if (cleanRes.success && cleanRes.sanitized_url) {
            cleanUrl = cleanRes.sanitized_url;
          }
        } catch (e) {
          console.warn("Track clipboard paste cleaning failed:", e);
        }
      }

      let trackPayload: DiscoveryPayload | null = null;
      if (isTauri()) {
        try {
          const discoverRes = await ipc.discoverAssetMetadata({
            targetUrl: cleanUrl,
            siteConfigSlug: selectedSiteSlug() || null,
          });
          if (discoverRes.success && discoverRes.payload) {
            trackPayload = discoverRes.payload;
          } else {
            throw new Error(
              discoverRes.error_message || "Metadata extraction probe rejected track URL.",
            );
          }
        } catch (e) {
          console.warn("discover_asset_metadata track failed (browser fallback):", e);
          const mockTrack: VideoMetadata = {
            id: track.id || `vid-${Date.now()}`,
            title: track.title || "Introduction to Tauri & React - Premium Development Guide",
            uploader: f.author || "Synclime Platform",
            duration: track.duration || 185,
            view_count: 12500,
            thumbnail:
              track.thumbnails?.[0]?.url ||
              "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=480&auto=format&fit=crop&q=60",
            formats: [
              {
                format_id: "bestvideo",
                ext: "mp4",
                format_note: "1085p 60fps",
                width: 1920,
                height: 1080,
                fps: 60,
                filesize: 95000000,
              },
              {
                format_id: "720p",
                ext: "mp4",
                format_note: "720p 30fps",
                width: 1280,
                height: 720,
                fps: 30,
                filesize: 45000000,
              },
              {
                format_id: "bestaudio",
                ext: "m4a",
                format_note: "HQ Audio",
                acodec: "aac",
                abr: 256,
                filesize: 6000000,
              },
            ],
            subtitles: {
              en: [{ ext: "vtt", url: "", name: "English" }],
              es: [{ ext: "vtt", url: "", name: "Spanish" }],
            },
            chapters: [],
            type: "video",
          };
          trackPayload = mockTrack;
        }
      } else {
        const mockTrack: VideoMetadata = {
          id: track.id || `vid-${Date.now()}`,
          title: track.title || "Introduction to Tauri & React - Premium Development Guide",
          uploader: f.author || "Synclime Platform",
          duration: track.duration || 185,
          view_count: 12500,
          thumbnail:
            track.thumbnails?.[0]?.url ||
            "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=480&auto=format&fit=crop&q=60",
          formats: [
            {
              format_id: "bestvideo",
              ext: "mp4",
              format_note: "1085p 60fps",
              width: 1920,
              height: 1080,
              fps: 60,
              filesize: 95000000,
            },
            {
              format_id: "720p",
              ext: "mp4",
              format_note: "720p 30fps",
              width: 1280,
              height: 720,
              fps: 30,
              filesize: 45000000,
            },
            {
              format_id: "bestaudio",
              ext: "m4a",
              format_note: "HQ Audio",
              acodec: "aac",
              abr: 256,
              filesize: 6000000,
            },
          ],
          subtitles: {
            en: [{ ext: "vtt", url: "", name: "English" }],
            es: [{ ext: "vtt", url: "", name: "Spanish" }],
          },
          chapters: [],
          type: "video",
        };
        trackPayload = mockTrack;
      }

      if (!trackPayload) {
        throw new Error("Failed to obtain track payload.");
      }

      const titleText = trackPayload.title || track.title;
      const parsedTrackFile: ParsedFileRecord = {
        slug: trackPayload.id || `file-${Date.now()}`,
        url: cleanUrl,
        title: titleText,
        sanitizedTitle: sanitizeTitle(titleText),
        isPlaylist: false,
        thumbnail:
          ("thumbnail" in trackPayload && trackPayload.thumbnail) ||
          track.thumbnails?.[0]?.url ||
          "",
        duration:
          ("duration" in trackPayload && trackPayload.duration !== undefined
            ? trackPayload.duration
            : track.duration) ?? 0,
        author: ("uploader" in trackPayload && trackPayload.uploader) || "External Publisher",
        views: ("view_count" in trackPayload && trackPayload.view_count) || 0,
        payload: trackPayload,
        parsedAt: new Date().toISOString(),
        parentPlaylistSlug: f.slug,
        ...(f.siteConfigSlug ? { siteConfigSlug: f.siteConfigSlug } : {}),
      };

      useParseStore.addParsedFile(parsedTrackFile);

      if (isTauri()) {
        try {
          await ipc.insertParsedFile({
            payload: {
              slug: parsedTrackFile.slug,
              url: parsedTrackFile.url,
              title: parsedTrackFile.title,
              sanitized_title: parsedTrackFile.sanitizedTitle,
              is_playlist: 0,
              parent_playlist_slug: f.slug,
              playlist_name: f.title,
              sanitized_playlist_name: f.sanitizedTitle,
              json_metadata: JSON.stringify(trackPayload),
              created_at: parsedTrackFile.parsedAt,
              site_config_slug: f.siteConfigSlug ?? null,
            },
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          await logErrorToDb(msg, "insert_parsed_track", parsedTrackFile.slug);
        }
      }

      setActiveTrackPayload(trackPayload);
      setActiveTrackFile(parsedTrackFile);
      setModalSelectedVideo("");
      setModalSelectedAudio("");
      setModalSelectedSubs([]);
      setModalSelectedPreset("bestvideo+bestaudio/best");
      setModalSelectionMode("custom");
      setShowModal(true);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      alert(msg || "Failed to parse track metadata.");
    } finally {
      setParsingTracks((prev) => ({ ...prev, [track.id]: false }));
    }
  };

  const startModalDownload = async (): Promise<void> => {
    const activeFile = activeTrackFile();
    if (!activeFile) return;

    let formatString = "";
    if (modalSelectionMode() === "fallback") {
      formatString = modalSelectedPreset();
    } else if (modalSelectedVideo() && modalSelectedAudio()) {
      formatString = `${modalSelectedVideo()}+${modalSelectedAudio()}`;
    } else if (modalSelectedVideo()) {
      formatString = modalSelectedVideo();
    } else if (modalSelectedAudio()) {
      formatString = modalSelectedAudio();
    } else {
      formatString = "bestvideo+bestaudio/best";
    }

    const isAudio = formatString.includes("bestaudio") && !formatString.includes("bestvideo");
    const uniqueSlug = `dl-${Date.now()}`;
    const joinedSubs = modalSelectedSubs().includes("all") ? "all" : modalSelectedSubs().join(",");
    const safeFmt = escapeFormatForFilename(formatString);

    await dispatchDownloadJob({
      slug: uniqueSlug,
      url: activeFile.url,
      parsed_file_slug: activeFile.slug,
      file_type: isAudio ? "audio" : "video",
      associated_media_job_slug: null,
      is_from_playlist: activeFile.isPlaylist || false,
      format_string: formatString,
      download_path: useUIStore.state.downloadPath,
      created_at: new Date().toISOString(),
      custom_title: `[${safeFmt}]_${activeFile.title}`,
      selected_subtitles: joinedSubs || null,
    });

    if (modalSelectedSubs().length > 0) {
      const subsToDispatch = modalSelectedSubs().includes("all") ? ["all"] : modalSelectedSubs();
      const promises = subsToDispatch.map((sub, index) => {
        const subSlug = `dl-sub-${Date.now()}-${sub}-${index}`;
        return dispatchDownloadJob({
          slug: subSlug,
          url: activeFile.url,
          parsed_file_slug: activeFile.slug,
          file_type: "subtitle",
          associated_media_job_slug: uniqueSlug,
          is_from_playlist: activeFile.isPlaylist || false,
          format_string: "bestvideo+bestaudio/best",
          download_path: useUIStore.state.downloadPath,
          created_at: new Date().toISOString(),
          selected_subtitles: sub,
          custom_title: `[sub_${sub}]_${activeFile.title}`,
        });
      });
      await Promise.all(promises);
    }

    setShowModal(false);
    navigate("/downloads");
  };

  const downloadAllPlaylist = async (): Promise<void> => {
    const f = file();
    if (!f) return;

    const playlistPayload = payload() as GenericPlaylistMetadata;
    let targetTracks: PlaylistTrackInfo[] = (playlistPayload.entries ?? []).map((entry) => {
      const track: PlaylistTrackInfo = {
        id: entry.id,
        title: entry.title,
        url: entry.url,
      };
      if (entry.duration !== undefined) track.duration = entry.duration;
      if (entry.thumbnails) track.thumbnails = entry.thumbnails.map((t) => ({ url: t.url }));
      return track;
    });

    if (selectedTracks().length > 0) {
      targetTracks = targetTracks.filter((t) => selectedTracks().includes(t.id));
    }
    if (targetTracks.length === 0) return;

    const playlistFormatString = selectedPreset() || "bestvideo+bestaudio/best";
    const safeFmt = escapeFormatForFilename(playlistFormatString);

    const promises = targetTracks.map(async (track, index) => {
      const trackSlug = `track-${track.id}-${Date.now()}-${index}`;

      await dispatchDownloadJob({
        slug: trackSlug,
        url: track.url,
        parsed_file_slug: f.slug,
        file_type: "video",
        associated_media_job_slug: null,
        is_from_playlist: f.isPlaylist,
        format_string: playlistFormatString,
        download_path: useUIStore.state.downloadPath,
        created_at: new Date().toISOString(),
        custom_title: `[${safeFmt}]_${track.title}`,
      });

      if (selectedSubs().length > 0) {
        const subsToDispatch = selectedSubs().includes("all") ? ["all"] : selectedSubs();
        const subPromises = subsToDispatch.map((sub, sIdx) => {
          const subSlug = `dl-sub-${Date.now()}-${sub}-${index}-${sIdx}`;
          return dispatchDownloadJob({
            slug: subSlug,
            url: track.url,
            parsed_file_slug: f.slug,
            file_type: "subtitle",
            associated_media_job_slug: trackSlug,
            is_from_playlist: f.isPlaylist,
            format_string: "bestvideo+bestaudio/best",
            download_path: useUIStore.state.downloadPath,
            created_at: new Date().toISOString(),
            selected_subtitles: sub,
            custom_title: `[sub_${sub}]_${track.title}`,
          });
        });
        await Promise.all(subPromises);
      }
    });

    await Promise.all(promises);

    navigate("/downloads");
  };

  const downloadSubtitle = async (targetUrl: string, trackTitle: string): Promise<void> => {
    const f = file();
    if (!f) return;

    if (selectedSubs().length === 0) {
      alert("Please select at least one subtitle language from the checkbox list first!");
      return;
    }

    const { useQueueStore } = await import("@/store/useQueueStore");
    const queue = useQueueStore.state.queue;
    const parentJob = queue.find((j) => j.url === targetUrl && j.fileType !== "subtitle");

    const subsToDispatch = selectedSubs().includes("all") ? ["all"] : selectedSubs();
    const promises = subsToDispatch.map((sub, index) => {
      const subSlug = `dl-sub-${Date.now()}-${sub}-${index}`;
      return dispatchDownloadJob({
        slug: subSlug,
        url: targetUrl,
        parsed_file_slug: f.slug,
        file_type: "subtitle",
        associated_media_job_slug: parentJob ? parentJob.slug : null,
        is_from_playlist: f.isPlaylist,
        format_string: "bestvideo+bestaudio/best",
        download_path: useUIStore.state.downloadPath,
        created_at: new Date().toISOString(),
        selected_subtitles: sub,
        custom_title: `[sub_${sub}]_${trackTitle}`,
      });
    });

    await Promise.all(promises);
    navigate("/downloads");
  };

  const subOptions = createMemo<SubtitleOption[]>(() => {
    const p = payload();
    if (!("subtitles" in p) || !p.subtitles) return [];
    return subtitleOptionsFrom(p.subtitles);
  });

  const displaySubOptions = createMemo<SubtitleOption[]>(() =>
    subOptions().length > 0 ? subOptions() : PREDEFINED_SUBS,
  );

  const modalSubOptions = createMemo<SubtitleOption[]>(() => {
    const active = activeTrackPayload();
    if (!active || !("subtitles" in active) || !active.subtitles) return [];
    return subtitleOptionsFrom(active.subtitles);
  });

  const modalDisplaySubOptions = createMemo<SubtitleOption[]>(() =>
    modalSubOptions().length > 0 ? modalSubOptions() : PREDEFINED_SUBS,
  );

  const videoStreams = createMemo<Format[]>(() => {
    const p = payload();
    const formats = "formats" in p ? (p.formats ?? []) : [];
    return formats.filter(
      (f) => f.vcodec !== "none" && (f.format_note !== undefined || f.resolution !== undefined),
    );
  });

  const audioStreams = createMemo<Format[]>(() => {
    const p = payload();
    const formats = "formats" in p ? (p.formats ?? []) : [];
    return formats.filter((f) => f.acodec !== "none" && f.vcodec === "none");
  });

  const getGeneratedFormatString = (): string => {
    if (selectionMode() === "fallback") {
      return selectedPreset();
    }
    if (selectedVideo() && selectedAudio()) {
      return `${selectedVideo()}+${selectedAudio()}`;
    }
    if (selectedVideo()) return selectedVideo();
    if (selectedAudio()) return selectedAudio();
    return "bestvideo+bestaudio/best";
  };

  const toggleSub = (lang: string): void => {
    setSelectedSubs((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang],
    );
  };

  const toggleModalSub = (lang: string): void => {
    setModalSelectedSubs((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang],
    );
  };

  return (
    <Show
      when={file()}
      fallback={
        <div class="flex flex-col items-center justify-center min-h-[50vh] text-center gap-6 w-full max-w-md mx-auto px-4 font-sans select-none">
          <div class="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl">
            <Tooltip openDelay={200} placement="bottom">
              <Tooltip.Trigger as="div" class="cursor-default inline-flex">
                <PlayCircle class="w-8 h-8" />
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                  <Tooltip.Arrow />
                  Metadata Not Found
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip>
          </div>
          <div class="flex flex-col gap-1">
            <p class="text-xs text-zinc-500 dark:text-zinc-400">
              The requested parsed asset cache profile is either invalid or was recently cleared.
            </p>
          </div>
          <Tooltip openDelay={200} placement="top">
            <Tooltip.Trigger
              as={A}
              href="/parsed_files"
              class="inline-flex items-center justify-center bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-white/10 p-2.5 rounded-xl transition-all duration-300"
            >
              <ArrowLeft class="w-4 h-4" />
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                <Tooltip.Arrow />
                Return to Repository
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip>
        </div>
      }
    >
      {(activeFile) => {
        const f = activeFile();
        const p = payload();
        return (
          <div class="flex flex-col gap-4 sm:gap-6 w-full max-w-4xl mx-auto px-1 sm:px-4 py-1 sm:py-2 text-zinc-950 dark:text-white transition-colors duration-300 font-sans select-none">
            {/* Active Site Configuration Profile Card */}
            <div class="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-sm text-left space-y-3 animate-fade-in">
              <div class="flex flex-col gap-1">
                <Tooltip openDelay={200} placement="right">
                  <Tooltip.Trigger as="div" class="cursor-default inline-flex items-center">
                    <GlobeLock class="w-3.5 h-3.5 text-zinc-400" />
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                      <Tooltip.Arrow />
                      Active Site Configuration Profile
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip>
                <p class="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400">
                  Select an explicit profile to force specific cookies, proxy headers, or network
                  limits for this download job.
                </p>
              </div>
              <CustomSelect
                value={selectedSiteSlug()}
                onChange={setSelectedSiteSlug}
                options={siteConfigs().map((c) => ({
                  value: c.slug,
                  label: `${c.title} (${c.domain})`,
                }))}
                placeholder="No Site Profile (Direct network fallback)"
              />
            </div>

            {/* Asset Hero Section Card */}
            <HeroCard
              thumbnail={f.thumbnail}
              title={f.title}
              author={f.author}
              isPlaylist={f.isPlaylist}
              duration={f.duration}
              {...("description" in p && p.description !== undefined
                ? { description: p.description }
                : {})}
              formatDuration={formatDuration}
            />

            <Show
              when={f.isPlaylist}
              fallback={
                <SingleVideoView
                  url={f.url}
                  title={f.title}
                  selectionMode={selectionMode}
                  setSelectionMode={setSelectionMode}
                  selectedVideo={selectedVideo}
                  setSelectedVideo={setSelectedVideo}
                  selectedAudio={selectedAudio}
                  setSelectedAudio={setSelectedAudio}
                  selectedPreset={selectedPreset}
                  setSelectedPreset={setSelectedPreset}
                  videoStreams={videoStreams()}
                  audioStreams={audioStreams()}
                  presetList={PRESET_LIST}
                  getGeneratedFormatString={getGeneratedFormatString}
                  startDownload={startDownload}
                  displaySubOptions={displaySubOptions()}
                  selectedSubs={selectedSubs}
                  toggleSub={toggleSub}
                  downloadSubtitle={downloadSubtitle}
                  formatSize={formatSize}
                  subOptions={subOptions()}
                />
              }
            >
              <PlaylistView
                payload={payload}
                selectedPreset={selectedPreset}
                setSelectedPreset={setSelectedPreset}
                presetList={PRESET_LIST}
                downloadAllPlaylist={downloadAllPlaylist}
                selectedTracks={selectedTracks}
                setSelectedTracks={setSelectedTracks}
                subOptions={subOptions()}
                displaySubOptions={displaySubOptions()}
                selectedSubs={selectedSubs}
                toggleSub={toggleSub}
                parsingTracks={parsingTracks}
                handleParseTrack={handleParseTrack}
                downloadSubtitle={downloadSubtitle}
                startDownload={startDownload}
                formatDuration={formatDuration}
              />
            </Show>

            <ConfigureTrackModal
              showModal={showModal}
              setShowModal={setShowModal}
              activeTrackPayload={activeTrackPayload}
              activeTrackFile={activeTrackFile}
              modalSelectionMode={modalSelectionMode}
              setModalSelectionMode={setModalSelectionMode}
              modalSelectedVideo={modalSelectedVideo}
              setModalSelectedVideo={setModalSelectedVideo}
              modalSelectedAudio={modalSelectedAudio}
              setModalSelectedAudio={setModalSelectedAudio}
              modalSelectedPreset={modalSelectedPreset}
              setModalSelectedPreset={setModalSelectedPreset}
              modalSelectedSubs={modalSelectedSubs}
              toggleModalSub={toggleModalSub}
              modalDisplaySubOptions={modalDisplaySubOptions()}
              presetList={PRESET_LIST}
              formatSize={formatSize}
              startModalDownload={() => {
                void startModalDownload();
              }}
            />
          </div>
        );
      }}
    </Show>
  );
}
