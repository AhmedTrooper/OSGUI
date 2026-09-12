import { Show, For, type Accessor, type Setter, type JSX } from "solid-js";
import { Sliders, ToggleLeft, Film, Music, CheckCircle2, Globe } from "lucide-solid";
import { cn } from "@/utils/cn";
import { AdaptiveTooltip } from "@/components/AdaptiveTooltip";
import { Checkbox } from "@/components/Checkbox";
import type { Format, PresetOption, SubtitleOption } from "@/core/types/ytdlp.types";

export type SelectionMode = "custom" | "fallback";

export interface SingleVideoViewProps {
  url: string;
  title: string;
  selectionMode: Accessor<SelectionMode>;
  setSelectionMode: Setter<SelectionMode>;
  selectedVideo: Accessor<string>;
  setSelectedVideo: Setter<string>;
  selectedAudio: Accessor<string>;
  setSelectedAudio: Setter<string>;
  selectedPreset: Accessor<string>;
  setSelectedPreset: Setter<string>;
  videoStreams: Format[];
  audioStreams: Format[];
  presetList: PresetOption[];
  getGeneratedFormatString: () => string;
  startDownload: (format: string, isAudio?: boolean) => void;
  displaySubOptions: SubtitleOption[];
  selectedSubs: Accessor<string[]>;
  toggleSub: (lang: string) => void;
  downloadSubtitle: (targetUrl: string, trackTitle: string) => void;
  formatSize: (bytes: number | null | undefined) => string;
  subOptions: SubtitleOption[];
}

const isAudioOnlyFormat = (format: string): boolean =>
  format.includes("bestaudio") && !format.includes("bestvideo");

const streamLabel = (format: Format): string => format.format_note ?? `${format.height ?? "?"}p`;

const streamMeta = (format: Format, formatSize: string): string => {
  const resolution = format.resolution ?? `${format.width ?? "?"}x${format.height ?? "?"}`;
  return `${resolution} • ${formatSize}`;
};

export function SingleVideoView(props: SingleVideoViewProps): JSX.Element {
  return (
    <div class="flex flex-col-reverse md:grid md:grid-cols-3 gap-4 sm:gap-6 text-left min-w-0 select-none">
      <div class="md:col-span-2 flex flex-col gap-4 sm:gap-6 min-w-0">
        <div class="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/40 w-full rounded-t-md overflow-hidden flex-shrink-0">
          <button
            type="button"
            onClick={() => props.setSelectionMode("custom")}
            class={cn(
              "flex items-center gap-2 px-4 py-2.5 border-r border-zinc-200 dark:border-zinc-800 text-[11px] font-bold uppercase tracking-wider transition-all select-none min-h-[38px]",
              props.selectionMode() === "custom"
                ? "bg-white dark:bg-zinc-950 text-blue-600 dark:text-blue-400 border-t-2 border-t-blue-500 dark:border-t-blue-400 font-extrabold"
                : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-300",
            )}
          >
            <Sliders class="w-3.5 h-3.5" />
            Custom Formats
          </button>
          <button
            type="button"
            onClick={() => props.setSelectionMode("fallback")}
            class={cn(
              "flex items-center gap-2 px-4 py-2.5 border-r border-zinc-200 dark:border-zinc-800 text-[11px] font-bold uppercase tracking-wider transition-all select-none min-h-[38px]",
              props.selectionMode() === "fallback"
                ? "bg-white dark:bg-zinc-950 text-blue-600 dark:text-blue-400 border-t-2 border-t-blue-500 dark:border-t-blue-400 font-extrabold"
                : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-300",
            )}
          >
            <ToggleLeft class="w-3.5 h-3.5" />
            Adaptive Presets
          </button>
        </div>

        <Show
          when={props.selectionMode() === "fallback"}
          fallback={
            <div class="flex flex-col gap-5 min-w-0">
              <StreamPickerPanel
                icon={<Film class="w-4 h-4 text-blue-500" />}
                title="Select Video Stream"
                streams={props.videoStreams}
                selected={props.selectedVideo}
                onSelect={(formatId) =>
                  props.setSelectedVideo(props.selectedVideo() === formatId ? "" : formatId)
                }
                accent="blue"
                emptyLabel="No separate video-only streams discovered."
                formatSize={props.formatSize}
                labelOf={streamLabel}
                metaOf={streamMeta}
              />

              <StreamPickerPanel
                icon={<Music class="w-4 h-4 text-emerald-500" />}
                title="Select Audio Stream"
                streams={props.audioStreams}
                selected={props.selectedAudio}
                onSelect={(formatId) =>
                  props.setSelectedAudio(props.selectedAudio() === formatId ? "" : formatId)
                }
                accent="emerald"
                emptyLabel="No separate audio-only streams discovered."
                formatSize={props.formatSize}
                labelOf={(format) => format.format_note ?? "Audio Only"}
                metaOf={(format) => {
                  const bitrate = format.abr ? `${format.abr.toFixed(0)}kbps` : "HQ";
                  return `${bitrate} • ${props.formatSize(format.filesize ?? format.filesize_approx)}`;
                }}
              />
            </div>
          }
        >
          <PresetPickerPanel
            icon={<Sliders class="w-4 h-4 text-blue-500" />}
            title="Select Fallback Preference Preset"
            presets={props.presetList}
            selected={props.selectedPreset}
            onSelect={props.setSelectedPreset}
          />
        </Show>
      </div>

      <div class="flex flex-col gap-5 min-w-0">
        <DownloadPanel
          formatString={props.getGeneratedFormatString()}
          startDownload={(format) =>
            props.startDownload(format, isAudioOnlyFormat(props.getGeneratedFormatString()))
          }
        />

        <SubtitlePanel
          displaySubOptions={props.displaySubOptions}
          selectedSubs={props.selectedSubs}
          toggleSub={props.toggleSub}
          downloadSubtitle={() => props.downloadSubtitle(props.url, props.title)}
          hasPredefined={props.subOptions.length === 0}
        />
      </div>
    </div>
  );
}

interface StreamPickerPanelProps {
  icon: JSX.Element;
  title: string;
  streams: Format[];
  selected: Accessor<string>;
  onSelect: (formatId: string) => void;
  accent: "blue" | "emerald";
  emptyLabel: string;
  formatSize: (bytes: number | null | undefined) => string;
  labelOf: (format: Format) => string;
  metaOf: (format: Format, formatSize: string) => string;
}

function StreamPickerPanel(props: StreamPickerPanelProps): JSX.Element {
  const accentRing = (): string =>
    props.accent === "blue"
      ? "border-blue-500 dark:border-blue-400 bg-blue-50/20 dark:bg-blue-500/5 shadow-sm"
      : "border-emerald-500 dark:border-emerald-400 bg-emerald-50/20 dark:bg-emerald-500/5 shadow-sm";
  const accentIcon = (): string => (props.accent === "blue" ? "text-blue-500" : "text-emerald-500");

  return (
    <div class="flex flex-col gap-2 min-w-0">
      <div class="flex items-center justify-between gap-2 text-zinc-400 dark:text-zinc-500 px-0.5">
        <div class="flex items-center gap-2">
          {props.icon}
          <span class="text-[10px] font-bold uppercase tracking-wider">{props.title}</span>
        </div>
        <span class="text-[10px] font-mono text-zinc-400">({props.streams.length} formats)</span>
      </div>

      <div class="hidden sm:block min-w-0">
        <div class="h-60 overflow-y-auto pr-1.5 p-2 bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl custom-scrollbar">
          <Show
            when={props.streams.length > 0}
            fallback={
              <div class="h-full flex items-center justify-center py-8">
                <span class="text-[11px] italic text-zinc-500 dark:text-zinc-400">
                  {props.emptyLabel}
                </span>
              </div>
            }
          >
            <div class="grid grid-cols-2 gap-2">
              <For each={props.streams}>
                {(format) => {
                  const isSelected = (): boolean => props.selected() === format.format_id;
                  return (
                    <div
                      class={cn(
                        "border cursor-pointer select-none transition-colors rounded-lg p-2.5 flex flex-row items-center justify-between gap-2 text-left min-w-0",
                        isSelected()
                          ? accentRing()
                          : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700",
                      )}
                      onClick={() => props.onSelect(format.format_id)}
                    >
                      <div class="flex flex-col gap-0.5 min-w-0 text-left">
                        <span class="text-[11px] font-bold text-zinc-900 dark:text-zinc-200 leading-tight block truncate">
                          {props.labelOf(format)} ({format.ext})
                        </span>
                        <span class="text-[9px] text-zinc-500 dark:text-zinc-400 font-mono block truncate">
                          {props.metaOf(
                            format,
                            props.formatSize(format.filesize ?? format.filesize_approx),
                          )}
                        </span>
                      </div>
                      <Show when={isSelected()}>
                        <CheckCircle2 class={cn("w-3.5 h-3.5 flex-shrink-0", accentIcon())} />
                      </Show>
                    </div>
                  );
                }}
              </For>
            </div>
          </Show>
        </div>
      </div>

      <div class="block sm:hidden w-full">
        <select
          value={props.selected()}
          onChange={(event) => props.onSelect(event.currentTarget.value)}
          class="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-2 outline-none text-[10px] font-semibold max-w-full text-ellipsis overflow-hidden"
        >
          <option value="">(None) Deselect Stream</option>
          <For each={props.streams}>
            {(format) => (
              <option value={format.format_id}>
                {props.labelOf(format)} ({format.ext}) -{" "}
                {props.formatSize(format.filesize ?? format.filesize_approx)}
              </option>
            )}
          </For>
        </select>
      </div>
    </div>
  );
}

interface PresetPickerPanelProps {
  icon: JSX.Element;
  title: string;
  presets: PresetOption[];
  selected: Accessor<string>;
  onSelect: Setter<string>;
}

function PresetPickerPanel(props: PresetPickerPanelProps): JSX.Element {
  return (
    <div class="flex flex-col gap-2 min-w-0 animate-fade-in">
      <div class="flex items-center gap-2 text-zinc-400 dark:text-zinc-500 px-0.5">
        {props.icon}
        <span class="text-[10px] font-bold uppercase tracking-wider">{props.title}</span>
      </div>

      <div class="hidden sm:block min-w-0">
        <div class="h-[508px] overflow-y-auto pr-1.5 p-2 bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl custom-scrollbar">
          <div class="grid grid-cols-1 gap-2">
            <For each={props.presets}>
              {(preset) => {
                const isSelected = (): boolean => props.selected() === preset.value;
                return (
                  <div
                    class={cn(
                      "border cursor-pointer select-none transition-colors rounded-lg p-2.5 flex flex-row items-center justify-between gap-2 text-left min-w-0",
                      isSelected()
                        ? "border-blue-500 dark:border-blue-400 bg-blue-50/20 dark:bg-blue-500/5 shadow-sm"
                        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700",
                    )}
                    onClick={() => props.onSelect(preset.value)}
                  >
                    <div class="flex flex-col gap-0.5 min-w-0 text-left">
                      <span class="text-[11px] font-bold text-zinc-900 dark:text-zinc-200 leading-tight block">
                        {preset.label}
                      </span>
                      <span class="text-[9px] text-zinc-500 dark:text-zinc-400 font-mono block truncate">
                        {preset.value}
                      </span>
                    </div>
                    <Show when={isSelected()}>
                      <CheckCircle2 class="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                    </Show>
                  </div>
                );
              }}
            </For>
          </div>
        </div>
      </div>

      <div class="block sm:hidden w-full">
        <select
          value={props.selected()}
          onChange={(event) => props.onSelect(event.currentTarget.value)}
          class="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-2 outline-none text-[10px] font-semibold max-w-full text-ellipsis overflow-hidden"
        >
          <For each={props.presets}>
            {(preset) => <option value={preset.value}>{preset.label}</option>}
          </For>
        </select>
      </div>
    </div>
  );
}

interface DownloadPanelProps {
  formatString: string;
  startDownload: (format: string) => void;
}

function DownloadPanel(props: DownloadPanelProps): JSX.Element {
  return (
    <div class="flex flex-col gap-2 min-w-0">
      <div class="flex items-center gap-1.5 px-0.5 text-zinc-400 dark:text-zinc-500">
        <Sliders class="w-3.5 h-3.5" />
        <h3 class="text-[10px] font-bold uppercase tracking-wider">Download Manager</h3>
      </div>

      <div class="border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 rounded-md p-3.5 min-w-0">
        <div class="flex flex-col gap-3 min-w-0">
          <div class="flex flex-col gap-1.5 text-left min-w-0">
            <label class="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Generated Format String
            </label>
            <div class="bg-zinc-950 text-zinc-300 dark:bg-black border border-zinc-800 p-2.5 rounded font-mono text-[9px] break-all select-text">
              {props.formatString}
            </div>
          </div>
          <AdaptiveTooltip content="Add selected media stream format to download queue">
            <button
              onClick={() => props.startDownload(props.formatString)}
              class="flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white font-bold w-full py-2.5 rounded hover:-translate-y-0.5 active:translate-y-0 transition-all overflow-hidden px-2 min-h-[36px] cursor-pointer"
              type="button"
            >
              <span class="truncate text-[11px] uppercase tracking-wider font-extrabold">
                Queue Download
              </span>
            </button>
          </AdaptiveTooltip>
        </div>
      </div>
    </div>
  );
}

interface SubtitlePanelProps {
  displaySubOptions: SubtitleOption[];
  selectedSubs: Accessor<string[]>;
  toggleSub: (lang: string) => void;
  downloadSubtitle: () => void;
  hasPredefined: boolean;
}

function SubtitlePanel(props: SubtitlePanelProps): JSX.Element {
  return (
    <div class="flex flex-col gap-2 min-w-0">
      <div class="flex items-center justify-between px-0.5 text-zinc-400 dark:text-zinc-500">
        <div class="flex items-center gap-1.5">
          <Globe class="w-3.5 h-3.5 text-emerald-500" />
          <h3 class="text-[10px] font-bold uppercase tracking-wider">Language Subtitles</h3>
        </div>
        <Show when={props.displaySubOptions.length > 0}>
          <span class="text-[10px] font-mono text-zinc-400">
            ({props.displaySubOptions.length})
          </span>
        </Show>
      </div>

      <div class="border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 rounded-xl p-3 min-w-0">
        <div class="flex flex-col gap-3 min-w-0">
          <Show
            when={props.displaySubOptions.length > 0}
            fallback={
              <div class="text-center py-6 flex flex-col items-center gap-1.5">
                <Globe class="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                <span class="text-[10px] text-zinc-500 dark:text-zinc-400 italic">
                  No subtitles found.
                </span>
              </div>
            }
          >
            <div class="flex flex-col gap-1.5 text-left min-w-0">
              <label class="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Select Languages {props.hasPredefined && "(Pre-Given List)"}
              </label>
              <div class="flex flex-wrap gap-1.5 h-48 overflow-y-auto p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg min-w-0 custom-scrollbar content-start">
                <For each={props.displaySubOptions}>
                  {(option) => {
                    const isChecked = (): boolean => props.selectedSubs().includes(option.lang);
                    return (
                      <label
                        class={cn(
                          "flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded border cursor-pointer transition-colors shadow-xs",
                          isChecked()
                            ? "bg-purple-500/10 border-purple-500 text-purple-700 dark:text-purple-400 font-extrabold"
                            : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:border-purple-500",
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
            </div>
            <AdaptiveTooltip content="Download selected subtitles for this media">
              <button
                onClick={props.downloadSubtitle}
                disabled={props.selectedSubs().length === 0}
                class="flex items-center justify-center bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-bold border border-zinc-200 dark:border-zinc-700 w-full py-2 rounded-lg shadow-sm disabled:opacity-50 min-h-[34px] px-2 text-[10px] uppercase tracking-wider cursor-pointer transition-colors"
                type="button"
              >
                Download Subtitle
              </button>
            </AdaptiveTooltip>
          </Show>
        </div>
      </div>
    </div>
  );
}
