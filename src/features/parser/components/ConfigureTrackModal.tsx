import { Show, For, type Accessor, type Setter, type JSX } from "solid-js";
import { X, Sparkles, Film, ToggleLeft, Music, CheckCircle2, Globe, Sliders } from "lucide-solid";
import { cn } from "@/utils/cn";
import { AdaptiveTooltip } from "@/components/AdaptiveTooltip";
import { Checkbox } from "@/components/Checkbox";
import type {
  DiscoveryPayload,
  PresetOption,
  SubtitleOption,
  VideoMetadata,
} from "@/core/types/ytdlp.types";

export type ModalSelectionMode = "custom" | "fallback";

export interface ConfigureTrackModalProps {
  showModal: Accessor<boolean>;
  setShowModal: Setter<boolean>;
  activeTrackPayload: Accessor<DiscoveryPayload | null>;
  activeTrackFile: Accessor<{ title?: string } | null>;
  modalSelectionMode: Accessor<ModalSelectionMode>;
  setModalSelectionMode: Setter<ModalSelectionMode>;
  modalSelectedVideo: Accessor<string>;
  setModalSelectedVideo: Setter<string>;
  modalSelectedAudio: Accessor<string>;
  setModalSelectedAudio: Setter<string>;
  modalSelectedPreset: Accessor<string>;
  setModalSelectedPreset: Setter<string>;
  modalSelectedSubs: Accessor<string[]>;
  toggleModalSub: (lang: string) => void;
  modalDisplaySubOptions: SubtitleOption[];
  presetList: PresetOption[];
  formatSize: (bytes: number | null | undefined) => string;
  startModalDownload: () => void;
}

const formatsOf = (payload: DiscoveryPayload | null): VideoMetadata["formats"] => {
  if (payload === null) return [];
  if (!("formats" in payload)) return [];
  return payload.formats;
};

export function ConfigureTrackModal(props: ConfigureTrackModalProps): JSX.Element {
  const videoStreams = (): VideoMetadata["formats"] =>
    formatsOf(props.activeTrackPayload()).filter(
      (format) =>
        format.vcodec !== "none" &&
        (format.format_note !== undefined || format.resolution !== undefined),
    );
  const audioStreams = (): VideoMetadata["formats"] =>
    formatsOf(props.activeTrackPayload()).filter(
      (format) => format.acodec !== "none" && format.vcodec === "none",
    );

  return (
    <Show when={props.showModal() && props.activeTrackPayload()}>
      <div class="fixed inset-0 bg-black/50 backdrop-blur-xs z-[100] flex items-center justify-center p-4 sm:p-6 select-none animate-fade-in font-sans">
        <div class="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md w-full max-w-xl max-h-[85vh] shadow-2xl p-4 sm:p-5 relative flex flex-col font-sans text-left overflow-hidden">
          <button
            onClick={() => props.setShowModal(false)}
            class="absolute top-4 right-4 p-1.5 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            type="button"
            aria-label="Close modal"
          >
            <X class="w-4 h-4" />
          </button>

          <div class="flex items-center gap-3 mb-4 pr-8">
            <div class="w-9 h-9 flex items-center justify-center bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded flex-shrink-0 border border-blue-500/20">
              <Sparkles class="w-4 h-4" />
            </div>
            <div class="min-w-0">
              <h3 class="text-sm font-bold text-zinc-950 dark:text-zinc-100 leading-tight">
                Configure Custom Track
              </h3>
              <p
                class="text-[9px] font-mono text-zinc-500 dark:text-zinc-400 truncate mt-1"
                title={props.activeTrackFile()?.title}
              >
                {props.activeTrackFile()?.title}
              </p>
            </div>
          </div>

          <div class="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/40 w-full mb-4 flex-shrink-0">
            <ModeTab
              active={props.modalSelectionMode() === "custom"}
              label="Custom Formats"
              icon={<Film class="w-3.5 h-3.5" />}
              onClick={() => props.setModalSelectionMode("custom")}
            />
            <ModeTab
              active={props.modalSelectionMode() === "fallback"}
              label="Adaptive Presets"
              icon={<ToggleLeft class="w-3.5 h-3.5" />}
              onClick={() => props.setModalSelectionMode("fallback")}
            />
          </div>

          <div class="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar pb-2">
            <Show
              when={props.modalSelectionMode() === "fallback"}
              fallback={
                <div class="space-y-4">
                  <FormatPanel
                    icon={<Film class="w-3.5 h-3.5 text-blue-500" />}
                    title="Video Format"
                    streams={videoStreams()}
                    selected={props.modalSelectedVideo}
                    onSelect={(id) =>
                      props.setModalSelectedVideo(props.modalSelectedVideo() === id ? "" : id)
                    }
                    accent="blue"
                    formatSize={props.formatSize}
                  />
                  <FormatPanel
                    icon={<Music class="w-3.5 h-3.5 text-emerald-500" />}
                    title="Audio Format"
                    streams={audioStreams()}
                    selected={props.modalSelectedAudio}
                    onSelect={(id) =>
                      props.setModalSelectedAudio(props.modalSelectedAudio() === id ? "" : id)
                    }
                    accent="emerald"
                    formatSize={props.formatSize}
                  />
                </div>
              }
            >
              <PresetPanel
                icon={<Sliders class="w-3.5 h-3.5 text-blue-500" />}
                title="Fallback Quality Preset"
                presets={props.presetList}
                selected={props.modalSelectedPreset}
                onSelect={props.setModalSelectedPreset}
              />
            </Show>

            <SubtitlePanel
              options={props.modalDisplaySubOptions}
              selected={props.modalSelectedSubs}
              onToggle={props.toggleModalSub}
            />
          </div>

          <div class="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={() => props.setShowModal(false)}
              class="px-4 py-2 rounded border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all text-[11px] uppercase tracking-wider min-h-[34px]"
            >
              Cancel
            </button>

            <AdaptiveTooltip content="Add configured media stream to download queue">
              <button
                type="button"
                onClick={props.startModalDownload}
                class="flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold uppercase tracking-wider px-5 py-2 rounded shadow-sm hover:-translate-y-0.5 active:translate-y-0 transition-all min-h-[34px] cursor-pointer"
              >
                Add to Queue
              </button>
            </AdaptiveTooltip>
          </div>
        </div>
      </div>
    </Show>
  );
}

interface ModeTabProps {
  active: boolean;
  label: string;
  icon: JSX.Element;
  onClick: () => void;
}

function ModeTab(props: ModeTabProps): JSX.Element {
  return (
    <AdaptiveTooltip content={`Switch to ${props.label} mode`}>
      <button
        type="button"
        onClick={props.onClick}
        class={cn(
          "flex-1 flex items-center justify-center py-2.5 px-3 text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all select-none min-h-[38px] cursor-pointer",
          props.active
            ? "bg-white dark:bg-zinc-950 text-blue-600 dark:text-blue-400 border-t-2 border-t-blue-500 dark:border-t-blue-400 font-extrabold"
            : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-300",
        )}
      >
        {props.label}
      </button>
    </AdaptiveTooltip>
  );
}

interface FormatPanelProps {
  icon: JSX.Element;
  title: string;
  streams: VideoMetadata["formats"];
  selected: Accessor<string>;
  onSelect: (id: string) => void;
  accent: "blue" | "emerald";
  formatSize: (bytes: number | null | undefined) => string;
}

function FormatPanel(props: FormatPanelProps): JSX.Element {
  const accentRing = (): string =>
    props.accent === "blue"
      ? "border-blue-500 dark:border-blue-400 bg-blue-50/20 dark:bg-blue-500/5 shadow-sm"
      : "border-emerald-500 dark:border-emerald-400 bg-emerald-50/20 dark:bg-emerald-500/5 shadow-sm";
  const accentIcon = (): string => (props.accent === "blue" ? "text-blue-500" : "text-emerald-500");

  return (
    <div class="space-y-2">
      <div class="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500 px-0.5">
        {props.icon}
        <span class="text-[10px] font-bold uppercase tracking-wider">{props.title}</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1.5 bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 rounded custom-scrollbar">
        <For each={props.streams}>
          {(format) => {
            const isSelected = (): boolean => props.selected() === format.format_id;
            return (
              <div
                onClick={() => props.onSelect(format.format_id)}
                class={cn(
                  "border cursor-pointer select-none p-2.5 rounded flex items-center justify-between gap-2 text-left min-w-0 transition-colors",
                  isSelected()
                    ? accentRing()
                    : "border-zinc-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-800",
                )}
              >
                <div class="min-w-0">
                  <span class="text-[11px] font-bold text-zinc-900 dark:text-zinc-200 leading-tight block truncate">
                    {format.format_note ?? `${format.height ?? "?"}p`} ({format.ext})
                  </span>
                  <span class="text-[9px] text-zinc-500 dark:text-zinc-400 font-mono block mt-0.5">
                    {format.resolution ?? `${format.width ?? "?"}x${format.height ?? "?"}`} •{" "}
                    {props.formatSize(format.filesize ?? format.filesize_approx)}
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
    </div>
  );
}

interface PresetPanelProps {
  icon: JSX.Element;
  title: string;
  presets: PresetOption[];
  selected: Accessor<string>;
  onSelect: Setter<string>;
}

function PresetPanel(props: PresetPanelProps): JSX.Element {
  return (
    <div class="space-y-2">
      <div class="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500 px-0.5">
        {props.icon}
        <span class="text-[10px] font-bold uppercase tracking-wider">{props.title}</span>
      </div>

      <div class="grid grid-cols-1 gap-2 max-h-52 overflow-y-auto p-1.5 bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 rounded custom-scrollbar">
        <For each={props.presets}>
          {(preset) => {
            const isSelected = (): boolean => props.selected() === preset.value;
            return (
              <div
                onClick={() => props.onSelect(preset.value)}
                class={cn(
                  "border cursor-pointer select-none p-2.5 rounded flex items-center justify-between gap-3 text-left min-w-0 transition-colors",
                  isSelected()
                    ? "border-blue-500 dark:border-blue-400 bg-blue-50/20 dark:bg-blue-500/5 shadow-sm"
                    : "border-zinc-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-800",
                )}
              >
                <div class="min-w-0">
                  <span class="text-[11px] font-bold text-zinc-900 dark:text-zinc-200 block">
                    {preset.label}
                  </span>
                  <span class="text-[9px] text-zinc-500 dark:text-zinc-400 font-mono block mt-0.5 truncate">
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
  );
}

interface SubtitlePanelProps {
  options: SubtitleOption[];
  selected: Accessor<string[]>;
  onToggle: (lang: string) => void;
}

function SubtitlePanel(props: SubtitlePanelProps): JSX.Element {
  return (
    <div class="space-y-2 pt-1">
      <div class="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500 px-0.5">
        <Globe class="w-3.5 h-3.5 text-emerald-500" />
        <span class="text-[10px] font-bold uppercase tracking-wider">Download Subtitles</span>
      </div>

      <div class="flex flex-wrap gap-1.5 p-2 bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 rounded max-h-36 overflow-y-auto custom-scrollbar">
        <For each={props.options}>
          {(option) => {
            const isChecked = (): boolean => props.selected().includes(option.lang);
            return (
              <label
                class={cn(
                  "flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded border cursor-pointer transition-colors shadow-sm",
                  isChecked()
                    ? "bg-purple-500/10 border-purple-500 text-purple-700 dark:text-purple-400 font-extrabold"
                    : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:border-purple-500",
                )}
              >
                <Checkbox
                  checked={isChecked()}
                  onChange={() => props.onToggle(option.lang)}
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
  );
}
