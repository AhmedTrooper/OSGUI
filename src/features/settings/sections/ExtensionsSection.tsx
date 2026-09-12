import { createSignal, For, Show, type JSX } from "solid-js";
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
  const [currentVersion, setCurrentVersion] = createSignal("0.1.1");
  const [activePort, setActivePort] = createSignal<number>(14221);
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
      const portResult = await ipc.getActiveApiPort();
      if (portResult?.port) {
        setActivePort(portResult.port);
      }
    } catch (e) {
      console.debug("Failed to query active API port:", e);
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
          <div
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
            class="group border border-zinc-200/80 dark:border-zinc-800/80 bg-gradient-to-br from-white to-zinc-50/50 dark:from-zinc-950/40 dark:to-zinc-950/10 p-5 rounded-2xl shadow-2xs hover:shadow-md hover:border-blue-500/40 transition-all duration-300 cursor-pointer text-left relative overflow-hidden"
          >
            {/* Background Glow */}
            <div class="absolute -right-12 -top-12 w-28 h-28 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-2xl group-hover:scale-125 transition-transform" />

            <div class="flex items-center justify-between relative mb-3.5">
              <div class="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 shadow-xs">
                <Sparkles class="w-5 h-5" />
              </div>
              <span class="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">
                <span>Setup Guide</span>
                <ExternalLink class="w-3.5 h-3.5" />
              </span>
            </div>

            <div class="space-y-2 relative">
              <h2 class="text-sm sm:text-base font-bold text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Synclime Browser Companion
              </h2>
              <p class="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                One-click media download capture for Chrome, Firefox, Brave, and Edge. Automatically
                transmits video URLs and session cookies directly to Synclime via localhost API.
              </p>
            </div>

            <div class="mt-4 pt-3.5 border-t border-zinc-200/70 dark:border-zinc-800/70 space-y-2 relative">
              <span class="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                Companion Capabilities
              </span>
              <ul class="space-y-1.5 text-[11px] text-zinc-600 dark:text-zinc-300">
                <li class="flex items-center gap-2">
                  <span class="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                  <span>Instant URL capture from active browser tabs</span>
                </li>
                <li class="flex items-center gap-2">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                  <span>Private Netscape cookie transfer for authenticated sites</span>
                </li>
                <li class="flex items-center gap-2">
                  <span class="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                  <span>
                    Integrated with local Axum HTTP daemon on port {activePort()} (Range:
                    14221–14230)
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right Side: Version Checker & Releases ledger */}
        <div class="lg:col-span-7 space-y-4.5 text-left">
          {/* Version Diagnostics */}
          <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/40 p-4 sm:p-5 rounded-2xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="flex items-center gap-2.5 font-sans font-semibold">
              <Box class="w-4.5 h-4.5 text-zinc-400" />
              <span class="text-xs text-zinc-600 dark:text-zinc-300 font-bold">
                Current Release:
              </span>
              <code class="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                v{currentVersion()}
              </code>
            </div>

            <Show
              when={isLatestVersion()}
              fallback={
                <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs font-bold">
                  <AlertTriangle class="w-3.5 h-3.5" />
                  <span>Update Available</span>
                </div>
              }
            >
              <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                <CheckCircle class="w-3.5 h-3.5" />
                <span>Up to Date</span>
              </div>
            </Show>
          </div>

          {/* Releases timeline ledger */}
          <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/40 p-4 sm:p-5 rounded-2xl shadow-2xs space-y-4">
            <div class="flex items-center gap-2 border-b border-zinc-200/80 dark:border-zinc-800/80 pb-3">
              <ListChecks class="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
              <span class="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">
                Release Changelogs & Manifest Ledger
              </span>
            </div>

            <Show
              when={!loading()}
              fallback={
                <div class="py-12 flex flex-col items-center justify-center space-y-2">
                  <div class="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span class="text-xs text-zinc-400">Loading changelog manifest...</span>
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
                          class={`absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border-2 bg-white dark:bg-zinc-950 ${
                            update.severity === "critical" ? "border-red-500" : "border-blue-500"
                          }`}
                        />

                        <div class="flex items-center justify-between flex-wrap gap-2">
                          <div class="flex items-center gap-2.5">
                            <span class="font-mono font-bold text-zinc-900 dark:text-white text-xs sm:text-sm flex items-center gap-1.5">
                              <Box class="w-3.5 h-3.5 text-zinc-400" /> v
                              {update.application_online_version}
                            </span>
                            <span class="text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1 font-mono font-medium">
                              <Calendar class="w-3 h-3" />
                              {update.date}
                            </span>
                          </div>

                          <Show when={update.severity === "critical"}>
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold font-mono text-red-500 border border-red-500/20 bg-red-500/10">
                              CRITICAL PATCH
                            </span>
                          </Show>
                        </div>

                        {/* Changelog items grid splits */}
                        <div class="bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200/60 dark:border-zinc-800/60 p-3.5 rounded-xl space-y-3 text-[11px] font-medium font-sans">
                          <Show when={update.features.length > 0}>
                            <div class="space-y-1.5">
                              <div class="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold text-xs">
                                <ListChecks class="w-3.5 h-3.5" />
                                <span>New Features & Improvements</span>
                              </div>
                              <ul class="text-zinc-600 dark:text-zinc-300 space-y-1 list-none pl-1">
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
                            <div class="space-y-1.5 pt-2 border-t border-zinc-200 dark:border-zinc-800/50">
                              <div class="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                                <Wrench class="w-3.5 h-3.5" />
                                <span>Bug Fixes & Maintenance</span>
                              </div>
                              <ul class="text-zinc-600 dark:text-zinc-300 space-y-1 list-none pl-1">
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
