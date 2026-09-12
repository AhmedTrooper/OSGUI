import { onMount, createSignal, For, Show, onCleanup, type JSX } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Tooltip } from "@kobalte/core/tooltip";
import {
  Inbox,
  Trash2,
  ArrowRight,
  Calendar,
  Clock,
  Search,
  RefreshCw,
  Sparkles,
  Link2,
  Info,
} from "lucide-solid";
import { useUIStore } from "@/store/useUIStore";
import { ipc } from "@/utils/ipc";
import { isTauri, safeListen } from "@/utils/tauri";
import { formatDate, formatTime } from "@/utils/format";
import type { InboxItem, InboxStatus } from "@/core/types/database.types";

type HealthStatus = "idle" | "checking" | "online" | "offline";

export default function InboxRoute(): JSX.Element {
  const navigate = useNavigate();
  const [inboxItems, setInboxItems] = createSignal<InboxItem[]>([]);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [loading, setLoading] = createSignal(true);
  const [errorMsg, setErrorMsg] = createSignal("");
  const [activePort, setActivePort] = createSignal(14221);
  const [healthStatus, setHealthStatus] = createSignal<HealthStatus>("idle");
  const [healthMsg, setHealthMsg] = createSignal("");
  let unlistenInbox: (() => void) | null = null;

  const fetchInbox = async (): Promise<void> => {
    setLoading(true);
    setErrorMsg("");
    if (isTauri()) {
      try {
        const result = await ipc.getInboxUrls();
        setInboxItems(result.payload ?? []);
      } catch (err) {
        console.error("Failed to fetch inbox URLs:", err);
        setErrorMsg("Failed to connect to internal inbox database.");
      } finally {
        setLoading(false);
      }
    } else {
      setTimeout(() => {
        const now = Date.now();
        const samples: InboxItem[] = [
          {
            slug: "inbox-1",
            url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            status: "pending",
            created_at: new Date(now - 1000 * 60 * 10).toISOString(),
            updated_at: new Date(now - 1000 * 60 * 10).toISOString(),
          },
          {
            slug: "inbox-2",
            url: "https://xyz.pdf/document.pdf",
            status: "downloaded",
            created_at: new Date(now - 1000 * 60 * 120).toISOString(),
            updated_at: new Date(now - 1000 * 60 * 115).toISOString(),
          },
          {
            slug: "inbox-3",
            url: "https://vimeo.com/987654321",
            status: "parsed",
            created_at: new Date(now - 1000 * 60 * 600).toISOString(),
            updated_at: new Date(now - 1000 * 60 * 595).toISOString(),
          },
        ];
        setInboxItems(samples);
        setLoading(false);
      }, 800);
    }
  };

  const testConnection = async (): Promise<void> => {
    setHealthStatus("checking");
    setHealthMsg("");
    try {
      const res = await fetch(`http://localhost:${activePort()}/health`);
      if (res.ok) {
        const data: { message?: string } = await res.json();
        setHealthStatus("online");
        setHealthMsg(data.message || "Local API connection test succeeded.");
      } else {
        setHealthStatus("offline");
        setHealthMsg(`Local Server responded with status: ${res.status}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setHealthStatus("offline");
      setHealthMsg(msg || "Failed to make HTTP socket handshake.");
    }
  };

  onMount(() => {
    useUIStore.setActivePath("/inbox");
    void fetchInbox();

    void (async () => {
      try {
        const portResult = await ipc.getActiveApiPort();
        setActivePort(portResult.port);
      } catch (e) {
        console.error("Failed to query active Axum port from SQLite:", e);
      }
    })();

    void safeListen("inbox-updated", () => {
      console.log("SyncLime: Inbox received update notification. Refreshing queue list...");
      void fetchInbox();
    }).then((unlisten) => {
      unlistenInbox = unlisten;
    });
  });

  onCleanup(() => {
    unlistenInbox?.();
  });

  const handleDelete = async (slug: string, e: Event): Promise<void> => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this link from your inbox?")) return;

    if (isTauri()) {
      try {
        await ipc.deleteInboxUrl({ slug });
        await fetchInbox();
      } catch (err) {
        console.error("Failed to delete inbox item:", err);
      }
    } else {
      setInboxItems((prev) => prev.filter((item) => item.slug !== slug));
    }
  };

  const filteredItems = (): InboxItem[] => {
    const query = searchQuery().toLowerCase().trim();
    if (!query) return inboxItems();
    return inboxItems().filter((item) => item.url.toLowerCase().includes(query));
  };

  const pendingCount = (): number =>
    inboxItems().filter((item) => item.status === "pending").length;

  return (
    <div class="space-y-4 max-w-4xl mx-auto py-2 select-none animate-fade-in text-xs sm:text-sm font-sans text-left">
      {/* Header */}
      <div class="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-white/10">
        <div class="flex items-center gap-3">
          <Tooltip openDelay={200} placement="bottom">
            <Tooltip.Trigger
              as="div"
              class="w-10 h-10 flex items-center justify-center bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-lg shadow-sm cursor-default inline-flex"
            >
              <Inbox class="w-5 h-5 animate-pulse" />
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                <Tooltip.Arrow />
                Inbox Queue
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip>
          <Show when={pendingCount() > 0}>
            <Tooltip openDelay={200} placement="right">
              <Tooltip.Trigger
                as="span"
                class="cursor-default px-2 py-0.5 text-[10px] font-extrabold bg-amber-500 text-white rounded-full animate-bounce"
              >
                {pendingCount()}
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                  <Tooltip.Arrow />
                  {pendingCount()} New
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip>
          </Show>
        </div>
        <Tooltip openDelay={200} placement="left">
          <Tooltip.Trigger
            as="button"
            onClick={() => {
              void fetchInbox();
            }}
            class="p-2 text-zinc-500 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/80 rounded-lg transition-colors border border-zinc-200 dark:border-zinc-800"
            type="button"
          >
            <RefreshCw class={`w-4 h-4 ${loading() ? "animate-spin text-blue-500" : ""}`} />
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
              <Tooltip.Arrow />
              Refresh Inbox Queue
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip>
      </div>

      {/* Filter / Search bar */}
      <div class="flex flex-col sm:flex-row gap-3">
        <div class="relative flex-1">
          <Tooltip openDelay={200} placement="right">
            <Tooltip.Trigger
              as="div"
              class="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 cursor-default inline-flex"
            >
              <Search class="w-4 h-4" />
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                <Tooltip.Arrow />
                Search received links
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip>
          <input
            type="text"
            placeholder="Search received links and domains..."
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
            class="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-blue-500 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-zinc-900 focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-blue-500/10 transition-all outline-none text-xs sm:text-sm text-zinc-900 dark:text-white shadow-inner"
          />
        </div>
      </div>

      {/* Main Inbox Queue */}
      <Show
        when={!loading()}
        fallback={
          <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div class="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <Tooltip openDelay={200} placement="bottom">
              <Tooltip.Trigger as="span" class="cursor-default text-zinc-400 text-xs font-semibold">
                ·
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                  <Tooltip.Arrow />
                  Scanning SQLite pipeline database...
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip>
          </div>
        }
      >
        <Show
          when={!errorMsg()}
          fallback={
            <div class="border border-red-200/60 dark:border-red-900/40 bg-red-500/5 p-4 rounded-xl text-center text-red-500 font-semibold text-xs flex items-center justify-center gap-2">
              <span>{errorMsg()}</span>
            </div>
          }
        >
          <Show
            when={filteredItems().length > 0}
            fallback={
              <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4">
                <Tooltip openDelay={200} placement="bottom">
                  <Tooltip.Trigger
                    as="div"
                    class="w-12 h-12 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 rounded-full cursor-default inline-flex"
                  >
                    <Inbox class="w-6 h-6" />
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                      <Tooltip.Arrow />
                      No items in inbox
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip>
              </div>
            }
          >
            <div class="grid gap-3">
              <For each={filteredItems()}>
                {(item) => (
                  <div
                    onClick={() => navigate(`/inbox/${item.slug}`)}
                    class="group relative border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 p-4 rounded-xl shadow-sm hover:shadow transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                  >
                    {/* Left: Info */}
                    <div class="flex-1 min-w-0 space-y-1.5">
                      <div class="flex items-center gap-2 flex-wrap">
                        {/* Status Badge */}
                        <StatusBadge status={item.status} />

                        {/* Date details */}
                        <div class="flex items-center gap-3 text-zinc-400 dark:text-zinc-500 text-[10px] font-medium">
                          <Tooltip openDelay={200} placement="right">
                            <Tooltip.Trigger
                              as="span"
                              class="cursor-default flex items-center gap-1"
                            >
                              <Calendar class="w-3 h-3" />
                              {formatDate(item.created_at)}
                            </Tooltip.Trigger>
                            <Tooltip.Portal>
                              <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                                <Tooltip.Arrow />
                                Date Received
                              </Tooltip.Content>
                            </Tooltip.Portal>
                          </Tooltip>
                          <Tooltip openDelay={200} placement="right">
                            <Tooltip.Trigger
                              as="span"
                              class="cursor-default flex items-center gap-1"
                            >
                              <Clock class="w-3 h-3" />
                              {formatTime(item.created_at)}
                            </Tooltip.Trigger>
                            <Tooltip.Portal>
                              <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                                <Tooltip.Arrow />
                                Time Received
                              </Tooltip.Content>
                            </Tooltip.Portal>
                          </Tooltip>
                        </div>
                      </div>

                      {/* URL String */}
                      <div class="flex items-center gap-2 text-zinc-700 dark:text-zinc-200 font-semibold break-all text-xs">
                        <Link2 class="w-4 h-4 text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
                        <span class="truncate group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                          {item.url}
                        </span>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div class="flex items-center gap-2.5 sm:self-center">
                      <Tooltip openDelay={200} placement="left">
                        <Tooltip.Trigger
                          as="button"
                          onClick={(e) => {
                            void handleDelete(item.slug, e);
                          }}
                          class="p-2 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/5 dark:hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/10"
                          type="button"
                        >
                          <Trash2 class="w-4 h-4" />
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                            <Tooltip.Arrow />
                            Remove link
                          </Tooltip.Content>
                        </Tooltip.Portal>
                      </Tooltip>
                      <Tooltip openDelay={200} placement="left">
                        <Tooltip.Trigger
                          as="div"
                          class="p-2 text-zinc-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 hover:bg-blue-500/5 dark:hover:bg-blue-500/10 rounded-lg transition-colors border border-transparent group-hover:border-blue-500/10 cursor-pointer inline-flex"
                        >
                          <ArrowRight class="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" />
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                            <Tooltip.Arrow />
                            View action panel
                          </Tooltip.Content>
                        </Tooltip.Portal>
                      </Tooltip>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </Show>
      </Show>

      {/* Local API server Connection Diagnostics & Quick Tutorial Panel */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
        {/* Connection Diagnostics Card */}
        <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 p-5 rounded-xl shadow-sm space-y-4">
          <div class="flex items-center gap-3">
            <Tooltip openDelay={200} placement="right">
              <Tooltip.Trigger
                as="div"
                class="w-9 h-9 flex items-center justify-center bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-lg cursor-default inline-flex"
              >
                <RefreshCw
                  class={`w-4.5 h-4.5 ${healthStatus() === "checking" ? "animate-spin" : ""}`}
                />
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                  <Tooltip.Arrow />
                  Local Server Diagnostics
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip>
          </div>

          <div class="text-xs space-y-3 bg-zinc-50 dark:bg-zinc-950 p-3 rounded-lg border border-zinc-200/50 dark:border-zinc-800/50">
            <div class="flex items-center justify-between">
              <Tooltip openDelay={200} placement="right">
                <Tooltip.Trigger as="span" class="cursor-default text-zinc-500 font-medium">
                  ·
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                    <Tooltip.Arrow />
                    Bound Port
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip>
              <code class="bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-[10px] px-2 py-0.5 rounded font-mono font-extrabold">
                {activePort()}
              </code>
            </div>
            <div class="flex items-center justify-between">
              <Tooltip openDelay={200} placement="right">
                <Tooltip.Trigger as="span" class="cursor-default text-zinc-500 font-medium">
                  ·
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                    <Tooltip.Arrow />
                    Diagnostic
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip>
              <Show when={healthStatus() === "idle"}>
                <Tooltip openDelay={200} placement="left">
                  <Tooltip.Trigger
                    as="span"
                    class="cursor-default text-zinc-400 font-bold uppercase text-[9px]"
                  >
                    UC
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                      <Tooltip.Arrow />
                      Unchecked
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip>
              </Show>
              <Show when={healthStatus() === "checking"}>
                <span class="text-blue-500 font-bold uppercase text-[9px] animate-pulse">···</span>
              </Show>
              <Show when={healthStatus() === "online"}>
                <span class="inline-flex items-center gap-1 text-emerald-500 font-bold uppercase text-[9px]">
                  <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                </span>
              </Show>
              <Show when={healthStatus() === "offline"}>
                <span class="text-red-500 font-bold uppercase text-[9px]">●</span>
              </Show>
            </div>

            <Show when={healthMsg()}>
              <div class="pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50 text-[10px] text-zinc-400 leading-relaxed font-mono whitespace-pre-wrap break-all">
                {healthMsg()}
              </div>
            </Show>
          </div>

          <Tooltip openDelay={200} placement="top">
            <Tooltip.Trigger
              as="button"
              onClick={() => {
                void testConnection();
              }}
              disabled={healthStatus() === "checking"}
              class="w-full flex items-center justify-center gap-1.5 py-2 px-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors disabled:opacity-50"
              type="button"
            >
              <RefreshCw
                class={`w-3.5 h-3.5 ${healthStatus() === "checking" ? "animate-spin" : ""}`}
              />
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                <Tooltip.Arrow />
                Test API Connection
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip>
        </div>

        {/* Quick Tutorial Card */}
        <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 p-5 rounded-xl shadow-sm space-y-3 text-left">
          <div class="flex items-center gap-2 text-zinc-800 dark:text-zinc-200 font-bold text-[10px] uppercase tracking-wider">
            <Tooltip openDelay={200} placement="right">
              <Tooltip.Trigger as="span" class="cursor-default inline-flex items-center">
                <Sparkles class="w-4.5 h-4.5 text-purple-500" />
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                  <Tooltip.Arrow />
                  Developer POST Payload Schema
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip>
          </div>

          <div class="space-y-2">
            <p class="text-[10px] text-zinc-400 leading-normal font-sans">
              Send a JSON POST payload to direct links directly to your inbox queue:
            </p>

            <div class="relative">
              <pre class="bg-zinc-950 text-zinc-300 p-3 rounded-lg overflow-x-auto font-mono text-[9px] leading-relaxed select-text select-all">
                {`POST http://localhost:${activePort()}/add
Content-Type: application/json

{
  "url": "https://youtube.com/watch?v=..."
}`}
              </pre>
            </div>

            <div class="text-[9px] text-zinc-400 flex items-start gap-1 font-sans">
              <Tooltip openDelay={200} placement="right">
                <Tooltip.Trigger as="span" class="cursor-default inline-flex items-center">
                  <Info class="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                    <Tooltip.Arrow />
                    Returns success response with generated inbox item unique slug.
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatusBadgeProps {
  status: InboxStatus;
}

function StatusBadge(props: StatusBadgeProps): JSX.Element {
  if (props.status === "pending") {
    return (
      <Tooltip openDelay={200} placement="right">
        <Tooltip.Trigger
          as="span"
          class="cursor-default inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
        >
          <span class="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
            <Tooltip.Arrow />
            Pending
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip>
    );
  }
  if (props.status === "parsed") {
    return (
      <Tooltip openDelay={200} placement="right">
        <Tooltip.Trigger
          as="span"
          class="cursor-default inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
        >
          <span class="w-1.5 h-1.5 bg-blue-500 rounded-full" />
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
            <Tooltip.Arrow />
            Parsed
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip>
    );
  }
  return (
    <Tooltip openDelay={200} placement="right">
      <Tooltip.Trigger
        as="span"
        class="cursor-default inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
      >
        <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
          <Tooltip.Arrow />
          Downloaded
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip>
  );
}
