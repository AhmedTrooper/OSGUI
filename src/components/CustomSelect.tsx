/**
 * CustomSelect — a reusable VSCode-style select dropdown with explicit
 * tag badges, icons, and "no selection" affordances.
 */
import { createSignal, Show, For, type JSX } from "solid-js";
import { ChevronDown, GlobeLock, Check } from "lucide-solid";
import { cn } from "@/utils/cn";

export interface CustomSelectOption {
  value: string;
  label: string;
  tag?: string;
  tagClass?: string;
  icon?: (props: { class?: string }) => JSX.Element;
}

export interface CustomSelectProps {
  value: string;
  options: CustomSelectOption[];
  placeholder: string;
  placeholderTag?: string;
  placeholderIcon?: (props: { class?: string }) => JSX.Element;
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

  const ActiveIcon = (): ((props: { class?: string }) => JSX.Element) => {
    const opt = selected();
    if (opt?.icon) return opt.icon;
    if (opt) return Icon;
    if (props.placeholderIcon) return props.placeholderIcon;
    return Icon;
  };

  return (
    <div class={cn("relative w-full", isOpen() ? "z-50" : "z-10", props.class)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen())}
        class={cn(
          "w-full flex items-center justify-between gap-2 bg-zinc-50/80 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-blue-500 text-zinc-900 dark:text-white transition-all outline-none cursor-pointer font-sans select-none",
          compact() ? "rounded-xl" : "rounded-lg",
          sizePadding(),
        )}
      >
        <div class="flex items-center gap-1.5 min-w-0 flex-1 truncate">
          <Show when={props.hideIcon !== true}>
            {(() => {
              const CurrentIcon = ActiveIcon();
              return <CurrentIcon class="w-4 h-4 text-zinc-400 dark:text-zinc-500 flex-shrink-0" />;
            })()}
          </Show>
          <span class="truncate font-semibold text-zinc-800 dark:text-zinc-200">
            {selected()?.label ?? props.placeholder}
          </span>
          <Show when={selected()?.tag || (!selected() && props.placeholderTag)}>
            <span
              class={cn(
                "text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase tracking-wider flex-shrink-0 ml-auto",
                selected()?.tagClass ??
                  "bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700",
              )}
            >
              {selected()?.tag ?? props.placeholderTag}
            </span>
          </Show>
        </div>
        <ChevronDown
          class={cn(
            "w-4 h-4 text-zinc-400 transition-transform duration-200 flex-shrink-0 ml-1",
            isOpen() && "rotate-180 text-blue-500",
          )}
        />
      </button>

      <Show when={isOpen()}>
        <div class="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
        <div class="absolute z-50 w-full mt-1.5 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-1 space-y-0.5 max-h-60 overflow-y-auto custom-scrollbar animate-fade-in origin-top pointer-events-auto">
          {/* Placeholder / Empty Option */}
          <button
            type="button"
            onClick={() => {
              props.onChange("");
              setIsOpen(false);
            }}
            class={cn(
              "w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer font-sans",
              optionTextSize(),
              !props.value
                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold border border-blue-500/20"
                : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 border border-transparent",
            )}
          >
            <div class="flex items-center gap-2 min-w-0 flex-1 truncate">
              {(() => {
                const PhIcon = props.placeholderIcon ?? Icon;
                return <PhIcon class="w-4 h-4 text-zinc-400 flex-shrink-0" />;
              })()}
              <span class="truncate font-medium">{props.placeholder}</span>
            </div>
            <div class="flex items-center gap-1.5 flex-shrink-0">
              <Show when={props.placeholderTag}>
                <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold uppercase tracking-wider border border-zinc-200 dark:border-zinc-700">
                  {props.placeholderTag}
                </span>
              </Show>
              <Show when={!props.value}>
                <Check class="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              </Show>
            </div>
          </button>

          <Show when={props.options.length > 0}>
            <div class="h-[1px] bg-zinc-200/70 dark:bg-zinc-800/70 w-full my-1" />
          </Show>

          {/* Option Items with Tags */}
          <For each={props.options}>
            {(option) => {
              const isSelected = () => props.value === option.value;
              const OptionIcon = option.icon ?? Icon;
              return (
                <button
                  type="button"
                  onClick={() => {
                    props.onChange(option.value);
                    setIsOpen(false);
                  }}
                  class={cn(
                    "w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer font-sans",
                    optionTextSize(),
                    isSelected()
                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold border border-blue-500/20"
                      : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 border border-transparent",
                  )}
                >
                  <div class="flex items-center gap-2 min-w-0 flex-1 truncate">
                    <OptionIcon class="w-4 h-4 text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
                    <span class="truncate font-medium">{option.label}</span>
                  </div>
                  <div class="flex items-center gap-1.5 flex-shrink-0">
                    <Show when={option.tag}>
                      <span
                        class={cn(
                          "text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase tracking-wider flex-shrink-0",
                          option.tagClass ??
                            "bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700",
                        )}
                      >
                        {option.tag}
                      </span>
                    </Show>
                    <Show when={isSelected()}>
                      <Check class="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    </Show>
                  </div>
                </button>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  );
}
