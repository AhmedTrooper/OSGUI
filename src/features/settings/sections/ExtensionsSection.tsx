import { createSignal, For, Show, type JSX } from "solid-js";
import { Tooltip } from "@kobalte/core/tooltip";
import { ipc } from "@/utils/ipc";
import { isTauri } from "@/utils/tauri";
import type { UpdatesSchema } from "@/core/types/database.types";
import {
  Sparkles,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Calendar,
  ArrowRight,
  ListChecks,
  Wrench,
  Box,
} from "lucide-solid";

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
    {
      version_slug: "d23m05y2026_first_stable",
      application_online_version: "1.0.0",
      date: "23-05-2026",
      features: [
        "Integrated yt-dlp core media extractor pipelines",
        "Created SQLite db integration with concurrency queue schedulers",
      ],
      fixes: ["Initial platform bootstrap launch version complete"],
      severity: "critical",
    },
  ],
};

const EXTENSIONS_DOCS_URL = "https://github.com/AhmedTrooper/Synclime/blob/main/extentions.md";

export function ExtensionsSection(): JSX.Element {
  const [currentVersion, setCurrentVersion] = createSignal("0.1.0");
  const [updatesData, setUpdatesData] = createSignal<UpdatesSchema | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [errorMsg, setErrorMsg] = createSignal("");
  const [isLatestVersion, setIsLatestVersion] = createSignal(true);

  const compareVersions = (data: UpdatesSchema): void => {
    if (!data.updates || data.updates.length === 0) return;
    const latest = data.updates[0];
    if (!latest) return;
    setIsLatestVersion(latest.application_online_version === currentVersion());
  };

  void (async () => {
    if (isTauri()) {
      try {
        const { getVersion } = await import("@tauri-apps/api/app");
        setCurrentVersion(await getVersion());
      } catch (e) {
        console.error("Failed to query app version:", e);
      }
    }

    try {
      const data = await ipc.getOnlineUpdates();
      setUpdatesData(data);
      compareVersions(data);
    } catch {
      console.warn(
        "Offline or blocked: Failed to fetch live updates from GitHub. Falling back to local updates.json...",
      );
      if (isTauri()) {
        try {
          const data = await ipc.getLocalUpdates();
          setUpdatesData(data);
          compareVersions(data);
        } catch (e) {
          console.error("Failed to load local updates.json:", e);
          setErrorMsg("Could not load updates changelog details.");
        }
      } else {
        setUpdatesData(FALLBACK_UPDATES);
        compareVersions(FALLBACK_UPDATES);
      }
    } finally {
      setLoading(false);
    }
  })();

  const handleOpenGithub = async (): Promise<void> => {
    if (isTauri()) {
      try {
        const { openUrl } = await import("@tauri-apps/plugin-opener");
        await openUrl(EXTENSIONS_DOCS_URL);
      } catch (err) {
        console.error("Failed to open URL via Tauri opener:", err);
      }
    } else {
      window.open(EXTENSIONS_DOCS_URL, "_blank");
    }
  };

  return (
    <div class="w-full space-y-4.5 select-none animate-fade-in text-xs sm:text-sm font-sans">
      {/* Main Catalog Grid Layout */}
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Side: Browser Extension Card */}
        <div class="lg:col-span-5 space-y-4.5">
          <Tooltip openDelay={200} placement="right">
            <Tooltip.Trigger
              as="div"
              role="button"
              tabindex="0"
              onClick={() => {
                void handleOpenGithub();
              }}
              onKeyDown={(e: KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") {
                  void handleOpenGithub();
                }
              }}
              class="group border border-zinc-200/80 dark:border-zinc-800/80 bg-gradient-to-br from-white to-zinc-50/50 dark:from-zinc-950/20 dark:to-zinc-950/5 p-5 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.01)] hover:shadow-md hover:border-blue-500/35 transition-all duration-300 cursor-pointer text-left relative overflow-hidden"
            >
              {/* Background Glow */}
              <div class="absolute -right-12 -top-12 w-28 h-28 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-2xl group-hover:scale-125 transition-transform" />

              <div class="flex items-center justify-between relative">
                <div class="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 shadow-sm">
                  <Sparkles class="w-4.5 h-4.5" />
                </div>
                <ExternalLink class="w-4 h-4 text-zinc-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
              </div>
              <Tooltip.Portal>
                <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                  <Tooltip.Arrow />
                  Browser Extension Hub
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Trigger>
          </Tooltip>
        </div>

        {/* Right Side: Version Checker & Releases ledger */}
        <div class="lg:col-span-7 space-y-4.5 text-left">
          {/* Version Diagnostics */}
          <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/20 p-5 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.01)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="flex items-center gap-2 font-sans font-semibold">
              <Tooltip openDelay={200} placement="right">
                <Tooltip.Trigger as="span" class="text-zinc-400 cursor-default flex">
                  <Box class="w-4 h-4" />
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                    <Tooltip.Arrow />
                    Installed Shell version
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip>
              <code class="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded font-mono text-xs font-bold text-zinc-850 dark:text-zinc-100">
                v{currentVersion()}
              </code>
            </div>

            <Show
              when={isLatestVersion()}
              fallback={
                <Tooltip openDelay={200} placement="left">
                  <Tooltip.Trigger
                    as="div"
                    class="flex items-center gap-2 bg-blue-500/5 text-blue-600 dark:text-blue-400 p-2 rounded-xl border border-blue-500/20 shadow-sm animate-pulse cursor-default"
                  >
                    <AlertTriangle class="w-4 h-4 flex-shrink-0" />
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                      <Tooltip.Arrow />
                      Update Available
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip>
              }
            >
              <Tooltip openDelay={200} placement="left">
                <Tooltip.Trigger
                  as="div"
                  class="flex items-center gap-2 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 p-2 rounded-xl border border-emerald-500/20 shadow-sm cursor-default"
                >
                  <CheckCircle class="w-4 h-4 flex-shrink-0" />
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                    <Tooltip.Arrow />
                    Standard Up-to-Date
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip>
            </Show>
          </div>

          {/* Releases timeline ledger */}
          <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/20 p-5 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.01)] space-y-4">
            <Tooltip openDelay={200} placement="right">
              <Tooltip.Trigger
                as="div"
                class="flex items-center cursor-default border-b border-zinc-200/80 dark:border-zinc-800/80 pb-2"
              >
                <ListChecks class="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                  <Tooltip.Arrow />
                  Changelogs & Manifest Releases
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip>

            <Show
              when={!loading()}
              fallback={
                <div class="py-12 flex flex-col items-center justify-center space-y-2">
                  <div class="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              }
            >
              <Show
                when={!errorMsg()}
                fallback={
                  <div class="p-3.5 bg-red-500/5 border border-red-500/20 text-red-500 text-xs rounded-xl font-semibold flex items-center gap-2">
                    <AlertTriangle class="w-3.5 h-3.5" />
                    {errorMsg()}
                  </div>
                }
              >
                <div class="space-y-5.5 relative pl-4 border-l border-zinc-200 dark:border-zinc-800/80">
                  <For each={updatesData()?.updates}>
                    {(update) => (
                      <div class="relative space-y-2.5">
                        {/* Timeline visual marker */}
                        <div
                          class={`absolute -left-[21px] top-1.5 w-2 h-2 rounded-full border-2 bg-white dark:bg-zinc-950 ${
                            update.severity === "critical" ? "border-red-500" : "border-blue-500"
                          }`}
                        />

                        <div class="flex items-center justify-between flex-wrap gap-2">
                          <div class="flex items-center gap-2.5">
                            <Tooltip openDelay={200} placement="right">
                              <Tooltip.Trigger
                                as="span"
                                class="font-black text-zinc-900 dark:text-white text-xs sm:text-sm cursor-default flex items-center gap-1.5"
                              >
                                <Box class="w-3.5 h-3.5" /> v{update.application_online_version}
                              </Tooltip.Trigger>
                              <Tooltip.Portal>
                                <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                                  <Tooltip.Arrow />
                                  Version
                                </Tooltip.Content>
                              </Tooltip.Portal>
                            </Tooltip>
                            <span class="text-[9px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1 font-bold">
                              <Calendar class="w-3.5 h-3.5" />
                              {update.date}
                            </span>
                          </div>

                          <Show when={update.severity === "critical"}>
                            <Tooltip openDelay={200} placement="left">
                              <Tooltip.Trigger
                                as="span"
                                class="px-2 py-0.5 rounded text-red-500 border border-red-500/10 bg-red-500/5 flex items-center cursor-default"
                              >
                                <AlertTriangle class="w-3 h-3" />
                              </Tooltip.Trigger>
                              <Tooltip.Portal>
                                <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                                  <Tooltip.Arrow />
                                  Critical update
                                </Tooltip.Content>
                              </Tooltip.Portal>
                            </Tooltip>
                          </Show>
                        </div>

                        {/* Changelog items grid splits */}
                        <div class="bg-zinc-50 dark:bg-zinc-900/10 border border-zinc-200/60 dark:border-zinc-800/60 p-3.5 rounded-xl space-y-3 text-[11px] font-medium font-sans">
                          <Show when={update.features.length > 0}>
                            <div class="space-y-1">
                              <Tooltip openDelay={200} placement="right">
                                <Tooltip.Trigger as="span" class="cursor-default flex items-center">
                                  <ListChecks class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                </Tooltip.Trigger>
                                <Tooltip.Portal>
                                  <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                                    <Tooltip.Arrow />
                                    Features Added
                                  </Tooltip.Content>
                                </Tooltip.Portal>
                              </Tooltip>
                              <ul class="text-zinc-500 dark:text-zinc-400 space-y-1 list-none pl-1">
                                <For each={update.features}>
                                  {(feat) => (
                                    <li class="flex items-start gap-1.5">
                                      <ArrowRight class="w-3 h-3 text-blue-500 mt-1 flex-shrink-0" />
                                      <span class="leading-normal">{feat}</span>
                                    </li>
                                  )}
                                </For>
                              </ul>
                            </div>
                          </Show>

                          <Show when={update.fixes.length > 0}>
                            <div class="space-y-1 pt-2.5 border-t border-zinc-250/20 dark:border-zinc-800/30">
                              <Tooltip openDelay={200} placement="right">
                                <Tooltip.Trigger as="span" class="cursor-default flex items-center">
                                  <Wrench class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                </Tooltip.Trigger>
                                <Tooltip.Portal>
                                  <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                                    <Tooltip.Arrow />
                                    Exceptions Fixed
                                  </Tooltip.Content>
                                </Tooltip.Portal>
                              </Tooltip>
                              <ul class="text-zinc-500 dark:text-zinc-400 space-y-1 list-none pl-1">
                                <For each={update.fixes}>
                                  {(fix) => (
                                    <li class="flex items-start gap-1.5">
                                      <ArrowRight class="w-3 h-3 text-emerald-500 mt-1 flex-shrink-0" />
                                      <span class="leading-normal">{fix}</span>
                                    </li>
                                  )}
                                </For>
                              </ul>
                            </div>
                          </Show>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </Show>
          </div>
        </div>
      </div>
    </div>
  );
}
