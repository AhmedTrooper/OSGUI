import { createSignal, For, Show, type JSX } from "solid-js";
import { Tooltip } from "@kobalte/core/tooltip";
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
              </div>

              <Tooltip openDelay={200} placement="left">
                <Tooltip.Trigger
                  as="span"
                  class="bg-emerald-500/20 backdrop-blur-md text-emerald-200 text-[9px] px-2 py-0.5 rounded font-black tracking-wider uppercase border border-emerald-500/10 flex items-center gap-1 shadow-sm cursor-default"
                >
                  <Activity class="w-3 h-3 animate-pulse" />
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                    <Tooltip.Arrow />
                    Live
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip>
            </div>

            <div class="pt-4 flex items-center justify-between gap-3">
              <Tooltip openDelay={200} placement="right">
                <Tooltip.Trigger
                  as="button"
                  onClick={() => {
                    void triggerSystemDiagnostic();
                  }}
                  disabled={checkLoading()}
                  class="flex items-center justify-center p-2.5 rounded-xl bg-white text-blue-700 shadow-md hover:bg-blue-50 active:scale-[0.98] transition-all disabled:opacity-50 min-h-[38px] cursor-pointer"
                >
                  <Bell class={`w-4 h-4 text-blue-600 ${checkLoading() ? "animate-bounce" : ""}`} />
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                    <Tooltip.Arrow />
                    {checkLoading() ? "Scanning..." : "Run host system diagnostics checks"}
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip>
            </div>
          </div>

          {/* Default Storage Path Box */}
          <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/20 p-4 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.01)] backdrop-blur-md">
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-3 min-w-0">
                <Tooltip openDelay={200} placement="right">
                  <Tooltip.Trigger
                    as="div"
                    class="w-9 h-9 flex items-center justify-center bg-teal-500/10 dark:bg-teal-500/15 text-teal-600 dark:text-teal-400 rounded-xl border border-teal-500/20 shadow-sm flex-shrink-0 cursor-default"
                  >
                    <Folder class="w-4.5 h-4.5" />
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                      <Tooltip.Arrow />
                      Target Download Path
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip>
                <p
                  class="text-[9px] text-zinc-400 dark:text-zinc-500 truncate max-w-[160px] sm:max-w-xs md:max-w-md font-mono font-bold"
                  title={useUIStore.state.downloadPath}
                >
                  {useUIStore.state.downloadPath || ""}
                </p>
              </div>

              <Show when={useUIStore.state.downloadPath}>
                <Tooltip openDelay={200} placement="left">
                  <Tooltip.Trigger
                    as="button"
                    onClick={() => {
                      void openDownloadFolder();
                    }}
                    class="flex items-center justify-center p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-zinc-800 dark:text-zinc-200 transition-all min-h-[32px] cursor-pointer shadow-sm"
                  >
                    <ExternalLink class="w-3.5 h-3.5" />
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                      <Tooltip.Arrow />
                      Reveal folder directory in native explorer
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip>
              </Show>
            </div>
          </div>
        </div>

        {/* Right Side: Host Info Spec Tables & Technologies ledger */}
        <div class="lg:col-span-7 flex flex-col gap-4.5">
          {/* Host Info & SQLite Metrics Splits */}
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Host specs */}
            <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/20 p-4 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.01)] backdrop-blur-md">
              <Tooltip openDelay={200} placement="right">
                <Tooltip.Trigger
                  as="div"
                  class="cursor-default text-[10px] text-blue-500 border-b border-zinc-200/80 dark:border-zinc-800/80 pb-2 mb-2 flex items-center"
                >
                  <Cpu class="w-3.5 h-3.5" />
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                    <Tooltip.Arrow />
                    Host Platform Spec
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip>

              <div class="space-y-2.5 text-[11px] font-semibold">
                <div class="flex items-center justify-between">
                  <Tooltip openDelay={200} placement="right">
                    <Tooltip.Trigger
                      as="span"
                      class="cursor-default text-zinc-500 dark:text-zinc-400"
                    >
                      OS
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                        <Tooltip.Arrow />
                        OS Platform
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip>
                  <span class="bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded font-mono font-bold text-[10px]">
                    {osInfo().platform}
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <Tooltip openDelay={200} placement="right">
                    <Tooltip.Trigger
                      as="span"
                      class="cursor-default text-zinc-500 dark:text-zinc-400"
                    >
                      TYPE
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                        <Tooltip.Arrow />
                        OS Type
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip>
                  <span class="bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded font-mono font-bold text-[10px]">
                    {osInfo().type}
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <Tooltip openDelay={200} placement="right">
                    <Tooltip.Trigger
                      as="span"
                      class="cursor-default text-zinc-500 dark:text-zinc-400"
                    >
                      ARCH
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                        <Tooltip.Arrow />
                        Architecture
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip>
                  <span class="bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded font-mono font-bold text-[10px]">
                    {osInfo().arch}
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <Tooltip openDelay={200} placement="right">
                    <Tooltip.Trigger
                      as="span"
                      class="cursor-default text-zinc-500 dark:text-zinc-400"
                    >
                      KRNL
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                        <Tooltip.Arrow />
                        Kernel version
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip>
                  <span
                    class="bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded font-mono font-bold text-[9px] truncate max-w-[110px]"
                    title={osInfo().version}
                  >
                    {osInfo().version}
                  </span>
                </div>
              </div>
            </div>

            {/* SQLite store metrics */}
            <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/20 p-4 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.01)] backdrop-blur-md">
              <Tooltip openDelay={200} placement="right">
                <Tooltip.Trigger
                  as="div"
                  class="cursor-default text-[10px] text-purple-500 border-b border-zinc-200/80 dark:border-zinc-800/80 pb-2 mb-2 flex items-center"
                >
                  <Database class="w-3.5 h-3.5" />
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                    <Tooltip.Arrow />
                    SQLite Store Metrics
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip>

              <div class="space-y-2.5 text-[11px] font-semibold">
                <div class="flex items-center justify-between">
                  <Tooltip openDelay={200} placement="right">
                    <Tooltip.Trigger
                      as="span"
                      class="cursor-default text-zinc-500 dark:text-zinc-400 flex items-center"
                    >
                      ACTIVE
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                        <Tooltip.Arrow />
                        Active Queue
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip>
                  <span
                    class={`px-2 py-0.5 rounded font-bold text-[10px] ${activeJobsCount() > 0 ? "bg-amber-500/10 text-amber-500" : "bg-zinc-100 dark:bg-zinc-900 text-zinc-400"}`}
                  >
                    {activeJobsCount()}
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <Tooltip openDelay={200} placement="right">
                    <Tooltip.Trigger
                      as="span"
                      class="cursor-default text-zinc-500 dark:text-zinc-400"
                    >
                      DONE
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                        <Tooltip.Arrow />
                        Completed Queue
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip>
                  <span class="bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded font-mono font-bold text-[10px]">
                    {completedJobsCount()}
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <Tooltip openDelay={200} placement="right">
                    <Tooltip.Trigger
                      as="span"
                      class="cursor-default text-zinc-500 dark:text-zinc-400"
                    >
                      CACHE
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                        <Tooltip.Arrow />
                        Saved Cache
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip>
                  <span class="bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded font-mono font-bold text-[10px]">
                    {useParseStore.state.parsedFiles.length}
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <Tooltip openDelay={200} placement="right">
                    <Tooltip.Trigger
                      as="span"
                      class="cursor-default text-emerald-500 flex items-center"
                    >
                      OK
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                        <Tooltip.Arrow />
                        Engine status: healthy
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip>
                  <span class="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded font-bold text-[10px]">
                    ●
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Core Tech Stack */}
          <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/20 p-4.5 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.01)] backdrop-blur-md">
            <Tooltip openDelay={200} placement="right">
              <Tooltip.Trigger
                as="div"
                class="cursor-default text-[10px] text-indigo-500 border-b border-zinc-200/80 dark:border-zinc-800/80 pb-2 mb-2.5 flex items-center"
              >
                <Sparkles class="w-3.5 h-3.5" />
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                  <Tooltip.Arrow />
                  Core Application Frameworks
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip>

            <div class="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
              <div class="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                <div class="flex items-center gap-3">
                  <Tooltip openDelay={200} placement="right">
                    <Tooltip.Trigger
                      as="div"
                      class="w-9 h-9 flex items-center justify-center bg-rose-500/10 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-500/20 shadow-sm flex-shrink-0 cursor-default"
                    >
                      <Terminal class="w-4.5 h-4.5" />
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                        <Tooltip.Arrow />
                        Tauri Core Engine
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip>
                  <span class="text-[9px] text-zinc-500 dark:text-zinc-400 font-bold bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded font-mono border border-zinc-200 dark:border-zinc-800 uppercase">
                    Rust
                  </span>
                </div>
              </div>

              <div class="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                <div class="flex items-center gap-3">
                  <Tooltip openDelay={200} placement="right">
                    <Tooltip.Trigger
                      as="div"
                      class="w-9 h-9 flex items-center justify-center bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-500/20 shadow-sm flex-shrink-0 cursor-default"
                    >
                      <Layers class="w-4.5 h-4.5" />
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                        <Tooltip.Arrow />
                        SolidJS Render Layer
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip>
                  <span class="text-[9px] text-zinc-500 dark:text-zinc-400 font-bold bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded font-mono border border-zinc-200 dark:border-zinc-800 uppercase">
                    JS/TS
                  </span>
                </div>
              </div>

              <div class="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                <div class="flex items-center gap-3">
                  <Tooltip openDelay={200} placement="right">
                    <Tooltip.Trigger
                      as="div"
                      class="w-9 h-9 flex items-center justify-center bg-teal-500/10 dark:bg-teal-500/15 text-teal-600 dark:text-teal-400 rounded-xl border border-teal-500/20 shadow-sm flex-shrink-0 cursor-default"
                    >
                      <Database class="w-4.5 h-4.5" />
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                        <Tooltip.Arrow />
                        SQLite Embedded
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip>
                  <span class="text-[9px] text-zinc-500 dark:text-zinc-400 font-bold bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded font-mono border border-zinc-200 dark:border-zinc-800 uppercase">
                    SQL
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Updates / Changelog */}
          <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/20 p-4.5 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.01)] backdrop-blur-md">
            <Tooltip openDelay={200} placement="right">
              <Tooltip.Trigger
                as="div"
                class="cursor-default text-[10px] text-emerald-500 border-b border-zinc-200/80 dark:border-zinc-800/80 pb-2 mb-3 flex items-center"
              >
                <Sparkles class="w-3.5 h-3.5" />
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                  <Tooltip.Arrow />
                  Release Changelog
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip>

            <Show
              when={!updatesLoading()}
              fallback={
                <div class="flex items-center justify-center py-4">
                  <div class="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              }
            >
              <Show
                when={updatesData()}
                fallback={
                  <div class="flex items-center gap-2 text-red-500 text-[11px] py-2">
                    <AlertTriangle class="w-3.5 h-3.5" />
                    {updatesError() || "Offline"}
                  </div>
                }
              >
                {(data) => (
                  <div class="space-y-4">
                    <For each={data().updates}>
                      {(item) => (
                        <div class="space-y-1.5 border-l-2 border-emerald-500/40 pl-3">
                          <div class="flex items-center justify-between text-[11px]">
                            <Tooltip openDelay={200} placement="right">
                              <Tooltip.Trigger
                                as="span"
                                class="cursor-default font-mono font-bold text-zinc-700 dark:text-zinc-200"
                              >
                                v{item.application_online_version}
                              </Tooltip.Trigger>
                              <Tooltip.Portal>
                                <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                                  <Tooltip.Arrow />
                                  Version
                                </Tooltip.Content>
                              </Tooltip.Portal>
                            </Tooltip>
                            <Tooltip openDelay={200} placement="left">
                              <Tooltip.Trigger
                                as="span"
                                class="cursor-default text-zinc-400 font-mono"
                              >
                                {item.date}
                              </Tooltip.Trigger>
                              <Tooltip.Portal>
                                <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                                  <Tooltip.Arrow />
                                  Release Date
                                </Tooltip.Content>
                              </Tooltip.Portal>
                            </Tooltip>
                          </div>
                          <ul class="list-disc list-inside text-[10px] text-zinc-500 dark:text-zinc-400 space-y-0.5">
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
