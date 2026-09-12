import { createSignal, For, Show, onMount, type JSX } from "solid-js";
import { AdaptiveTooltip } from "@/components/AdaptiveTooltip";
import {
  FileWarning,
  Database,
  Trash2,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Check,
  Copy,
  Terminal,
  Clock,
  Cpu,
} from "lucide-solid";
import { ipc } from "@/utils/ipc";
import { isTauri } from "@/utils/tauri";
import { formatSize } from "@/utils/format";
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
      const errList = Array.isArray(errors) ? errors : (errors?.payload ?? []);
      const parseList = Array.isArray(parses) ? parses : (parses?.payload ?? []);
      setErrorLogs(errList);
      setParseLogs(parseList);
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
    <div class="space-y-4 text-xs sm:text-sm font-sans text-left">
      {/* Top Toolbar */}
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div class="flex flex-col gap-0.5">
          <span class="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
            SQLite Query & Execution Traces
          </span>
          <span class="text-[11px] text-zinc-500 dark:text-zinc-400">
            Persistent log streams for download worker exceptions and yt-dlp discovery probes
          </span>
        </div>

        <Show when={hasLogs()}>
          <button
            onClick={() => {
              void handleClearLogs();
            }}
            class="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 rounded-xl transition-all cursor-pointer text-xs font-semibold shadow-2xs self-end sm:self-auto"
            type="button"
          >
            <Trash2 class="w-3.5 h-3.5" />
            <span>Clear Logs</span>
          </button>
        </Show>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left: Tabs */}
        <div class="lg:col-span-3 flex flex-col gap-1 border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/10 p-2 rounded-xl">
          <AdaptiveTooltip content="View download exceptions and execution failures">
            <button
              onClick={() => switchTab("errors")}
              class={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab() === "errors"
                  ? "bg-white dark:bg-white/10 shadow-sm border border-zinc-200/50 dark:border-zinc-800"
                  : "hover:bg-zinc-100 dark:hover:bg-white/5"
              }`}
              type="button"
            >
              <span class="text-xs font-semibold text-zinc-700 dark:text-zinc-200">Exceptions</span>
              <span class="text-[10px] bg-red-500/10 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-md font-mono font-bold">
                {errorLogs().length}
              </span>
            </button>
          </AdaptiveTooltip>

          <AdaptiveTooltip content="View URL metadata discovery and probe history">
            <button
              onClick={() => switchTab("parses")}
              class={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab() === "parses"
                  ? "bg-white dark:bg-white/10 shadow-sm border border-zinc-200/50 dark:border-zinc-800"
                  : "hover:bg-zinc-100 dark:hover:bg-white/5"
              }`}
              type="button"
            >
              <span class="text-xs font-semibold text-zinc-700 dark:text-zinc-200">Discovery</span>
              <span class="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-md font-mono font-bold">
                {parseLogs().length}
              </span>
            </button>
          </AdaptiveTooltip>
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
                </div>
                <div class="flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono">
                  <Cpu class="w-3.5 h-3.5 text-zinc-400" />
                  <span>SQLite Log Storage</span>
                </div>
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
                              type="button"
                            >
                              <div class="flex items-start gap-3 min-w-0 flex-grow">
                                <div class="p-1 rounded-md bg-red-500/10 text-red-500 flex-shrink-0 mt-0.5 border border-red-500/20">
                                  <AlertTriangle class="w-3.5 h-3.5" />
                                </div>
                                <div class="flex flex-col min-w-0 flex-grow pr-3">
                                  <span class="font-bold text-red-600 dark:text-red-400 text-xs break-all line-clamp-1">
                                    {log.error_message}
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
                                  <div class="flex items-center justify-between mb-1.5">
                                    <div class="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 font-bold text-xs">
                                      <Terminal class="w-3.5 h-3.5 text-blue-500" />
                                      <span>Executed yt-dlp Command</span>
                                    </div>
                                    <AdaptiveTooltip
                                      content={
                                        copiedKey() === `${log.slug}-cmd`
                                          ? "Copied!"
                                          : "Copy executed command"
                                      }
                                    >
                                      <button
                                        type="button"
                                        onClick={() => {
                                          void handleCopyText(
                                            log.command_executed,
                                            `${log.slug}-cmd`,
                                          );
                                        }}
                                        class="p-1 text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors cursor-pointer flex items-center justify-center"
                                        aria-label="Copy executed command"
                                      >
                                        <Show
                                          when={copiedKey() === `${log.slug}-cmd`}
                                          fallback={<Copy class="w-3.5 h-3.5" />}
                                        >
                                          <Check class="w-3.5 h-3.5 text-emerald-500" />
                                        </Show>
                                      </button>
                                    </AdaptiveTooltip>
                                  </div>
                                  <div class="bg-zinc-100 dark:bg-black p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 break-all text-zinc-800 dark:text-zinc-300 font-mono text-xs">
                                    {log.command_executed}
                                  </div>
                                </div>

                                <div>
                                  <div class="flex items-center justify-between mb-1.5">
                                    <div class="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-bold text-xs">
                                      <FileWarning class="w-3.5 h-3.5 text-red-500" />
                                      <span>Standard Error Output (stderr)</span>
                                    </div>
                                    <AdaptiveTooltip
                                      content={
                                        copiedKey() === `${log.slug}-msg`
                                          ? "Copied!"
                                          : "Copy error payload"
                                      }
                                    >
                                      <button
                                        type="button"
                                        onClick={() => {
                                          void handleCopyText(log.error_message, `${log.slug}-msg`);
                                        }}
                                        class="p-1 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors cursor-pointer flex items-center justify-center"
                                        aria-label="Copy error payload"
                                      >
                                        <Show
                                          when={copiedKey() === `${log.slug}-msg`}
                                          fallback={<Copy class="w-3.5 h-3.5" />}
                                        >
                                          <Check class="w-3.5 h-3.5 text-emerald-500" />
                                        </Show>
                                      </button>
                                    </AdaptiveTooltip>
                                  </div>
                                  <div class="bg-red-500/5 text-red-700 dark:text-red-400 p-2.5 rounded-xl border border-red-500/20 break-words whitespace-pre-wrap leading-relaxed select-text font-mono text-xs">
                                    {log.error_message}
                                  </div>
                                </div>

                                <div class="grid grid-cols-2 gap-4 text-[10px] text-zinc-500 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                                  <div class="font-mono">
                                    Record:{" "}
                                    <strong class="text-zinc-700 dark:text-zinc-300">
                                      {log.slug}
                                    </strong>
                                  </div>
                                  <div class="flex justify-end">
                                    {log.is_resolved === 1 ? (
                                      <span class="text-emerald-500 flex items-center gap-1 font-bold">
                                        <Check class="w-3 h-3" /> RESOLVED
                                      </span>
                                    ) : (
                                      <span class="text-red-500 flex items-center gap-1 font-bold">
                                        <AlertTriangle class="w-3 h-3" /> UNRESOLVED
                                      </span>
                                    )}
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
                        <div class="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 mb-1">
                          <FileWarning class="w-6 h-6" />
                        </div>
                        <span class="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                          No Exception Records
                        </span>
                        <span class="text-[11px] text-zinc-400 max-w-xs">
                          All download processes have completed without fatal runtime errors.
                        </span>
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
                              type="button"
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
                                  <div class="flex items-center justify-between mb-1.5">
                                    <div class="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 font-bold text-xs">
                                      <Terminal class="w-3.5 h-3.5 text-indigo-500" />
                                      <span>Metadata Discovery Command</span>
                                    </div>
                                    <AdaptiveTooltip
                                      content={
                                        copiedKey() === `${log.slug}-cmd`
                                          ? "Copied!"
                                          : "Copy executed command"
                                      }
                                    >
                                      <button
                                        type="button"
                                        onClick={() => {
                                          void handleCopyText(
                                            log.command_executed,
                                            `${log.slug}-cmd`,
                                          );
                                        }}
                                        class="p-1 text-indigo-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded transition-colors cursor-pointer flex items-center justify-center"
                                        aria-label="Copy executed command"
                                      >
                                        <Show
                                          when={copiedKey() === `${log.slug}-cmd`}
                                          fallback={<Copy class="w-3.5 h-3.5" />}
                                        >
                                          <Check class="w-3.5 h-3.5 text-emerald-500" />
                                        </Show>
                                      </button>
                                    </AdaptiveTooltip>
                                  </div>
                                  <div class="bg-zinc-100 dark:bg-black p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 break-all text-zinc-800 dark:text-zinc-300 font-mono text-xs">
                                    {log.command_executed}
                                  </div>
                                </div>

                                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px] font-sans">
                                  <div class="p-2.5 bg-zinc-100/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-xl space-y-1">
                                    <div class="flex items-center gap-1 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                      <Terminal class="w-3 h-3 text-zinc-400" />
                                      <span>Exit Code</span>
                                    </div>
                                    <div class="font-mono font-bold text-xs text-zinc-800 dark:text-zinc-200">
                                      {log.exit_code !== null ? log.exit_code : "0"}
                                    </div>
                                  </div>

                                  <div class="p-2.5 bg-zinc-100/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-xl space-y-1">
                                    <div class="flex items-center gap-1 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                      <Database class="w-3 h-3 text-zinc-400" />
                                      <span>Data Returned</span>
                                    </div>
                                    <div class="font-mono font-bold text-xs text-zinc-800 dark:text-zinc-200">
                                      {formatSize(log.bytes_returned)}
                                    </div>
                                  </div>

                                  <div class="p-2.5 bg-zinc-100/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-xl space-y-1">
                                    <div class="flex items-center gap-1 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                      <Clock class="w-3 h-3 text-zinc-400" />
                                      <span>Duration</span>
                                    </div>
                                    <div class="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                                      {log.duration_ms} ms
                                    </div>
                                  </div>

                                  <div class="p-2.5 bg-zinc-100/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-xl space-y-1">
                                    <div class="flex items-center gap-1 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                      <CheckCircle2 class="w-3 h-3 text-zinc-400" />
                                      <span>Status</span>
                                    </div>
                                    <div
                                      class={`font-mono font-bold text-xs uppercase ${isFailed ? "text-red-500" : "text-emerald-500"}`}
                                    >
                                      {log.status}
                                    </div>
                                  </div>
                                </div>
                                <div class="text-[10px] text-zinc-500 pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between font-mono">
                                  <span>Record: {log.slug}</span>
                                  <span
                                    class="text-zinc-400 truncate max-w-[200px]"
                                    title={log.parsed_file_slug}
                                  >
                                    Target: {log.parsed_file_slug}
                                  </span>
                                </div>
                              </div>
                            </Show>
                          </div>
                        );
                      }}
                    </For>
                    <Show when={parseLogs().length === 0}>
                      <div class="flex flex-col items-center justify-center py-20 text-center gap-2">
                        <div class="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 mb-1">
                          <Database class="w-6 h-6" />
                        </div>
                        <span class="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                          No Discovery History
                        </span>
                        <span class="text-[11px] text-zinc-400 max-w-xs">
                          No media parsing requests have been recorded in the database yet.
                        </span>
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
