import { createSignal, For, type JSX } from "solid-js";
import type { SubtitleOption } from "@/core/types/ytdlp.types";

export interface SubtitleSelectorProps {
  tracks: SubtitleOption[];
  onChange: (selectedLang: string) => void;
}

export function SubtitleSelector(props: SubtitleSelectorProps): JSX.Element {
  const [selected, setSelected] = createSignal("");

  const handleChange = (event: Event): void => {
    const target = event.target as HTMLSelectElement;
    const value = target.value;
    setSelected(value);
    props.onChange(value);
  };

  return (
    <div class="flex flex-col gap-2 text-left">
      <label class="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        Available Subtitles
      </label>
      <select
        value={selected()}
        onChange={handleChange}
        class="w-full bg-white/70 dark:bg-black/40 border border-zinc-200 dark:border-white/10 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors duration-300"
      >
        <option value="">No subtitles (None)</option>
        <For each={props.tracks}>
          {(track) => (
            <option value={track.lang}>
              {track.name} ({track.lang})
            </option>
          )}
        </For>
      </select>
    </div>
  );
}
