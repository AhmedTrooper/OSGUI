import { useParams, A } from "@solidjs/router";
import { Tooltip } from "@kobalte/core/tooltip";
import { ArrowLeft, Hash, Eye } from "lucide-solid";
import type { JSX } from "solid-js";

export default function DownloadsDetail(): JSX.Element {
  const params = useParams<{ slug: string }>();

  return (
    <div class="flex flex-col items-center justify-center min-h-[50vh] text-center gap-6 w-full">
      <div class="flex flex-col gap-2">
        <Tooltip openDelay={200} placement="bottom">
          <Tooltip.Trigger
            as="div"
            class="cursor-default text-zinc-950 dark:text-white inline-flex items-center justify-center"
          >
            <Eye class="w-8 h-8" />
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
              <Tooltip.Arrow />
              Hello World from Downloads Detail Route
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip>

        <div class="flex items-center justify-center gap-2 text-zinc-500 dark:text-zinc-400 text-sm">
          <Tooltip openDelay={200} placement="right">
            <Tooltip.Trigger as="span" class="cursor-default inline-flex">
              <Hash class="w-3.5 h-3.5" />
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                <Tooltip.Arrow />
                Dynamic Slug
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip>
          <code class="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded font-mono font-bold">
            {params.slug}
          </code>
        </div>
      </div>

      <Tooltip openDelay={200} placement="top">
        <Tooltip.Trigger
          as={A}
          href="/downloads"
          class="flex items-center justify-center p-2.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-white/10 transition-all duration-300"
        >
          <ArrowLeft class="w-4 h-4" />
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
            <Tooltip.Arrow />
            Back to Downloads
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip>
    </div>
  );
}
