import { createSignal, Show, type JSX } from "solid-js";
import { ChevronDown } from "lucide-solid";
import { cn } from "@/utils/cn";

export interface SettingsAccordionProps {
  title: string;
  description?: string;
  badge?: string;
  icon: (props: { class?: string }) => JSX.Element;
  defaultOpen?: boolean;
  children: JSX.Element;
}

export function SettingsAccordion(props: SettingsAccordionProps): JSX.Element {
  const [isOpen, setIsOpen] = createSignal(props.defaultOpen ?? false);

  return (
    <section class="border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl bg-white dark:bg-zinc-950/40 overflow-hidden shadow-2xs transition-all">
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen());
        }}
        class="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40 transition-colors cursor-pointer select-none group"
      >
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <div class="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center flex-shrink-0 border border-zinc-200/70 dark:border-zinc-700/60 group-hover:bg-blue-500/10 group-hover:text-blue-600 dark:group-hover:bg-blue-500/15 dark:group-hover:text-blue-400 transition-colors">
            <props.icon class="w-4.5 h-4.5" />
          </div>
          <div class="flex flex-col min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                {props.title}
              </span>
              <Show when={props.badge}>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  {props.badge}
                </span>
              </Show>
            </div>
            <Show when={props.description}>
              <span class="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                {props.description}
              </span>
            </Show>
          </div>
        </div>

        <ChevronDown
          class={cn(
            "w-4.5 h-4.5 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200 transition-transform duration-200 flex-shrink-0 ml-2",
            isOpen() && "rotate-180 text-blue-500 dark:text-blue-400",
          )}
        />
      </button>
      <Show when={isOpen()}>
        <div class="border-t border-zinc-200/80 dark:border-zinc-800/80 p-4 sm:p-5 animate-fade-in text-left">
          {props.children}
        </div>
      </Show>
    </section>
  );
}
