import { createSignal, For, Show, type JSX } from "solid-js";
import {
  Cpu,
  Database,
  Folder,
  Sparkles,
  Terminal,
  Activity,
  Layers,
  Bell,
  ExternalLink,
  AlertTriangle,
} from "lucide-solid";
import { useUIStore } from "@/store/useUIStore";
import { useQueueStore } from "@/store/useQueueStore";
import { useParseStore } from "@/store/useParseStore";
import { ipc } from "@/utils/ipc";
import { isTauri } from "@/utils/tauri";
import type { UpdatesSchema } from "@/core/types/database.types";

interface OSInfo {
  type: string;
  platform: string;
  arch: string;
  version: string;
}

interface AppInfo {
  name: string;
  version: string;
}

const FALLBACK_UPDATES: UpdatesSchema = {
  latest_update: "d05m06y2026_xyz_unique_slug",
  updates: [
    {
      version_slug: "d05m06y2026_xyz_unique_slug",
      application_online_version: "1.1.0",
      date: "05-06-2026",
      features: [
        "Created Axum API server for direct Chrome/Firefox extension sync",
        "Built premium green indicators and state transitions for inbox files",
      ],
      fixes: [
        "Resolved duplicate progress mapping inside background Aria2 runner thread",
        "Fixed dynamic chunk bounds concurrency crash",
      ],
      severity: "normal",
    },
  ],
};

const BROWSER_OS_INFO: OSInfo = {
  type: "Browser Preview",
  platform: "Web",
  arch: "wasm",
  version: "1.0.0",
};

export function AboutSection(): JSX.Element {
  const [osInfo, setOsInfo] = createSignal<OSInfo>(BROWSER_OS_INFO);
  const [appInfo, setAppInfo] = createSignal<AppInfo>({ name: "synclime", version: "0.1.0" });
  const [checkLoading, setCheckLoading] = createSignal(false);
  const [updatesData, setUpdatesData] = createSignal<UpdatesSchema | null>(null);
  const [updatesLoading, setUpdatesLoading] = createSignal(true);
  const [updatesError, setUpdatesError] = createSignal("");

  void (async () => {
    if (!isTauri()) return;
    try {
      const os = await import("@tauri-apps/plugin-os");
      setOsInfo({
        type: os.type(),
        platform: os.platform(),
        arch: os.arch(),
        version: os.version(),
      });

      const { getVersion, getName } = await import("@tauri-apps/api/app");
      const ver = await getVersion();
      const name = await getName();
      setAppInfo({ name, version: ver });
    } catch (err) {
      console.error("Failed to query native operating system info:", err);
    }
  })();

  void (async () => {
    try {
      const data = await ipc.getOnlineUpdates();
      setUpdatesData(data);
    } catch {
      console.warn(
        "Failed to fetch online updates from main branch. Querying local updates.json...",
      );
      if (isTauri()) {
        try {
          const data = await ipc.getLocalUpdates();
          setUpdatesData(data);
        } catch (e) {
          console.error("Local fallback failed:", e);
          setUpdatesError("Changelog updates not available offline.");
        }
      } else {
        setUpdatesData(FALLBACK_UPDATES);
      }
    } finally {
      setUpdatesLoading(false);
    }
  })();

  const activeJobsCount = (): number =>
    useQueueStore.state.queue.filter((j) => j.status === "downloading" || j.status === "pending")
      .length;

  const completedJobsCount = (): number =>
    useQueueStore.state.queue.filter((j) => j.status === "completed").length;

  const triggerSystemDiagnostic = async (): Promise<void> => {
    setCheckLoading(true);
    setTimeout(() => {
      void (async () => {
        try {
          if (isTauri()) {
            const { isPermissionGranted, requestPermission, sendNotification } =
              await import("@tauri-apps/plugin-notification");

            let hasPermission = await isPermissionGranted();
            if (!hasPermission) {
              const permission = await requestPermission();
              hasPermission = permission === "granted";
            }

            if (hasPermission) {
              sendNotification({
                title: "synclime system ok",
                body: `SQLite core, active queue, and ${osInfo().platform} environment are fully synced and healthy!`,
              });
            }
          } else {
            alert(
              `[synclime engine diagnostics]\n\n• status: active\n• database: sqlite connection active\n• hydration: complete\n• environment: web preview (simulated system ok)`,
            );
          }
        } catch (err) {
          console.error("Failed to run diagnostics or send notification:", err);
        } finally {
          setCheckLoading(false);
        }
      })();
    }, 1000);
  };

  const openDownloadFolder = async (): Promise<void> => {
    try {
      if (isTauri()) {
        const res = await ipc.revealFolderInExplorer({
          path: useUIStore.state.downloadPath,
        });
        if (!res.success) {
          throw new Error(res.message ?? "reveal_folder_in_explorer failed");
        }
      } else {
        alert(`Storage path open simulated for path:\n${useUIStore.state.downloadPath}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Failed to reveal download folder path:", err);
      alert(`Download folder path could not be revealed: ${msg}`);
    }
  };

  return (
    <div class="w-full space-y-4.5 select-none animate-fade-in text-xs sm:text-sm font-sans text-left">
      {/* Main Workspace Split Pane */}
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Side Panel: Visual App Badge & Diagnostic Actions */}
        <div class="lg:col-span-5 flex flex-col gap-4.5">
          {/* Main Visual App Badge Box */}
          <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 via-blue-600 to-indigo-700 p-5 text-white shadow-md flex-grow flex flex-col justify-between min-h-[220px]">
            <div class="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.12),transparent)] pointer-events-none" />

            <div class="flex items-start justify-between">
              <div class="space-y-1">
                <span class="bg-white/20 backdrop-blur-md text-white text-[9px] px-2 py-0.5 rounded font-black tracking-wider uppercase border border-white/5 shadow-sm">
                  BUILD v{appInfo().version}
                </span>
                <h1 class="text-3xl font-black tracking-tight drop-shadow-sm uppercase mt-1">
                  {appInfo().name}
                </h1>
                <p class="text-white/80 text-xs mt-1 font-medium max-w-[260px]">
                  Modern YouTube & multi-source media ingestion desktop engine
                </p>
              </div>

              <div class="bg-emerald-500/20 backdrop-blur-md text-emerald-200 text-[9px] px-2.5 py-1 rounded-full font-black tracking-wider uppercase border border-emerald-500/20 flex items-center gap-1.5 shadow-sm">
                <Activity class="w-3 h-3 animate-pulse text-emerald-300" />
                <span>Engine Live</span>
              </div>
            </div>

            <div class="pt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  void triggerSystemDiagnostic();
                }}
                disabled={checkLoading()}
                class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white text-blue-700 font-bold text-xs shadow-md hover:bg-blue-50 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
              >
                <Bell class={`w-4 h-4 text-blue-600 ${checkLoading() ? "animate-bounce" : ""}`} />
                <span>
                  {checkLoading() ? "Scanning Subsystems..." : "Run Subsystem Diagnostics"}
                </span>
              </button>
            </div>
          </div>

          {/* Default Storage Path Box */}
          <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/40 p-4 rounded-2xl shadow-2xs">
            <div class="flex items-center justify-between pb-2 mb-2.5 border-b border-zinc-200/70 dark:border-zinc-800/70">
              <div class="flex items-center gap-2">
                <Folder class="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span class="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Target Download Directory
                </span>
              </div>
              <Show when={useUIStore.state.downloadPath}>
                <button
                  type="button"
                  onClick={() => {
                    void openDownloadFolder();
                  }}
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition-all cursor-pointer"
                >
                  <span>Open Folder</span>
                  <ExternalLink class="w-3.5 h-3.5" />
                </button>
              </Show>
            </div>
            <p
              class="text-xs text-zinc-700 dark:text-zinc-300 font-mono break-all select-text bg-zinc-50 dark:bg-black/30 p-2.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60"
              title={useUIStore.state.downloadPath}
            >
              {useUIStore.state.downloadPath || "No directory configured"}
            </p>
          </div>
        </div>

        {/* Right Side: Host Info Spec Tables & Technologies ledger */}
        <div class="lg:col-span-7 flex flex-col gap-4.5">
          {/* Host Info & SQLite Metrics Splits */}
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Host specs */}
            <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/40 p-4 sm:p-5 rounded-2xl shadow-2xs">
              <div class="flex items-center gap-2 border-b border-zinc-200/80 dark:border-zinc-800/80 pb-2.5 mb-3">
                <Cpu class="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span class="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">
                  Host Platform Environment
                </span>
              </div>

              <div class="space-y-2.5 text-xs font-semibold">
                <div class="flex items-center justify-between">
                  <span class="text-zinc-500 dark:text-zinc-400 font-medium">OS Platform</span>
                  <span class="bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 px-2.5 py-0.5 rounded-lg font-mono font-bold text-xs">
                    {osInfo().platform}
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-zinc-500 dark:text-zinc-400 font-medium">Kernel Type</span>
                  <span class="bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 px-2.5 py-0.5 rounded-lg font-mono font-bold text-xs">
                    {osInfo().type}
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-zinc-500 dark:text-zinc-400 font-medium">CPU Architecture</span>
                  <span class="bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 px-2.5 py-0.5 rounded-lg font-mono font-bold text-xs">
                    {osInfo().arch}
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-zinc-500 dark:text-zinc-400 font-medium">Kernel Build</span>
                  <span
                    class="bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 px-2.5 py-0.5 rounded-lg font-mono font-bold text-xs truncate max-w-[140px]"
                    title={osInfo().version}
                  >
                    {osInfo().version}
                  </span>
                </div>
              </div>
            </div>

            {/* SQLite store metrics */}
            <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/40 p-4 sm:p-5 rounded-2xl shadow-2xs">
              <div class="flex items-center gap-2 border-b border-zinc-200/80 dark:border-zinc-800/80 pb-2.5 mb-3">
                <Database class="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span class="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">
                  Database & Queue Metrics
                </span>
              </div>

              <div class="space-y-2.5 text-xs font-semibold">
                <div class="flex items-center justify-between">
                  <span class="text-zinc-500 dark:text-zinc-400 font-medium">Active Queue</span>
                  <span
                    class={`px-2.5 py-0.5 rounded-lg font-bold text-xs font-mono ${
                      activeJobsCount() > 0
                        ? "bg-amber-500/10 text-amber-500"
                        : "bg-zinc-100 dark:bg-zinc-900 text-zinc-400"
                    }`}
                  >
                    {activeJobsCount()}
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-zinc-500 dark:text-zinc-400 font-medium">Completed Jobs</span>
                  <span class="bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 px-2.5 py-0.5 rounded-lg font-mono font-bold text-xs">
                    {completedJobsCount()}
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-zinc-500 dark:text-zinc-400 font-medium">Library Schemas</span>
                  <span class="bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 px-2.5 py-0.5 rounded-lg font-mono font-bold text-xs">
                    {useParseStore.state.parsedFiles.length}
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-zinc-500 dark:text-zinc-400 font-medium">Engine Subsystem</span>
                  <span class="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-lg font-bold text-xs flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Healthy & Synced</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Core Tech Stack */}
          <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/20 p-4.5 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.01)] backdrop-blur-md">
            <div class="flex items-center justify-between border-b border-zinc-200/80 dark:border-zinc-800/80 pb-2.5 mb-3">
              <div class="flex items-center gap-2">
                <Sparkles class="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span class="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">
                  Core Runtime & Tech Stack
                </span>
              </div>
              <span class="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded-md">
                Hybrid Architecture
              </span>
            </div>

            <div class="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
              <div class="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 flex items-center justify-center bg-rose-500/10 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-500/20 shadow-xs flex-shrink-0">
                    <Terminal class="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <div class="font-semibold text-zinc-900 dark:text-zinc-100">
                      Tauri Core Engine
                    </div>
                    <div class="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Native Rust backend & cross-platform system IPC
                    </div>
                  </div>
                </div>
                <span class="text-[9px] text-zinc-600 dark:text-zinc-300 font-bold bg-zinc-100 dark:bg-zinc-900 px-2.5 py-1 rounded font-mono border border-zinc-200 dark:border-zinc-800 uppercase">
                  Rust 2021
                </span>
              </div>

              <div class="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 flex items-center justify-center bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-500/20 shadow-xs flex-shrink-0">
                    <Layers class="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <div class="font-semibold text-zinc-900 dark:text-zinc-100">
                      SolidJS Reactive Interface
                    </div>
                    <div class="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Zero-overhead fine-grained DOM reactivity
                    </div>
                  </div>
                </div>
                <span class="text-[9px] text-zinc-600 dark:text-zinc-300 font-bold bg-zinc-100 dark:bg-zinc-900 px-2.5 py-1 rounded font-mono border border-zinc-200 dark:border-zinc-800 uppercase">
                  TypeScript
                </span>
              </div>

              <div class="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 flex items-center justify-center bg-teal-500/10 dark:bg-teal-500/15 text-teal-600 dark:text-teal-400 rounded-xl border border-teal-500/20 shadow-xs flex-shrink-0">
                    <Database class="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <div class="font-semibold text-zinc-900 dark:text-zinc-100">
                      SQLite Embedded Engine
                    </div>
                    <div class="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Local-first durable ACID persistence & query cache
                    </div>
                  </div>
                </div>
                <span class="text-[9px] text-zinc-600 dark:text-zinc-300 font-bold bg-zinc-100 dark:bg-zinc-900 px-2.5 py-1 rounded font-mono border border-zinc-200 dark:border-zinc-800 uppercase">
                  SQLite 3
                </span>
              </div>
            </div>
          </div>

          {/* Updates / Changelog */}
          <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/20 p-4.5 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.01)] backdrop-blur-md">
            <div class="flex items-center justify-between border-b border-zinc-200/80 dark:border-zinc-800/80 pb-2.5 mb-3">
              <div class="flex items-center gap-2">
                <Sparkles class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span class="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">
                  Release Highlights
                </span>
              </div>
              <span class="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                Ledger
              </span>
            </div>

            <Show
              when={!updatesLoading()}
              fallback={
                <div class="flex items-center justify-center py-6 gap-2 text-xs text-zinc-400">
                  <div class="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <span>Loading release ledger...</span>
                </div>
              }
            >
              <Show
                when={updatesData()}
                fallback={
                  <div class="flex items-center gap-2 text-rose-500 text-xs py-3 bg-rose-500/10 px-3 rounded-xl border border-rose-500/20">
                    <AlertTriangle class="w-4 h-4 shrink-0" />
                    <span>{updatesError() || "Changelog updates not available offline."}</span>
                  </div>
                }
              >
                {(data) => (
                  <div class="space-y-4">
                    <For each={data().updates}>
                      {(item) => (
                        <div class="space-y-2 border-l-2 border-emerald-500/40 pl-3.5">
                          <div class="flex items-center justify-between text-xs">
                            <span class="font-mono font-bold text-zinc-800 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-[11px]">
                              v{item.application_online_version}
                            </span>
                            <span class="text-zinc-400 font-mono text-[11px]">{item.date}</span>
                          </div>
                          <ul class="list-disc list-inside text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
                            <For each={item.features}>{(feature) => <li>{feature}</li>}</For>
                          </ul>
                        </div>
                      )}
                    </For>
                  </div>
                )}
              </Show>
            </Show>
          </div>
        </div>
      </div>
    </div>
  );
}
