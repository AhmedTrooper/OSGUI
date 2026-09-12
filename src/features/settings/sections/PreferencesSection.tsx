import { createEffect, createSignal, onMount, Show, type JSX } from "solid-js";
import { Tooltip } from "@kobalte/core/tooltip";
import { RefreshCw, CheckCircle2, FolderOpen, Save, Gauge, Layers, Download } from "lucide-solid";
import { open } from "@tauri-apps/plugin-dialog";
import { useUIStore } from "@/store/useUIStore";
import { ipc } from "@/utils/ipc";
import { isTauri } from "@/utils/tauri";

const DEFAULT_BROWSER_PATH = "/home/user/Downloads";

export function PreferencesSection(): JSX.Element {
  const [tempPath, setTempPath] = createSignal(useUIStore.state.downloadPath);
  const [savedSuccess, setSavedSuccess] = createSignal(false);
  const [concurrency, setConcurrency] = createSignal<number>(3);
  const [chunks, setChunks] = createSignal<number>(4);

  onMount(() => {
    void (async () => {
      if (!isTauri()) return;
      try {
        const limitResult = await ipc.getConcurrencyLimit();
        setConcurrency(limitResult.limit);
        const chunksResult = await ipc.getDownloadChunks();
        setChunks(chunksResult.chunks);
      } catch (err) {
        console.error("Failed to fetch settings from backend:", err);
      }
    })();
  });

  createEffect(() => {
    setTempPath(useUIStore.state.downloadPath);
  });

  const handleSave = async (e: Event): Promise<void> => {
    e.preventDefault();
    useUIStore.setDownloadPath(tempPath());

    if (isTauri()) {
      try {
        await ipc.updateConfig({
          concurrency_limit: concurrency(),
          chunks: chunks(),
          path: tempPath(),
        });
      } catch (err) {
        console.error("Failed to update preferences:", err);
      }
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 3000);
  };

  const handleBrowse = async (): Promise<void> => {
    if (!isTauri()) {
      alert("Native folder picker is only available in the desktop app.");
      return;
    }
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        ...(tempPath() ? { defaultPath: tempPath() } : {}),
      });
      if (typeof selected === "string") {
        setTempPath(selected);
      }
    } catch (err) {
      console.error("Failed to open dialog:", err);
    }
  };

  const handleResetToDefault = async (): Promise<void> => {
    if (isTauri()) {
      try {
        const { downloadDir } = await import("@tauri-apps/api/path");
        const dir = await downloadDir();
        useUIStore.setDownloadPath(dir);
        setTempPath(dir);
        await ipc.updateConfig({ path: dir });
      } catch (err) {
        console.error("Failed to reset downloads path directory:", err);
      }
    } else {
      useUIStore.setDownloadPath(DEFAULT_BROWSER_PATH);
      setTempPath(DEFAULT_BROWSER_PATH);
    }
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 3000);
  };

  return (
    <form
      onSubmit={(e) => {
        void handleSave(e);
      }}
      class="flex flex-col gap-4 sm:gap-6"
    >
      <div class="flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
        <div class="flex flex-col gap-2.5 p-3 sm:p-4">
          <Tooltip openDelay={200} placement="top">
            <Tooltip.Trigger
              as="label"
              class="text-zinc-500 dark:text-zinc-400 cursor-default self-start"
            >
              <Download class="w-3.5 h-3.5" />
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                <Tooltip.Arrow />
                Download Directory Path
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip>
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              placeholder="/home/user/Downloads"
              value={tempPath()}
              onInput={(e) => setTempPath(e.currentTarget.value)}
              class="w-full sm:flex-grow px-3 py-2.5 sm:py-2 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none text-xs sm:text-sm text-zinc-900 dark:text-white"
            />
            <div class="flex flex-row gap-2 w-full sm:w-auto">
              <Tooltip openDelay={200} placement="top">
                <Tooltip.Trigger
                  as="button"
                  type="button"
                  onClick={() => {
                    void handleBrowse();
                  }}
                  class="flex-1 sm:flex-none flex items-center justify-center p-2.5 sm:p-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg transition-colors"
                >
                  <FolderOpen class="w-3.5 h-3.5 flex-shrink-0" />
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                    <Tooltip.Arrow />
                    Browse
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip>
              <Tooltip openDelay={200} placement="top">
                <Tooltip.Trigger
                  as="button"
                  type="button"
                  onClick={() => {
                    void handleResetToDefault();
                  }}
                  class="flex-1 sm:flex-none flex items-center justify-center p-2.5 sm:p-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg transition-colors"
                >
                  <RefreshCw class="w-3.5 h-3.5 flex-shrink-0" />
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                    <Tooltip.Arrow />
                    Reset
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip>
            </div>
          </div>
        </div>

        <div class="h-[1px] w-full bg-zinc-200 dark:bg-zinc-800" />

        <div class="flex flex-col gap-3 p-3 sm:p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
          <div class="flex items-center justify-between">
            <Tooltip openDelay={200} placement="top">
              <Tooltip.Trigger as="div" class="cursor-default text-zinc-700 dark:text-zinc-200">
                <Gauge class="w-4 h-4" />
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                  <Tooltip.Arrow />
                  Simultaneous Extractions
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip>
            <div class="w-10 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
              {concurrency()}
            </div>
          </div>
          <div class="w-full flex items-center gap-4 px-1">
            <span class="text-[10px] font-bold text-zinc-400">1</span>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={concurrency()}
              onInput={(e) => setConcurrency(parseInt(e.currentTarget.value, 10))}
              class="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <span class="text-[10px] font-bold text-zinc-400">10</span>
          </div>
        </div>

        <div class="h-[1px] w-full bg-zinc-200 dark:bg-zinc-800" />

        <div class="flex flex-col gap-3 p-3 sm:p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
          <div class="flex items-center justify-between">
            <Tooltip openDelay={200} placement="top">
              <Tooltip.Trigger as="div" class="cursor-default text-zinc-700 dark:text-zinc-200">
                <Layers class="w-4 h-4" />
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                  <Tooltip.Arrow />
                  Concurrent Connections (Chunks)
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip>
            <div class="w-10 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
              {chunks()}
            </div>
          </div>
          <div class="w-full flex items-center gap-4 px-1">
            <span class="text-[10px] font-bold text-zinc-400">3</span>
            <input
              type="range"
              min="3"
              max="8"
              step="1"
              value={chunks()}
              onInput={(e) => setChunks(parseInt(e.currentTarget.value, 10))}
              class="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <span class="text-[10px] font-bold text-zinc-400">8</span>
          </div>
        </div>

        <div class="h-[1px] w-full bg-zinc-200 dark:bg-zinc-800" />
      </div>

      <div class="flex flex-col-reverse sm:flex-row items-center gap-4 justify-end pt-2">
        <Show when={savedSuccess()}>
          <Tooltip openDelay={200} placement="left">
            <Tooltip.Trigger
              as="span"
              class="text-emerald-600 dark:text-emerald-400 flex items-center animate-fade-in"
            >
              <CheckCircle2 class="w-4 h-4" />
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                <Tooltip.Arrow />
                Configuration Applied
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip>
        </Show>

        <Tooltip openDelay={200} placement="left">
          <Tooltip.Trigger
            as="button"
            type="submit"
            class="flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white font-bold p-2.5 sm:p-2 rounded-xl sm:rounded-lg transition-colors shadow-md shadow-blue-500/20"
          >
            <Save class="w-4 h-4" />
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
              <Tooltip.Arrow />
              Save Changes
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip>
      </div>
    </form>
  );
}
