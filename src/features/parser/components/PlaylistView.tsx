import { Show, For, type Accessor, type Setter, type JSX } from "solid-js";
import { Sliders, Download, Globe, List, Square, CheckSquare } from "lucide-solid";
import { cn } from "@/utils/cn";
import type {
  DiscoveryPayload,
  GenericPlaylistMetadata,
  PresetOption,
  SubtitleOption,
} from "@/core/types/ytdlp.types";

interface PlaylistTrack {
  id: string;
  title: string;
  url: string;
  duration: number;
  thumbnails?: Array<{ url: string }> | undefined;
}

export interface PlaylistViewProps {
  payload: Accessor<DiscoveryPayload>;
  selectedPreset: Accessor<string>;
  setSelectedPreset: Setter<string>;
  presetList: PresetOption[];
  downloadAllPlaylist: () => void;
  selectedTracks: Accessor<string[]>;
  setSelectedTracks: Setter<string[]>;
  subOptions: SubtitleOption[];
  displaySubOptions: SubtitleOption[];
  selectedSubs: Accessor<string[]>;
  toggleSub: (lang: string) => void;
  parsingTracks: Accessor<Record<string, boolean>>;
  handleParseTrack: (track: PlaylistTrack) => void;
  downloadSubtitle: (targetUrl: string, trackTitle: string) => void;
  startDownload: (
    formatString: string,
    isAudio: boolean,
    customName?: string,
    targetUrl?: string,
  ) => void;
  formatDuration: (secs: number) => string;
}

const entries = (payload: DiscoveryPayload): PlaylistTrack[] => {
  const list = (payload as GenericPlaylistMetadata).entries ?? [];
  return list.map((entry) => {
    const track: PlaylistTrack = {
      id: entry.id,
      title: entry.title,
      url: entry.url,
      duration: entry.duration ?? 0,
    };
    if (entry.thumbnails !== undefined) {
      track.thumbnails = entry.thumbnails;
    }
    return track;
  });
};

const toggleTrack = (current: string[], trackId: string): string[] =>
  current.includes(trackId) ? current.filter((id) => id !== trackId) : [...current, trackId];

export function PlaylistView(props: PlaylistViewProps): JSX.Element {
  const list = (): PlaylistTrack[] => entries(props.payload());
  const allSelected = (): boolean =>
    list().length > 0 && props.selectedTracks().length === list().length;

  return (
    <div class="flex flex-col gap-4 sm:gap-5 text-left select-none">
      <PlaylistHeader
        presetList={props.presetList}
        selectedPreset={props.selectedPreset}
        setSelectedPreset={props.setSelectedPreset}
        downloadAllPlaylist={props.downloadAllPlaylist}
        selectedCount={props.selectedTracks().length}
      />

      <SubtitleStrip
        displaySubOptions={props.displaySubOptions}
        hasPredefined={props.subOptions.length > 0}
        selectedSubs={props.selectedSubs}
        toggleSub={props.toggleSub}
      />

      <TrackList
        list={list()}
        allSelected={allSelected()}
        selectedTracks={props.selectedTracks}
        setSelectedTracks={props.setSelectedTracks}
        parsingTracks={props.parsingTracks}
        handleParseTrack={props.handleParseTrack}
        downloadSubtitle={props.downloadSubtitle}
        startDownload={props.startDownload}
        selectedPreset={props.selectedPreset}
        formatDuration={props.formatDuration}
        hasSubs={props.displaySubOptions.length > 0}
      />
    </div>
  );
}

interface PlaylistHeaderProps {
  presetList: PresetOption[];
  selectedPreset: Accessor<string>;
  setSelectedPreset: Setter<string>;
  downloadAllPlaylist: () => void;
  selectedCount: number;
}

function PlaylistHeader(props: PlaylistHeaderProps): JSX.Element {
  return (
    <div class="w-full bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3.5">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="flex flex-col gap-1 max-w-md">
          <div class="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500">
            <Sliders class="w-4 h-4 text-blue-500" />
            <h3 class="text-[10px] font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
              Playlist Fallback Preferences
            </h3>
          </div>
          <p class="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-sans">
            Select a fallback quality preset. This configuration rules target priorities for all
            media downloads inside this batch queue.
          </p>
        </div>

        <div class="flex flex-col md:flex-row items-stretch md:items-center gap-2.5 min-w-0 w-full md:w-auto">
          <select
            value={props.selectedPreset()}
            onChange={(event) => props.setSelectedPreset(event.currentTarget.value)}
            class="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded min-h-[36px] px-2.5 outline-none text-[11px] font-semibold w-full md:w-48 overflow-hidden text-ellipsis"
          >
            <For each={props.presetList}>
              {(preset) => <option value={preset.value}>{preset.label}</option>}
            </For>
          </select>

          <button
            onClick={props.downloadAllPlaylist}
            class="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded shadow-sm hover:-translate-y-0.5 active:translate-y-0 transition-all overflow-hidden min-h-[36px]"
            type="button"
          >
            <Download class="w-4 h-4 flex-shrink-0" />
            <span class="truncate text-[10px] uppercase tracking-wider font-extrabold">
              {props.selectedCount > 0 ? `Download (${props.selectedCount})` : "Download Playlist"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface SubtitleStripProps {
  displaySubOptions: SubtitleOption[];
  hasPredefined: boolean;
  selectedSubs: Accessor<string[]>;
  toggleSub: (lang: string) => void;
}

function SubtitleStrip(props: SubtitleStripProps): JSX.Element {
  return (
    <div class="w-full bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3.5 flex flex-col gap-2.5">
      <div class="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500 px-0.5">
        <Globe class="w-4 h-4 text-emerald-500" />
        <h3 class="text-[10px] font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
          {props.hasPredefined
            ? "Global Subtitle Selection"
            : "Global Subtitle Selection (Pre-Given List)"}
        </h3>
      </div>

      <Show
        when={props.displaySubOptions.length > 0}
        fallback={
          <span class="text-[10px] text-zinc-500 italic px-0.5">No subtitles available</span>
        }
      >
        <div class="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded">
          <For each={props.displaySubOptions}>
            {(option) => {
              const isChecked = (): boolean => props.selectedSubs().includes(option.lang);
              return (
                <label
                  class={cn(
                    "flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded border cursor-pointer transition-colors shadow-sm",
                    isChecked()
                      ? "bg-purple-500/10 border-purple-500 text-purple-700 dark:text-purple-400 font-extrabold"
                      : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800/85 text-zinc-700 dark:text-zinc-300 hover:border-purple-500",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isChecked()}
                    onChange={() => props.toggleSub(option.lang)}
                    class="accent-purple-500 w-3 h-3 cursor-pointer"
                  />
                  {option.name} {option.lang !== "all" && `(${option.lang.toUpperCase()})`}
                </label>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  );
}

interface TrackListProps {
  list: PlaylistTrack[];
  allSelected: boolean;
  selectedTracks: Accessor<string[]>;
  setSelectedTracks: Setter<string[]>;
  parsingTracks: Accessor<Record<string, boolean>>;
  handleParseTrack: (track: PlaylistTrack) => void;
  downloadSubtitle: (targetUrl: string, trackTitle: string) => void;
  startDownload: (
    formatString: string,
    isAudio: boolean,
    customName?: string,
    targetUrl?: string,
  ) => void;
  selectedPreset: Accessor<string>;
  formatDuration: (secs: number) => string;
  hasSubs: boolean;
}

function TrackList(props: TrackListProps): JSX.Element {
  return (
    <div class="flex flex-col gap-2.5">
      <div class="flex items-center justify-between gap-2 px-0.5">
        <div class="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500">
          <List class="w-3.5 h-3.5 text-purple-500" />
          <h3 class="text-[10px] font-bold uppercase tracking-wider">
            Playlist Tracks ({props.list.length})
          </h3>
        </div>

        <button
          onClick={() => {
            if (props.allSelected) {
              props.setSelectedTracks([]);
            } else {
              props.setSelectedTracks(props.list.map((track) => track.id));
            }
          }}
          class="text-[10px] text-purple-600 dark:text-purple-400 font-extrabold uppercase tracking-wider hover:underline select-none"
          type="button"
        >
          {props.allSelected ? "Deselect All" : "Select All"}
        </button>
      </div>

      <div class="grid grid-cols-1 gap-2 w-full">
        <For each={props.list}>
          {(track, index) => (
            <TrackRow
              track={track}
              index={index()}
              isSelected={() => props.selectedTracks().includes(track.id)}
              onToggle={() => props.setSelectedTracks((prev) => toggleTrack(prev, track.id))}
              isParsing={() => props.parsingTracks()[track.id] === true}
              onConfigure={() => props.handleParseTrack(track)}
              onDownloadSubtitle={() => props.downloadSubtitle(track.url, track.title)}
              onQueue={() =>
                props.startDownload(props.selectedPreset(), false, track.title, track.url)
              }
              formatDuration={props.formatDuration}
              showSubtitleButton={props.hasSubs}
            />
          )}
        </For>
      </div>
    </div>
  );
}

interface TrackRowProps {
  track: PlaylistTrack;
  index: number;
  isSelected: () => boolean;
  onToggle: () => void;
  isParsing: () => boolean;
  onConfigure: () => void;
  onDownloadSubtitle: () => void;
  onQueue: () => void;
  formatDuration: (secs: number) => string;
  showSubtitleButton: boolean;
}

function TrackRow(props: TrackRowProps): JSX.Element {
  const thumb = (): string | undefined => props.track.thumbnails?.[0]?.url;
  return (
    <div class="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-md shadow-sm transition-colors hover:bg-zinc-50/20 dark:hover:bg-zinc-900/10">
      <div class="p-2 sm:p-2.5 flex flex-row items-center justify-between gap-1.5 sm:gap-4 min-w-0">
        <button
          onClick={props.onToggle}
          class="p-1 text-zinc-400 hover:text-purple-500 transition-colors flex-shrink-0"
          type="button"
          aria-label={props.isSelected() ? "Deselect track" : "Select track"}
        >
          <Show when={props.isSelected()} fallback={<Square class="w-4 h-4" />}>
            <CheckSquare class="w-4 h-4 text-purple-500" />
          </Show>
        </button>

        <div class="flex items-center gap-2 sm:gap-3 flex-grow text-left min-w-0">
          <span class="text-[9px] font-bold text-zinc-400 font-mono w-4">
            {(props.index + 1).toString().padStart(2, "0")}
          </span>
          <Show when={thumb()}>
            <img
              src={thumb()!}
              alt={props.track.title}
              class="w-10 sm:w-16 aspect-video object-cover rounded border border-zinc-200 dark:border-zinc-800 flex-shrink-0"
            />
          </Show>
          <div class="flex flex-col gap-0.5 min-w-0">
            <span class="text-[11px] font-bold text-zinc-900 dark:text-zinc-200 line-clamp-1 leading-snug">
              {props.track.title}
            </span>
            <span class="text-[9px] font-mono text-zinc-500 dark:text-zinc-400">
              {props.formatDuration(props.track.duration)}
            </span>
          </div>
        </div>

        <div class="flex items-center gap-1.5 sm:gap-2">
          <TooltipedButton
            label="Configure Streams"
            disabled={props.isParsing()}
            accent="blue"
            onClick={props.onConfigure}
            icon={
              <Show when={props.isParsing()} fallback={<Sliders class="w-3.5 h-3.5" />}>
                <span class="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </Show>
            }
          />

          <Show when={props.showSubtitleButton}>
            <TooltipedButton
              label="Download Captions"
              accent="purple"
              onClick={props.onDownloadSubtitle}
              icon={<Globe class="w-3.5 h-3.5" />}
            />
          </Show>

          <TooltipedButton
            label="Queue Media"
            accent="zinc"
            onClick={props.onQueue}
            icon={<Download class="w-3.5 h-3.5" />}
            tooltipAlign="right"
          />
        </div>
      </div>
    </div>
  );
}

interface TooltipedButtonProps {
  label: string;
  accent: "blue" | "purple" | "zinc";
  disabled?: boolean;
  onClick: () => void;
  icon: JSX.Element;
  tooltipAlign?: "center" | "right";
}

function TooltipedButton(props: TooltipedButtonProps): JSX.Element {
  const tooltipClasses = (): string =>
    props.tooltipAlign === "right"
      ? "absolute bottom-full right-0 sm:left-1/2 sm:-translate-x-1/2"
      : "absolute bottom-full left-1/2 -translate-x-1/2";
  const accentClass = (): string => {
    switch (props.accent) {
      case "blue":
        return "bg-blue-500/10 hover:bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "purple":
        return "bg-purple-500/10 hover:bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/20";
      case "zinc":
        return "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-800";
    }
  };

  return (
    <div class="group relative inline-block">
      <button
        onClick={props.onClick}
        disabled={props.disabled}
        class={cn(
          "p-1.5 rounded transition-colors min-h-[30px] flex items-center justify-center border",
          accentClass(),
          props.disabled && "opacity-50 cursor-not-allowed",
        )}
        type="button"
      >
        {props.icon}
      </button>
      <div
        class={`${tooltipClasses()} mb-2 hidden group-hover:block bg-zinc-900 dark:bg-zinc-950 text-white text-[9px] font-bold uppercase tracking-wider shadow-md px-2 py-1 rounded z-[99] border border-zinc-800 whitespace-nowrap`}
      >
        {props.label}
      </div>
    </div>
  );
}
