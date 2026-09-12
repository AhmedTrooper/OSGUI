import { createSignal, onMount, Show, type JSX } from "solid-js";
import { useNavigate } from "@solidjs/router";
import {
  Minus,
  Square,
  Maximize2,
  Minimize2,
  EyeOff,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-solid";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "@/utils/tauri";
import { AdaptiveTooltip } from "@/components/AdaptiveTooltip";

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
  const [isMaximized, setIsMaximized] = createSignal(false);
  const navigate = useNavigate();

  onMount(() => {
    if (!isTauri()) return;
    void safeTry(
      "initWindowState",
      async () => {
        const appWindow = getCurrentWindow();
        setIsFullscreen(await appWindow.isFullscreen());
        setIsMaximized(await appWindow.isMaximized());
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
          setIsMaximized(false);
        } else {
          await appWindow.maximize();
          setIsMaximized(true);
        }
      },
      () => undefined,
    );
  };

  const handleFullscreen = async (): Promise<void> => {
    await safeTry(
      "fullscreen",
      async () => {
        const appWindow = getCurrentWindow();
        const next = !(await appWindow.isFullscreen());
        await appWindow.setFullscreen(next);
        setIsFullscreen(next);
      },
      () => undefined,
    );
  };

  const handleHide = async (): Promise<void> => {
    await safeTry(
      "hide",
      async () => {
        const appWindow = getCurrentWindow();
        await appWindow.hide();
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
      class="flex items-center justify-between w-full h-10 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-3 select-none relative z-50 transition-colors duration-300"
    >
      {/* Left: Navigation and App Identity */}
      <div data-tauri-drag-region class="flex items-center gap-3 sm:gap-4 cursor-default">
        <div class="flex items-center gap-0.5">
          <button
            onClick={() => navigate(-1)}
            class="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors duration-200 cursor-pointer"
            title="Go Back"
            type="button"
          >
            <ChevronLeft class="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate(1)}
            class="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors duration-200 cursor-pointer"
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
            SyncLime
          </span>
        </div>
      </div>

      {/* Middle drag region (allows dragging window anywhere in the empty area) */}
      <div data-tauri-drag-region class="flex-1 h-full cursor-default" />

      {/* Right: Window Controls (Minimize, Fullscreen, Maximize, Hide to Tray, Close) */}
      <div class="flex items-center gap-1">
        <AdaptiveTooltip content="Minimize">
          <button
            onClick={handleMinimize}
            class="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors duration-150 cursor-pointer flex items-center justify-center"
            type="button"
          >
            <Minus class="w-3.5 h-3.5" />
          </button>
        </AdaptiveTooltip>

        <AdaptiveTooltip content={isFullscreen() ? "Exit Fullscreen" : "Fullscreen"}>
          <button
            onClick={() => {
              void handleFullscreen();
            }}
            class="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors duration-150 cursor-pointer flex items-center justify-center"
            type="button"
          >
            <Show when={isFullscreen()} fallback={<Maximize2 class="w-3.5 h-3.5" />}>
              <Minimize2 class="w-3.5 h-3.5" />
            </Show>
          </button>
        </AdaptiveTooltip>

        <AdaptiveTooltip content={isMaximized() ? "Restore" : "Maximize"}>
          <button
            onClick={() => {
              void handleMaximize();
            }}
            class="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors duration-150 cursor-pointer flex items-center justify-center"
            type="button"
          >
            <Square class="w-3 h-3" />
          </button>
        </AdaptiveTooltip>

        <AdaptiveTooltip content="Hide to System Tray">
          <button
            onClick={() => {
              void handleHide();
            }}
            class="p-1.5 rounded-md hover:bg-amber-500/10 text-zinc-500 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors duration-150 cursor-pointer flex items-center justify-center"
            type="button"
          >
            <EyeOff class="w-3.5 h-3.5" />
          </button>
        </AdaptiveTooltip>

        <AdaptiveTooltip content="Close">
          <button
            onClick={() => {
              void handleClose();
            }}
            class="p-1.5 rounded-md hover:bg-red-500 hover:text-white dark:hover:bg-red-600 dark:hover:text-white text-zinc-500 dark:text-zinc-400 transition-colors duration-150 cursor-pointer flex items-center justify-center"
            type="button"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </AdaptiveTooltip>
      </div>
    </div>
  );
}
