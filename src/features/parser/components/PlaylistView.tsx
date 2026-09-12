import {
  createSignal,
  createMemo,
  Show,
  For,
  type Accessor,
  type Setter,
  type JSX,
} from "solid-js";
import { Sliders, Download, Globe, List, Search, X } from "lucide-solid";
import { cn } from "@/utils/cn";
import { AdaptiveTooltip } from "@/components/AdaptiveTooltip";
import { Checkbox } from "@/components/Checkbox";
import { CustomSelect, type CustomSelectOption } from "@/components/CustomSelect";
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

const PRESET_TAG_MAP: Record<string, { tag: string; tagClass: string }> = {
  "bestvideo+bestaudio/best": {
    tag: "4K+",
    tagClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best": {
    tag: "MP4",
    tagClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  "bestvideo[height<=1440]+bestaudio/best": {
    tag: "1440P",
    tagClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  },
  "bestvideo[height<=1080]+bestaudio/best": {
    tag: "1080P",
    tagClass: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
  },
  "bestvideo[height<=720]+bestaudio/best": {
    tag: "720P",
    tagClass: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
  },
  "bestvideo[height<=480]+bestaudio/best": {
    tag: "480P",
    tagClass: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
  },
  "bestvideo[height<=360]+bestaudio/best": {
    tag: "360P",
    tagClass: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
  },
  "bestaudio/best": {
    tag: "AUDIO",
    tagClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  "bestaudio[ext=m4a]/bestaudio/best": {
    tag: "M4A",
    tagClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
};

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

const parseRangeIndices = (input: string, totalCount: number): number[] => {
  const clean = input.trim();
  if (!clean) return [];
  const indices = new Set<number>();
  const parts = clean.split(",");
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.includes("-")) {
      const [startStr, endStr] = trimmed.split("-");
      const start = parseInt(startStr?.trim() ?? "", 10);
      const end = parseInt(endStr?.trim() ?? "", 10);
      if (!isNaN(start) && !isNaN(end)) {
        const min = Math.max(1, Math.min(start, end));
        const max = Math.min(totalCount, Math.max(start, end));
        for (let i = min; i <= max; i++) {
          indices.add(i);
        }
      }
    } else {
      const idx = parseInt(trimmed, 10);
      if (!isNaN(idx) && idx >= 1 && idx <= totalCount) {
        indices.add(idx);
      }
    }
  }
  return Array.from(indices);
};

export function PlaylistView(props: PlaylistViewProps): JSX.Element {
  const list = (): PlaylistTrack[] => entries(props.payload());

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
  const presetOptions = (): CustomSelectOption[] =>
    props.presetList.map((preset) => {
      const meta = PRESET_TAG_MAP[preset.value];
      const opt: CustomSelectOption = {
        value: preset.value,
        label: preset.label,
        tag: meta?.tag ?? "PRESET",
      };
      if (meta?.tagClass) {
        opt.tagClass = meta.tagClass;
      }
      return opt;
    });

  return (
    <div class="w-full bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 relative z-20 shadow-xs">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="flex flex-col gap-1 max-w-md">
          <div class="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500">
            <Sliders class="w-4 h-4 text-blue-500" />
            <h3 class="text-[10px] font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
              Playlist Quality Presets
            </h3>
          </div>
          <p class="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-sans">
            Select a quality preset to rule download priorities for all media inside this batch
            queue.
          </p>
        </div>

        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 min-w-0 w-full md:w-auto">
          <div class="w-full sm:w-64">
            <CustomSelect
              value={props.selectedPreset()}
              onChange={props.setSelectedPreset}
              options={presetOptions()}
              placeholder="Select quality preset"
              icon={Sliders}
              compact
            />
          </div>

          <AdaptiveTooltip
            content={
              props.selectedCount > 0
                ? `Queue ${props.selectedCount} selected tracks for download`
                : "Queue all playlist tracks for download"
            }
          >
            <button
              onClick={props.downloadAllPlaylist}
              class="w-full sm:w-auto flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-bold px-4 py-2 rounded-xl shadow-xs hover:-translate-y-0.5 active:translate-y-0 transition-all min-h-[36px] cursor-pointer text-[11px] uppercase tracking-wider flex-shrink-0"
              type="button"
            >
              <Download class="w-3.5 h-3.5 flex-shrink-0" />
              <span class="truncate font-extrabold">
                {props.selectedCount > 0
                  ? `Download (${props.selectedCount})`
                  : "Download Playlist"}
              </span>
            </button>
          </AdaptiveTooltip>
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
    <div class="w-full bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col gap-3 relative z-10 shadow-xs">
      <div class="flex items-center justify-between px-0.5 text-zinc-400 dark:text-zinc-500">
        <div class="flex items-center gap-1.5">
          <Globe class="w-4 h-4 text-emerald-500" />
          <h3 class="text-[10px] font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
            {props.hasPredefined
              ? "Global Subtitle Selection"
              : "Global Subtitle Selection (Pre-Given List)"}
          </h3>
        </div>
        <Show when={props.displaySubOptions.length > 0}>
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-mono text-zinc-400">
              ({props.displaySubOptions.length})
            </span>
            <Show when={props.selectedSubs().length > 0}>
              <span class="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 font-bold">
                {props.selectedSubs().length} selected
              </span>
            </Show>
          </div>
        </Show>
      </div>

      <Show
        when={props.displaySubOptions.length > 0}
        fallback={
          <div class="text-center py-4 flex flex-col items-center gap-1.5">
            <Globe class="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
            <span class="text-[10px] text-zinc-500 dark:text-zinc-400 italic">
              No subtitles available for this playlist.
            </span>
          </div>
        }
      >
        <div class="flex flex-wrap gap-1.5 h-36 overflow-y-auto p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl min-w-0 custom-scrollbar content-start">
          <For each={props.displaySubOptions}>
            {(option) => {
              const isChecked = (): boolean => props.selectedSubs().includes(option.lang);
              return (
                <label
                  class={cn(
                    "flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-lg border cursor-pointer transition-colors shadow-xs select-none",
                    isChecked()
                      ? "bg-purple-500/10 border-purple-500 text-purple-700 dark:text-purple-400 font-extrabold"
                      : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800/85 text-zinc-700 dark:text-zinc-300 hover:border-purple-500",
                  )}
                >
                  <Checkbox
                    checked={isChecked()}
                    onChange={() => props.toggleSub(option.lang)}
                    color="purple"
                    size="sm"
                  />
                  <span>
                    {option.name} {option.lang !== "all" && `(${option.lang.toUpperCase()})`}
                  </span>
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
  const [searchQuery, setSearchQuery] = createSignal("");
  const [rangeInput, setRangeInput] = createSignal("");

  const filteredList = createMemo(() => {
    const q = searchQuery().trim().toLowerCase();
    if (!q) return props.list;
    return props.list.filter((track) => track.title.toLowerCase().includes(q));
  });

  const allFilteredSelected = createMemo(() => {
    const fl = filteredList();
    if (fl.length === 0) return false;
    return fl.every((t) => props.selectedTracks().includes(t.id));
  });

  const handleSelectAllFiltered = (): void => {
    const fl = filteredList();
    if (allFilteredSelected()) {
      const flIds = new Set(fl.map((t) => t.id));
      props.setSelectedTracks((prev) => prev.filter((id) => !flIds.has(id)));
    } else {
      const flIds = fl.map((t) => t.id);
      props.setSelectedTracks((prev) => Array.from(new Set([...prev, ...flIds])));
    }
  };

  const handleApplyRange = (): void => {
    const indices = parseRangeIndices(rangeInput(), props.list.length);
    if (indices.length === 0) return;
    const idsToSelect = indices.map((idx) => props.list[idx - 1]?.id).filter(Boolean) as string[];
    props.setSelectedTracks((prev) => Array.from(new Set([...prev, ...idsToSelect])));
    setRangeInput("");
  };

  return (
    <div class="flex flex-col gap-3">
      {/* Header with Title and Selection Status */}
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-0.5">
        <div class="flex items-center gap-2 text-zinc-400 dark:text-zinc-500">
          <List class="w-4 h-4 text-purple-500 flex-shrink-0" />
          <h3 class="text-[11px] font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
            Playlist Tracks ({props.list.length})
          </h3>
          <Show when={props.selectedTracks().length > 0}>
            <span class="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 font-bold">
              {props.selectedTracks().length} selected
            </span>
          </Show>
        </div>

        <div class="flex items-center gap-2">
          <AdaptiveTooltip
            content={
              allFilteredSelected()
                ? searchQuery()
                  ? "Deselect matching tracks"
                  : "Deselect all tracks"
                : searchQuery()
                  ? "Select all matching tracks"
                  : "Select all tracks"
            }
          >
            <button
              onClick={handleSelectAllFiltered}
              class="text-[10px] text-purple-600 dark:text-purple-400 font-extrabold uppercase tracking-wider hover:underline select-none cursor-pointer flex items-center gap-1"
              type="button"
            >
              {allFilteredSelected()
                ? searchQuery()
                  ? "Deselect Matching"
                  : "Deselect All"
                : searchQuery()
                  ? "Select Matching"
                  : "Select All"}
            </button>
          </AdaptiveTooltip>

          <Show when={props.selectedTracks().length > 0}>
            <span class="text-zinc-300 dark:text-zinc-700">•</span>
            <button
              onClick={() => props.setSelectedTracks([])}
              class="text-[10px] text-zinc-500 hover:text-red-500 dark:text-zinc-400 dark:hover:text-red-400 font-bold uppercase tracking-wider hover:underline select-none cursor-pointer"
              type="button"
            >
              Clear
            </button>
          </Show>
        </div>
      </div>

      {/* Input controls bar: Search input & Range selection input */}
      <div class="grid grid-cols-1 sm:grid-cols-12 gap-2 w-full">
        {/* Search input tag */}
        <div class="relative sm:col-span-7">
          <Search class="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search tracks by title..."
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
            class="w-full pl-8.5 pr-8 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-purple-500 outline-none transition-colors"
          />
          <Show when={searchQuery()}>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              class="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 rounded cursor-pointer"
              title="Clear search"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          </Show>
        </div>

        {/* Range selection input tag */}
        <div class="flex items-center gap-1.5 sm:col-span-5">
          <div class="relative flex-1 min-w-0">
            <input
              type="text"
              placeholder="Range e.g. 1-10, 15..."
              value={rangeInput()}
              onInput={(e) => setRangeInput(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleApplyRange();
                }
              }}
              class="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-purple-500 outline-none transition-colors font-mono"
            />
            <Show when={rangeInput()}>
              <button
                type="button"
                onClick={() => setRangeInput("")}
                class="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 rounded cursor-pointer"
                title="Clear range"
              >
                <X class="w-3 h-3" />
              </button>
            </Show>
          </div>
          <AdaptiveTooltip content="Select tracks matching range (e.g. 1-10, 15)">
            <button
              type="button"
              onClick={handleApplyRange}
              disabled={!rangeInput().trim()}
              class="px-3 py-2 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:opacity-40 disabled:hover:bg-purple-600 text-white rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-colors min-h-[36px] flex items-center justify-center flex-shrink-0 cursor-pointer shadow-xs"
            >
              Apply
            </button>
          </AdaptiveTooltip>
        </div>
      </div>

      {/* Scrollable Track Container */}
      <div class="h-[520px] overflow-y-auto pr-1.5 p-2 bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl custom-scrollbar">
        <Show
          when={filteredList().length > 0}
          fallback={
            <div class="h-full flex flex-col items-center justify-center py-12 text-center gap-2">
              <Search class="w-6 h-6 text-zinc-400 dark:text-zinc-600" />
              <span class="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                No tracks match "{searchQuery()}"
              </span>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                class="mt-1 text-[11px] text-purple-600 dark:text-purple-400 font-bold hover:underline cursor-pointer"
              >
                Clear filter
              </button>
            </div>
          }
        >
          <div class="grid grid-cols-1 gap-2">
            <For each={filteredList()}>
              {(track) => {
                const originalIndex = () => props.list.findIndex((t) => t.id === track.id);
                return (
                  <TrackRow
                    track={track}
                    index={originalIndex()}
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
                );
              }}
            </For>
          </div>
        </Show>
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
    <div
      class={cn(
        "border rounded-xl shadow-xs transition-colors select-none",
        props.isSelected()
          ? "border-purple-500/50 bg-purple-50/20 dark:bg-purple-950/20"
          : "border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40",
      )}
    >
      <div class="p-2 sm:p-2.5 flex flex-row items-center justify-between gap-1.5 sm:gap-4 min-w-0">
        <div class="flex-shrink-0 flex items-center">
          <Checkbox
            checked={props.isSelected()}
            onChange={props.onToggle}
            color="purple"
            size="sm"
            ariaLabel={props.isSelected() ? "Deselect track" : "Select track"}
          />
        </div>

        <div class="flex items-center gap-2 sm:gap-3 flex-grow text-left min-w-0">
          <span class="text-[9px] font-bold text-zinc-400 font-mono w-5">
            {(props.index + 1).toString().padStart(2, "0")}
          </span>
          <Show when={thumb()}>
            {(t) => (
              <img
                src={t()}
                alt={props.track.title}
                class="w-10 sm:w-16 aspect-video object-cover rounded-lg border border-zinc-200 dark:border-zinc-800 flex-shrink-0"
              />
            )}
          </Show>
          <div class="flex flex-col gap-0.5 min-w-0">
            <span class="text-xs font-bold text-zinc-900 dark:text-zinc-200 line-clamp-1 leading-snug">
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
            onClick={props.onConfigure}
            accent="blue"
            icon={<Sliders class="w-3.5 h-3.5" />}
          />
          <Show when={props.showSubtitleButton}>
            <TooltipedButton
              label="Download Subtitle"
              onClick={props.onDownloadSubtitle}
              accent="zinc"
              icon={<Globe class="w-3.5 h-3.5" />}
            />
          </Show>
          <TooltipedButton
            label="Queue Download"
            onClick={props.onQueue}
            accent="purple"
            tooltipAlign="right"
            icon={<Download class="w-3.5 h-3.5" />}
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
    <AdaptiveTooltip content={props.label}>
      <button
        onClick={props.onClick}
        disabled={props.disabled}
        class={cn(
          "p-1.5 rounded-lg transition-colors min-h-[30px] flex items-center justify-center border cursor-pointer",
          accentClass(),
          props.disabled && "opacity-50 cursor-not-allowed",
        )}
        type="button"
      >
        {props.icon}
      </button>
    </AdaptiveTooltip>
  );
}
