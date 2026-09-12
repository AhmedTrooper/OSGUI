import { createSignal, onMount, type JSX } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Minus, Square, X, ChevronLeft, ChevronRight } from "lucide-solid";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "@/utils/tauri";

const CLOSE_CONFIRMATION =
  "Closing will stop active downloads. Some will be paused, and some may need to restart from the beginning when you reopen the app.\n\nAre you sure you want to close?";

const safeTry = async <T,>(label: string, fn: () => Promise<T>, fallback: () => T): Promise<T> => {
  try {
    return await fn();
  } catch (err) {
    console.log(`${label} fallback engaged:`, err);
    return fallback();
  }
};

export default function TitleBar(): JSX.Element {
  const [isFullscreen, setIsFullscreen] = createSignal(false);
  const navigate = useNavigate();

  onMount(() => {
    if (!isTauri()) return;
    void safeTry(
      "isFullscreen",
      async () => {
        const appWindow = getCurrentWindow();
        setIsFullscreen(await appWindow.isFullscreen());
      },
      () => undefined,
    );
  });

  const handleMinimize = (): void => {
    void safeTry(
      "minimize",
      async () => {
        await getCurrentWindow().minimize();
      },
      () => undefined,
    );
  };

  const handleMaximize = async (): Promise<void> => {
    await safeTry(
      "maximize",
      async () => {
        const appWindow = getCurrentWindow();
        if (await appWindow.isMaximized()) {
          await appWindow.unmaximize();
        } else {
          await appWindow.maximize();
        }
      },
      () => undefined,
    );
  };

  const handleClose = async (): Promise<void> => {
    try {
      const { ask } = await import("@tauri-apps/plugin-dialog");
      const confirmed = await ask(CLOSE_CONFIRMATION, {
        title: "Confirm Close",
        kind: "warning",
        okLabel: "Close",
        cancelLabel: "Cancel",
      });
      if (confirmed) {
        await getCurrentWindow().close();
      }
    } catch (err) {
      console.log("Native dialog fallback engaged:", err);
      if (window.confirm(CLOSE_CONFIRMATION)) {
        try {
          await getCurrentWindow().close();
        } catch (e) {
          console.log("App window close fallback engaged:", e);
        }
      }
    }
  };

  return (
    <div
      data-tauri-drag-region
      data-fullscreen={isFullscreen()}
      class="flex items-center justify-between w-full h-10 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 select-none relative z-50 transition-colors duration-300"
    >
      <div data-tauri-drag-region class="flex items-center gap-3 sm:gap-4 cursor-default">
        <div class="flex items-center gap-0.5">
          <button
            onClick={() => navigate(-1)}
            class="p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors duration-200 cursor-pointer"
            title="Go Back"
            type="button"
          >
            <ChevronLeft class="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate(1)}
            class="p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors duration-200 cursor-pointer"
            title="Go Forward"
            type="button"
          >
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>

        <div
          data-tauri-drag-region
          class="flex items-center gap-2 font-semibold text-xs tracking-wider uppercase text-zinc-500 dark:text-zinc-400"
        >
          <span data-tauri-drag-region class="bg-blue-500 w-1.5 h-1.5 rounded-full" />
          <span data-tauri-drag-region class="hidden sm:inline">
            Synclime
          </span>
        </div>
      </div>

      <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
        <button
          onClick={() => {
            void handleClose();
          }}
          class="flex items-center gap-1 px-3 py-1 bg-red-500 hover:bg-red-600 dark:bg-red-650 dark:hover:bg-red-550 text-white text-[9px] font-black tracking-wider uppercase rounded-full shadow-sm hover:shadow-md active:scale-95 transition-all cursor-pointer border border-red-500/20"
          title="Quit Application"
          type="button"
        >
          <X class="w-2.5 h-2.5" />
          <span class="hidden xs:inline">Quit App</span>
        </button>
      </div>

      <div class="flex items-center gap-1.5">
        <button
          onClick={handleMinimize}
          class="p-1 rounded hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors duration-200 cursor-pointer"
          title="Minimize"
          type="button"
        >
          <Minus class="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => {
            void handleMaximize();
          }}
          class="p-1 rounded hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors duration-200 cursor-pointer"
          title="Maximize"
          type="button"
        >
          <Square class="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
