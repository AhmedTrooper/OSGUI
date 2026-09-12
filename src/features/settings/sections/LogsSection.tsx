import { createSignal, For, Show, onMount, type JSX } from "solid-js";
import {
  FileWarning,
  Database,
  Trash2,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
} from "lucide-solid";
import { ipc } from "@/utils/ipc";
import { isTauri } from "@/utils/tauri";
import { formatTimestamp } from "@/utils/format";
import type { ErrorLog, ParseLog } from "@/core/types/database.types";

type LogsTab = "errors" | "parses";

export function LogsSection(): JSX.Element {
  const [activeTab, setActiveTab] = createSignal<LogsTab>("errors");
  const [errorLogs, setErrorLogs] = createSignal<ErrorLog[]>([]);
  const [parseLogs, setParseLogs] = createSignal<ParseLog[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [selectedLogSlug, setSelectedLogSlug] = createSignal<string | null>(null);
  const [copiedKey, setCopiedKey] = createSignal<string | null>(null);

  const loadLogs = async (): Promise<void> => {
    setLoading(true);
    try {
      if (!isTauri()) return;
      const [errors, parses] = await Promise.all([ipc.getErrorLogs(), ipc.getParseLogs()]);
      setErrorLogs(errors.payload ?? []);
      setParseLogs(parses.payload ?? []);
    } catch (err) {
      console.error("Failed to load logs from SQLite:", err);
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    void loadLogs();
  });

  const handleClearLogs = async (): Promise<void> => {
    if (!window.confirm("Are you sure you want to permanently clear all SQLite logs?")) return;
    if (!isTauri()) return;
    try {
      await ipc.clearAllLogs();
      setErrorLogs([]);
      setParseLogs([]);
      setSelectedLogSlug(null);
    } catch (err) {
      console.error("Failed to clear logs:", err);
    }
  };

  const handleCopyText = async (text: string, key: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch (e) {
      console.warn("Failed to copy command or log output:", e);
    }
  };

  const switchTab = (tab: LogsTab): void => {
    setActiveTab(tab);
    setSelectedLogSlug(null);
    void loadLogs();
  };

  const hasLogs = (): boolean =>
    (activeTab() === "errors" && errorLogs().length > 0) ||
    (activeTab() === "parses" && parseLogs().length > 0);

  return (
    <div class="space-y-4 text-xs sm:text-sm font-sans">
      <div class="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800/80">
        <p class="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
          Trace SQLite core transactions, sub-processes, and download errors
        </p>
        <Show when={hasLogs()}>
          <button
            onClick={() => {
              void handleClearLogs();
            }}
            class="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 hover:border-red-500/35 text-red-600 dark:text-red-400 font-bold rounded-lg transition-all text-[10px] tracking-wider uppercase cursor-pointer shadow-sm animate-fade-in"
          >
            <Trash2 class="w-3.5 h-3.5" />
            <span>Flush Logs</span>
          </button>
        </Show>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left: Tabs */}
        <div class="lg:col-span-3 flex flex-col gap-1 border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/10 p-2 rounded-xl">
          <button
            onClick={() => switchTab("errors")}
            class={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab() === "errors"
                ? "bg-white dark:bg-white/10 text-red-500 dark:text-white font-extrabold shadow-sm border border-zinc-200/50 dark:border-zinc-800"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5"
            }`}
          >
            <div class="flex items-center gap-2">
              <AlertTriangle
                class={`w-4 h-4 ${activeTab() === "errors" ? "text-red-500" : "text-zinc-400"}`}
              />
              <span>Download Exceptions</span>
            </div>
            <span class="text-[10px] bg-red-500/10 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-md font-mono font-bold">
              {errorLogs().length}
            </span>
          </button>

          <button
            onClick={() => switchTab("parses")}
            class={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab() === "parses"
                ? "bg-white dark:bg-white/10 text-indigo-500 dark:text-white font-extrabold shadow-sm border border-zinc-200/50 dark:border-zinc-800"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5"
            }`}
          >
            <div class="flex items-center gap-2">
              <Database
                class={`w-4 h-4 ${activeTab() === "parses" ? "text-indigo-500" : "text-zinc-400"}`}
              />
              <span>Metadata Discovery</span>
            </div>
            <span class="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-md font-mono font-bold">
              {parseLogs().length}
            </span>
          </button>
        </div>

        {/* Right: Log terminal */}
        <div class="lg:col-span-9 flex flex-col">
          <div class="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3.5 rounded-xl shadow-inner min-h-[400px] flex flex-col justify-between">
            <div class="flex-grow flex flex-col justify-between">
              <div class="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2 mb-3">
                <div class="flex items-center gap-1.5">
                  <span class="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span class="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                  <span class="w-2.5 h-2.5 rounded-full bg-green-500" />
                  <span class="text-[9px] text-zinc-500 dark:text-zinc-400 font-mono ml-2 uppercase font-black tracking-wider">
                    {activeTab() === "errors" ? "stderr.stream" : "stdout.discovery"}
                  </span>
                </div>
                <span class="text-[9px] font-mono text-zinc-400 dark:text-zinc-655">
                  SQLite Log Storage
                </span>
              </div>

              <Show
                when={!loading()}
                fallback={
                  <div class="flex items-center justify-center py-20 flex-grow">
                    <span class="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                }
              >
                <div class="space-y-2 flex-grow overflow-y-auto max-h-[400px] custom-scrollbar text-left font-mono">
                  <Show when={activeTab() === "errors"}>
                    <For each={errorLogs()}>
                      {(log) => {
                        const isSelected = (): boolean => selectedLogSlug() === log.slug;
                        return (
                          <div
                            class={`border border-zinc-200 dark:border-zinc-900 rounded-xl overflow-hidden bg-white dark:bg-zinc-950/60 transition-all ${isSelected() ? "border-red-500/50 dark:border-red-500/50" : ""}`}
                          >
                            <button
                              onClick={() => setSelectedLogSlug(isSelected() ? null : log.slug)}
                              class="w-full flex items-center justify-between p-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 text-left transition-colors cursor-pointer"
                            >
                              <div class="flex items-start gap-3 min-w-0 flex-grow">
                                <div class="p-1 rounded-md bg-red-500/10 text-red-500 flex-shrink-0 mt-0.5 border border-red-500/20">
                                  <AlertTriangle class="w-3.5 h-3.5" />
                                </div>
                                <div class="flex flex-col min-w-0 flex-grow pr-3">
                                  <span class="font-bold text-red-600 dark:text-red-400 text-xs break-all line-clamp-1">
                                    {log.error_message}
                                  </span>
                                  <span class="text-[9px] text-zinc-400 dark:text-zinc-550 mt-1">
                                    {formatTimestamp(log.timestamp)} • Job: {log.download_job_slug}
                                  </span>
                                </div>
                              </div>
                              <Show
                                when={isSelected()}
                                fallback={
                                  <ChevronRight class="w-4 h-4 text-zinc-400 dark:text-zinc-600" />
                                }
                              >
                                <ChevronDown class="w-4 h-4 text-zinc-400 dark:text-zinc-600" />
                              </Show>
                            </button>

                            <Show when={isSelected()}>
                              <div class="border-t border-zinc-200 dark:border-zinc-900 p-3.5 bg-zinc-50/50 dark:bg-zinc-950/80 text-[10px] sm:text-xs text-left font-mono space-y-3 select-text overflow-x-auto">
                                <div>
                                  <div class="flex items-center justify-between mb-1">
                                    <span class="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                                      Execution Command
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        void handleCopyText(
                                          log.command_executed,
                                          `${log.slug}-cmd`,
                                        );
                                      }}
                                      class="text-[9px] font-bold text-blue-500 hover:text-blue-400 transition-colors cursor-pointer"
                                    >
                                      {copiedKey() === `${log.slug}-cmd`
                                        ? "Copied!"
                                        : "Copy Command"}
                                    </button>
                                  </div>
                                  <div class="bg-zinc-100 dark:bg-black p-2 rounded-lg border border-zinc-250 dark:border-zinc-900 break-all text-zinc-800 dark:text-zinc-300">
                                    {log.command_executed}
                                  </div>
                                </div>

                                <div>
                                  <div class="flex items-center justify-between mb-1">
                                    <span class="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono">
                                      Full Error Payload Description
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        void handleCopyText(log.error_message, `${log.slug}-msg`);
                                      }}
                                      class="text-[9px] font-bold text-red-500 hover:text-red-400 transition-colors cursor-pointer"
                                    >
                                      {copiedKey() === `${log.slug}-msg`
                                        ? "Copied!"
                                        : "Copy Payload"}
                                    </button>
                                  </div>
                                  <div class="bg-red-500/5 text-red-700 dark:text-red-400 p-2 rounded-lg border border-red-500/15 dark:border-red-500/10 break-words whitespace-pre-wrap leading-relaxed select-text">
                                    {log.error_message}
                                  </div>
                                </div>

                                <div class="grid grid-cols-2 gap-4 text-[9px] text-zinc-400 dark:text-zinc-500 pt-2 border-t border-zinc-200 dark:border-zinc-900">
                                  <div>
                                    <strong>LOG SLUG:</strong> {log.slug}
                                  </div>
                                  <div>
                                    <strong>RESOLVED STATUS:</strong>{" "}
                                    {log.is_resolved === 1 ? "RESOLVED" : "UNRESOLVED/ACTIVE"}
                                  </div>
                                </div>
                              </div>
                            </Show>
                          </div>
                        );
                      }}
                    </For>
                    <Show when={errorLogs().length === 0}>
                      <div class="flex flex-col items-center justify-center py-20 text-center gap-2">
                        <FileWarning class="w-8 h-8 text-zinc-300 dark:text-zinc-700 mb-1" />
                        <h3 class="text-xs font-black text-zinc-400 dark:text-zinc-650 uppercase tracking-wide">
                          Standard error is silent
                        </h3>
                        <p class="text-[10px] text-zinc-500 dark:text-zinc-600 max-w-xs font-semibold">
                          Everything is running smoothly! Sub-engine failure streams will pipe here.
                        </p>
                      </div>
                    </Show>
                  </Show>

                  <Show when={activeTab() === "parses"}>
                    <For each={parseLogs()}>
                      {(log) => {
                        const isSelected = (): boolean => selectedLogSlug() === log.slug;
                        const isFailed = log.status === "failed";
                        return (
                          <div
                            class={`border border-zinc-200 dark:border-zinc-900 rounded-xl overflow-hidden bg-white dark:bg-zinc-950/60 transition-all ${isSelected() ? "border-indigo-500/50 dark:border-indigo-500/50" : ""}`}
                          >
                            <button
                              onClick={() => setSelectedLogSlug(isSelected() ? null : log.slug)}
                              class="w-full flex items-center justify-between p-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 text-left transition-colors cursor-pointer"
                            >
                              <div class="flex items-start gap-3 min-w-0 flex-grow">
                                <div
                                  class={`p-1 rounded-md flex-shrink-0 mt-0.5 border ${
                                    isFailed
                                      ? "bg-red-500/10 text-red-500 border-red-500/20"
                                      : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                  }`}
                                >
                                  <Show
                                    when={isFailed}
                                    fallback={<CheckCircle2 class="w-3.5 h-3.5" />}
                                  >
                                    <AlertTriangle class="w-3.5 h-3.5" />
                                  </Show>
                                </div>
                                <div class="flex flex-col min-w-0 flex-grow pr-3">
                                  <span class="font-bold text-zinc-800 dark:text-zinc-200 text-xs break-all line-clamp-1">
                                    {log.command_executed}
                                  </span>
                                  <span class="text-[9px] text-zinc-400 dark:text-zinc-550 mt-1">
                                    {formatTimestamp(log.started_at)} • Target:{" "}
                                    {log.parsed_file_slug} • {log.duration_ms}ms
                                  </span>
                                </div>
                              </div>
                              <Show
                                when={isSelected()}
                                fallback={
                                  <ChevronRight class="w-4 h-4 text-zinc-400 dark:text-zinc-600" />
                                }
                              >
                                <ChevronDown class="w-4 h-4 text-zinc-400 dark:text-zinc-600" />
                              </Show>
                            </button>

                            <Show when={isSelected()}>
                              <div class="border-t border-zinc-200 dark:border-zinc-900 p-3.5 bg-zinc-50/50 dark:bg-zinc-950/80 text-[10px] sm:text-xs text-left font-mono space-y-3 select-text overflow-x-auto">
                                <div>
                                  <div class="flex items-center justify-between mb-1">
                                    <span class="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block mb-1">
                                      Probe Command Pipeline
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        void handleCopyText(
                                          log.command_executed,
                                          `${log.slug}-cmd`,
                                        );
                                      }}
                                      class="text-[9px] font-bold text-blue-500 hover:text-blue-400 transition-colors cursor-pointer"
                                    >
                                      {copiedKey() === `${log.slug}-cmd`
                                        ? "Copied!"
                                        : "Copy Command"}
                                    </button>
                                  </div>
                                  <div class="bg-zinc-100 dark:bg-black p-2 rounded-lg border border-zinc-250 dark:border-zinc-900 break-all text-zinc-800 dark:text-zinc-300">
                                    {log.command_executed}
                                  </div>
                                </div>

                                <div class="grid grid-cols-2 gap-4 text-[11px] text-zinc-850 dark:text-zinc-300 font-sans">
                                  <div class="p-3 bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-900 rounded-xl space-y-1">
                                    <strong class="text-zinc-450 dark:text-zinc-500 block text-[9px] uppercase tracking-wider font-mono">
                                      Exit Code
                                    </strong>
                                    <span class="font-mono">
                                      {log.exit_code !== null ? log.exit_code : "N/A"}
                                    </span>
                                  </div>
                                  <div class="p-3 bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-900 rounded-xl space-y-1">
                                    <strong class="text-zinc-450 dark:text-zinc-500 block text-[9px] uppercase tracking-wider font-mono">
                                      Bytes Transferred
                                    </strong>
                                    <span class="font-mono">
                                      {log.bytes_returned.toLocaleString()} bytes
                                    </span>
                                  </div>
                                  <div class="p-3 bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-900 rounded-xl space-y-1">
                                    <strong class="text-zinc-450 dark:text-zinc-500 block text-[9px] uppercase tracking-wider font-mono">
                                      Analysis Time
                                    </strong>
                                    <span class="font-mono text-indigo-500 dark:text-indigo-400 font-bold">
                                      {log.duration_ms} ms
                                    </span>
                                  </div>
                                  <div class="p-3 bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-900 rounded-xl space-y-1">
                                    <strong class="text-zinc-450 dark:text-zinc-500 block text-[9px] uppercase tracking-wider font-mono">
                                      Engine Status
                                    </strong>
                                    <span
                                      class={`font-black uppercase text-[10px] tracking-wider ${isFailed ? "text-red-500" : "text-emerald-500"}`}
                                    >
                                      {log.status}
                                    </span>
                                  </div>
                                </div>
                                <div class="text-[9px] text-zinc-450 dark:text-zinc-500 pt-2 border-t border-zinc-200 dark:border-zinc-900">
                                  <strong>LOG REF SLUG:</strong> {log.slug}
                                </div>
                              </div>
                            </Show>
                          </div>
                        );
                      }}
                    </For>
                    <Show when={parseLogs().length === 0}>
                      <div class="flex flex-col items-center justify-center py-20 text-center gap-2">
                        <Database class="w-8 h-8 text-zinc-300 dark:text-zinc-700 mb-1" />
                        <h3 class="text-xs font-black text-zinc-400 dark:text-zinc-650 uppercase tracking-wide font-mono">
                          Standard output is blank
                        </h3>
                        <p class="text-[10px] text-zinc-500 dark:text-zinc-600 max-w-xs font-semibold">
                          Ready to trace. Extraction events will capture transaction packets here.
                        </p>
                      </div>
                    </Show>
                  </Show>
                </div>
              </Show>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
