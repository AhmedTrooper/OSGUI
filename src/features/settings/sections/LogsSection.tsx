import { createSignal, For, Show, onMount, type JSX } from "solid-js";
import { Tooltip } from "@kobalte/core/tooltip";
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
  Download,
  Cpu,
} from "lucide-solid";
import { ipc } from "@/utils/ipc";
import { isTauri } from "@/utils/tauri";
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
      <div class="flex items-center justify-end pb-2 border-b border-zinc-200 dark:border-zinc-800/80">
        <Show when={hasLogs()}>
          <AdaptiveTooltip content="Flush all exception and discovery logs">
            <button
              onClick={() => {
                void handleClearLogs();
              }}
              class="flex items-center justify-center p-2 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 hover:border-red-500/35 text-red-600 dark:text-red-400 rounded-lg transition-all cursor-pointer shadow-sm animate-fade-in"
              type="button"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </AdaptiveTooltip>
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
                <Tooltip openDelay={200} placement="left">
                  <Tooltip.Trigger
                    as="span"
                    class="text-zinc-400 dark:text-zinc-600 cursor-default"
                  >
                    <Cpu class="w-3.5 h-3.5" />
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                      <Tooltip.Arrow />
                      SQLite Log Storage
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip>
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
                                  <div class="flex items-center justify-between mb-1">
                                    <Tooltip openDelay={200} placement="right">
                                      <Tooltip.Trigger
                                        as="span"
                                        class="text-zinc-400 cursor-default"
                                      >
                                        <Download class="w-3 h-3" />
                                      </Tooltip.Trigger>
                                      <Tooltip.Portal>
                                        <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                                          <Tooltip.Arrow />
                                          Execution Command
                                        </Tooltip.Content>
                                      </Tooltip.Portal>
                                    </Tooltip>
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
                                  <div class="bg-zinc-100 dark:bg-black p-2 rounded-lg border border-zinc-250 dark:border-zinc-900 break-all text-zinc-800 dark:text-zinc-300">
                                    {log.command_executed}
                                  </div>
                                </div>

                                <div>
                                  <div class="flex items-center justify-between mb-1">
                                    <Tooltip openDelay={200} placement="right">
                                      <Tooltip.Trigger
                                        as="span"
                                        class="text-zinc-400 cursor-default"
                                      >
                                        <FileWarning class="w-3 h-3" />
                                      </Tooltip.Trigger>
                                      <Tooltip.Portal>
                                        <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                                          <Tooltip.Arrow />
                                          Full Error Payload Description
                                        </Tooltip.Content>
                                      </Tooltip.Portal>
                                    </Tooltip>
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
                                  <div class="bg-red-500/5 text-red-700 dark:text-red-400 p-2 rounded-lg border border-red-500/15 dark:border-red-500/10 break-words whitespace-pre-wrap leading-relaxed select-text">
                                    {log.error_message}
                                  </div>
                                </div>

                                <div class="grid grid-cols-2 gap-4 text-[9px] text-zinc-400 dark:text-zinc-500 pt-2 border-t border-zinc-200 dark:border-zinc-900">
                                  <div>
                                    <strong>{log.slug}</strong>
                                  </div>
                                  <div>
                                    {log.is_resolved === 1 ? (
                                      <span class="text-emerald-500 flex items-center gap-1">
                                        <Check class="w-3 h-3" /> RESOLVED
                                      </span>
                                    ) : (
                                      <span class="text-red-500 flex items-center gap-1">
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
                        <FileWarning class="w-8 h-8 text-zinc-300 dark:text-zinc-700 mb-1" />
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
                                  <div class="flex items-center justify-between mb-1">
                                    <Tooltip openDelay={200} placement="right">
                                      <Tooltip.Trigger
                                        as="span"
                                        class="text-zinc-400 cursor-default"
                                      >
                                        <Download class="w-3 h-3" />
                                      </Tooltip.Trigger>
                                      <Tooltip.Portal>
                                        <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                                          <Tooltip.Arrow />
                                          Probe Command Pipeline
                                        </Tooltip.Content>
                                      </Tooltip.Portal>
                                    </Tooltip>
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
                                  <div class="bg-zinc-100 dark:bg-black p-2 rounded-lg border border-zinc-250 dark:border-zinc-900 break-all text-zinc-800 dark:text-zinc-300">
                                    {log.command_executed}
                                  </div>
                                </div>

                                <div class="grid grid-cols-2 gap-4 text-[11px] text-zinc-850 dark:text-zinc-300 font-sans">
                                  <div class="p-3 bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-900 rounded-xl space-y-1">
                                    <Tooltip openDelay={200} placement="top">
                                      <Tooltip.Trigger
                                        as="span"
                                        class="text-zinc-450 dark:text-zinc-500 cursor-default flex"
                                      >
                                        <Download class="w-3 h-3" />
                                      </Tooltip.Trigger>
                                      <Tooltip.Portal>
                                        <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                                          <Tooltip.Arrow />
                                          Exit Code
                                        </Tooltip.Content>
                                      </Tooltip.Portal>
                                    </Tooltip>
                                    <span class="font-mono">
                                      {log.exit_code !== null ? log.exit_code : "N/A"}
                                    </span>
                                  </div>
                                  <div class="p-3 bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-900 rounded-xl space-y-1">
                                    <Tooltip openDelay={200} placement="top">
                                      <Tooltip.Trigger
                                        as="span"
                                        class="text-zinc-450 dark:text-zinc-500 cursor-default flex"
                                      >
                                        <Database class="w-3 h-3" />
                                      </Tooltip.Trigger>
                                      <Tooltip.Portal>
                                        <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                                          <Tooltip.Arrow />
                                          Bytes Transferred
                                        </Tooltip.Content>
                                      </Tooltip.Portal>
                                    </Tooltip>
                                    <span class="font-mono">
                                      {log.bytes_returned.toLocaleString()}
                                    </span>
                                  </div>
                                  <div class="p-3 bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-900 rounded-xl space-y-1">
                                    <Tooltip openDelay={200} placement="top">
                                      <Tooltip.Trigger
                                        as="span"
                                        class="text-zinc-450 dark:text-zinc-500 cursor-default flex"
                                      >
                                        <Cpu class="w-3 h-3" />
                                      </Tooltip.Trigger>
                                      <Tooltip.Portal>
                                        <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                                          <Tooltip.Arrow />
                                          Analysis Time
                                        </Tooltip.Content>
                                      </Tooltip.Portal>
                                    </Tooltip>
                                    <span class="font-mono text-indigo-500 dark:text-indigo-400 font-bold">
                                      {log.duration_ms}ms
                                    </span>
                                  </div>
                                  <div class="p-3 bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-900 rounded-xl space-y-1">
                                    <Tooltip openDelay={200} placement="top">
                                      <Tooltip.Trigger
                                        as="span"
                                        class="text-zinc-450 dark:text-zinc-500 cursor-default flex"
                                      >
                                        <CheckCircle2 class="w-3 h-3" />
                                      </Tooltip.Trigger>
                                      <Tooltip.Portal>
                                        <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                                          <Tooltip.Arrow />
                                          Engine Status
                                        </Tooltip.Content>
                                      </Tooltip.Portal>
                                    </Tooltip>
                                    <span
                                      class={`font-black uppercase text-[10px] tracking-wider ${isFailed ? "text-red-500" : "text-emerald-500"}`}
                                    >
                                      {log.status}
                                    </span>
                                  </div>
                                </div>
                                <div class="text-[9px] text-zinc-450 dark:text-zinc-500 pt-2 border-t border-zinc-200 dark:border-zinc-900 flex items-center gap-1">
                                  <Database class="w-3 h-3" /> {log.slug}
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
