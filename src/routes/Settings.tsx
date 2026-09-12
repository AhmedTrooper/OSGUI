import { createEffect, createSignal, onMount, Show, type JSX } from "solid-js";
import { Settings as SettingsIcon, RefreshCw, CheckCircle2, FolderOpen } from "lucide-solid";
import { open } from "@tauri-apps/plugin-dialog";
import { useUIStore } from "@/store/useUIStore";
import { ipc } from "@/utils/ipc";
import { isTauri } from "@/utils/tauri";

const DEFAULT_BROWSER_PATH = "/home/user/Downloads";

export default function Settings(): JSX.Element {
  const [tempPath, setTempPath] = createSignal(useUIStore.state.downloadPath);
  const [savedSuccess, setSavedSuccess] = createSignal(false);
  const [concurrency, setConcurrency] = createSignal<number>(3);
  const [chunks, setChunks] = createSignal<number>(4);

  onMount(() => {
    useUIStore.setActivePath("/settings");
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
    <div class="flex flex-col gap-6 w-full max-w-3xl h-full py-2">
      <div class="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-white/10">
        <div class="flex items-center gap-2.5">
          <div class="p-1.5 bg-zinc-500 rounded-md text-white shadow-sm">
            <SettingsIcon class="w-4 h-4" />
          </div>
          <h1 class="text-base font-bold text-zinc-900 dark:text-white tracking-tight">
            Preferences
          </h1>
        </div>
      </div>

      <div class="w-full">
        <form
          onSubmit={(e) => {
            void handleSave(e);
          }}
          class="flex flex-col gap-4 sm:gap-6"
        >
          <div class="flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
            <div class="flex flex-col gap-2.5 p-3 sm:p-4">
              <label class="text-[10px] sm:text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Download Directory Path
              </label>
              <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  placeholder="/home/user/Downloads"
                  value={tempPath()}
                  onInput={(e) => setTempPath(e.currentTarget.value)}
                  class="w-full sm:flex-grow px-3 py-2.5 sm:py-2 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none text-xs sm:text-sm text-zinc-900 dark:text-white"
                />
                <div class="flex flex-row gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      void handleBrowse();
                    }}
                    class="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs sm:text-[13px] font-bold sm:font-medium transition-colors"
                  >
                    <FolderOpen class="w-3.5 h-3.5 flex-shrink-0" />
                    <span class="truncate">Browse</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleResetToDefault();
                    }}
                    class="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs sm:text-[13px] font-bold sm:font-medium transition-colors"
                  >
                    <RefreshCw class="w-3.5 h-3.5 flex-shrink-0" />
                    <span class="truncate">Reset</span>
                  </button>
                </div>
              </div>
            </div>

            <div class="h-[1px] w-full bg-zinc-200 dark:bg-zinc-800" />

            <div class="flex flex-col gap-3 p-3 sm:p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
              <div class="flex items-center justify-between">
                <div class="flex flex-col gap-0.5 sm:gap-1">
                  <span class="text-[12px] sm:text-[13px] font-bold text-zinc-900 dark:text-zinc-100">
                    Simultaneous Extractions
                  </span>
                  <span class="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400">
                    Maximum concurrent background downloads
                  </span>
                </div>
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
                <div class="flex flex-col gap-0.5 sm:gap-1">
                  <span class="text-[12px] sm:text-[13px] font-bold text-zinc-900 dark:text-zinc-100">
                    Concurrent Connections (Chunks)
                  </span>
                  <span class="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400">
                    Multi-part parallel connections per download job (min 3, max 8)
                  </span>
                </div>
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
              <span class="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 animate-fade-in w-full sm:w-auto justify-center sm:justify-start">
                <CheckCircle2 class="w-3.5 h-3.5" /> Configuration Applied
              </span>
            </Show>

            <button
              type="submit"
              class="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-3 sm:py-2 rounded-xl sm:rounded-lg transition-colors text-xs sm:text-[13px] w-full sm:w-auto shadow-md shadow-blue-500/20"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
