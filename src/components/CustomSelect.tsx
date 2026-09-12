/**
 * CustomSelect — a reusable VSCode-style select dropdown with an explicit
 * "no selection" affordance. Replaces the 3 copy-pasted implementations
 * previously embedded in `Home.tsx`, `InboxDetail.tsx`, and `ParsedFileDetail.tsx`.
 */
import { createSignal, Show, For, type JSX } from "solid-js";
import { ChevronDown, GlobeLock } from "lucide-solid";
import { cn } from "@/utils/cn";

export interface CustomSelectOption {
  value: string;
  label: string;
}

export interface CustomSelectProps {
  value: string;
  options: CustomSelectOption[];
  placeholder: string;
  onChange: (value: string) => void;
  /** Optional override for the leading icon. Defaults to `GlobeLock`. */
  icon?: (props: { class?: string }) => JSX.Element;
  /** Compact mode for inline editor cells (rounded-xl, smaller padding/text). */
  compact?: boolean;
  /** Hide the leading icon entirely (used in compact cells with separate labels). */
  hideIcon?: boolean;
  class?: string;
}

export function CustomSelect(props: CustomSelectProps): JSX.Element {
  const [isOpen, setIsOpen] = createSignal(false);
  const selected = (): CustomSelectOption | undefined =>
    props.options.find((option) => option.value === props.value);
  const Icon = props.icon ?? GlobeLock;
  const compact = (): boolean => props.compact === true;
  const sizePadding = (): string =>
    compact() ? "px-2.5 py-1.5 text-[10px] sm:text-xs" : "px-3.5 py-2 text-xs sm:text-sm";
  const optionTextSize = (): string =>
    compact() ? "text-[10px] sm:text-xs" : "text-xs sm:text-sm";

  return (
    <div class={cn("relative w-full", isOpen() ? "z-50" : "z-10", props.class)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen())}
        class={cn(
          "w-full flex items-center justify-between bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-blue-500 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-zinc-900 text-zinc-900 dark:text-white transition-all outline-none cursor-pointer font-sans",
          compact() ? "rounded-xl" : "rounded-lg",
          sizePadding(),
          props.hideIcon === true ? "font-semibold" : "",
        )}
      >
        <Show
          when={props.hideIcon !== true}
          fallback={<span class="truncate">{selected()?.label ?? props.placeholder}</span>}
        >
          <div class="flex items-center gap-2 truncate">
            <Icon class="w-4 h-4 text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
            <span class="truncate">{selected()?.label ?? props.placeholder}</span>
          </div>
        </Show>
        <ChevronDown
          class={cn(
            "w-3.5 h-3.5 text-zinc-500 transition-transform duration-200 flex-shrink-0",
            isOpen() && "rotate-180",
          )}
        />
      </button>

      <Show when={isOpen()}>
        <div class="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
        <div class="absolute z-50 w-full mt-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-x-hidden overflow-y-auto py-1 max-h-60 custom-scrollbar overscroll-contain animate-fade-in origin-top pointer-events-auto">
          <button
            type="button"
            onClick={() => {
              props.onChange("");
              setIsOpen(false);
            }}
            class={cn(
              "w-full text-left px-3.5 py-2.5 transition-all cursor-pointer",
              optionTextSize(),
              !props.value
                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold"
                : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10",
            )}
          >
            {props.placeholder}
          </button>
          <Show when={props.options.length > 0}>
            <div class="h-[1px] bg-zinc-200 dark:bg-zinc-800 w-full my-1" />
          </Show>
          <For each={props.options}>
            {(option) => (
              <button
                type="button"
                onClick={() => {
                  props.onChange(option.value);
                  setIsOpen(false);
                }}
                class={cn(
                  "w-full text-left px-3.5 py-2.5 transition-all truncate cursor-pointer",
                  optionTextSize(),
                  props.value === option.value
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold"
                    : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10",
                )}
              >
                {option.label}
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
