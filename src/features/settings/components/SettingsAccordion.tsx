import { createSignal, Show, type JSX } from "solid-js";
import { Tooltip } from "@kobalte/core/tooltip";
import { ChevronDown } from "lucide-solid";
import { cn } from "@/utils/cn";

export interface SettingsAccordionProps {
  title?: string;
  icon: (props: { class?: string }) => JSX.Element;
  defaultOpen?: boolean;
  children: JSX.Element;
}

export function SettingsAccordion(props: SettingsAccordionProps): JSX.Element {
  const [isOpen, setIsOpen] = createSignal(props.defaultOpen ?? false);

  return (
    <section class="border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-950/20 overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.01)]">
      <Tooltip openDelay={200} placement="right">
        <Tooltip.Trigger
          as="button"
          onClick={() => {
            setIsOpen(!isOpen());
          }}
          class="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors cursor-pointer"
          type="button"
        >
          <props.icon class="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          <ChevronDown
            class={cn(
              "w-4 h-4 text-zinc-400 transition-transform duration-200 flex-shrink-0",
              isOpen() && "rotate-180",
            )}
          />
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
            <Tooltip.Arrow />
            {props.title}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip>
      <Show when={isOpen()}>
        <div class="border-t border-zinc-200 dark:border-zinc-800 p-4 animate-fade-in">
          {props.children}
        </div>
      </Show>
    </section>
  );
}
