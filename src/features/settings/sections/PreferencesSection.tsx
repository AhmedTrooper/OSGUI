import { createEffect, createSignal, onMount, Show, type JSX } from "solid-js";
import { open } from "@tauri-apps/plugin-dialog";
import { Folder, RotateCcw, Save, Check } from "lucide-solid";
import { AdaptiveTooltip } from "@/components/AdaptiveTooltip";
import { useUIStore } from "@/store/useUIStore";
import { ipc } from "@/utils/ipc";
import { isTauri } from "@/utils/tauri";

const DEFAULT_BROWSER_PATH = "/home/user/Downloads";

export function PreferencesSection(): JSX.Element {
  const [tempPath, setTempPath] = createSignal(useUIStore.state.downloadPath);
  const [savedSuccess, setSavedSuccess] = createSignal(false);
  const [concurrency, setConcurrency] = createSignal<number>(3);
  const [chunks, setChunks] = createSignal<number>(1);

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
      class="flex flex-col gap-5 text-left font-sans"
    >
      <div class="flex flex-col border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900/60 shadow-2xs divide-y divide-zinc-200/80 dark:divide-zinc-800/80">
        {/* Download Directory Path */}
        <div class="flex flex-col gap-3 p-4 sm:p-5">
          <div class="flex items-center justify-between">
            <div class="flex flex-col gap-0.5 text-left">
              <label class="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Default Download Directory
              </label>
              <span class="text-[11px] text-zinc-500 dark:text-zinc-400">
                Filesystem location where processed videos, playlists, and audio streams will be
                saved
              </span>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div class="relative flex-grow">
              <div class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                <Folder class="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="/home/user/Downloads"
                value={tempPath()}
                onInput={(e) => setTempPath(e.currentTarget.value)}
                class="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:border-blue-500 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-blue-500/10 transition-all outline-none font-mono text-xs text-zinc-900 dark:text-white"
              />
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  void handleBrowse();
                }}
                class="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-750 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700 rounded-xl transition-all cursor-pointer text-xs font-semibold"
              >
                <Folder class="w-4 h-4 text-zinc-500" />
                <span>Browse...</span>
              </button>

              <AdaptiveTooltip content="Reset to native OS default downloads directory">
                <button
                  type="button"
                  onClick={() => {
                    void handleResetToDefault();
                  }}
                  class="p-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700 rounded-xl transition-all cursor-pointer"
                  aria-label="Reset to default download folder"
                >
                  <RotateCcw class="w-4 h-4" />
                </button>
              </AdaptiveTooltip>
            </div>
          </div>
        </div>

        {/* Simultaneous Downloads */}
        <div class="flex flex-col gap-3 p-4 sm:p-5 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors">
          <div class="flex items-center justify-between">
            <div class="flex flex-col gap-0.5 text-left">
              <span class="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Simultaneous Downloads
              </span>
              <span class="text-[11px] text-zinc-500 dark:text-zinc-400">
                Maximum number of active background download workers executing concurrently
                (default: 3)
              </span>
            </div>
            <div class="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-mono font-bold text-xs">
              {concurrency()} {concurrency() === 1 ? "job" : "jobs"}
            </div>
          </div>
          <div class="w-full flex items-center gap-3 px-1 pt-1">
            <span class="text-[10px] font-mono font-bold text-zinc-400">1 min</span>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={concurrency()}
              onInput={(e) => setConcurrency(parseInt(e.currentTarget.value, 10))}
              class="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-500"
            />
            <span class="text-[10px] font-mono font-bold text-zinc-400">10 max</span>
          </div>
        </div>

        {/* Concurrent Connections (Chunks) */}
        <div class="flex flex-col gap-3 p-4 sm:p-5 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors">
          <div class="flex items-center justify-between">
            <div class="flex flex-col gap-0.5 text-left">
              <span class="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Concurrent Connections (Chunks per Job)
              </span>
              <span class="text-[11px] text-zinc-500 dark:text-zinc-400">
                Splits each download job into parallel chunk streams using aria2c routing (min: 1,
                max: 8, default: 1)
              </span>
            </div>
            <div class="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-mono font-bold text-xs">
              {chunks()} {chunks() === 1 ? "stream (single)" : "streams (parallel)"}
            </div>
          </div>
          <div class="w-full flex items-center gap-3 px-1 pt-1">
            <span class="text-[10px] font-mono font-bold text-zinc-400">1 single</span>
            <input
              type="range"
              min="1"
              max="8"
              step="1"
              value={chunks()}
              onInput={(e) => setChunks(parseInt(e.currentTarget.value, 10))}
              class="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-indigo-500"
            />
            <span class="text-[10px] font-mono font-bold text-zinc-400">8 parallel</span>
          </div>
        </div>
      </div>

      {/* Footer / Submit */}
      <div class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
        <div>
          <Show when={savedSuccess()}>
            <span class="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 animate-fade-in">
              <Check class="w-4 h-4" />
              Preferences successfully updated and applied
            </span>
          </Show>
        </div>

        <button
          type="submit"
          class="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer"
        >
          <Show when={savedSuccess()} fallback={<Save class="w-4 h-4" />}>
            <Check class="w-4 h-4" />
          </Show>
          <span>{savedSuccess() ? "Preferences Saved" : "Save Preferences"}</span>
        </button>
      </div>
    </form>
  );
}
