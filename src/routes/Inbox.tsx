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
  Link2,
  Copy,
  Check,
  Server,
  X,
  Globe,
  ChevronLeft,
  ChevronRight,
} from "lucide-solid";
import { useUIStore } from "@/store/useUIStore";
import { ipc } from "@/utils/ipc";
import { isTauri, safeListen } from "@/utils/tauri";
import { formatDate, formatTime } from "@/utils/format";
import type { InboxItem, InboxStatus } from "@/core/types/database.types";

type HealthStatus = "idle" | "checking" | "online" | "offline";
const PAGE_SIZE = 10;

function extractDomain(urlStr: string): string {
  try {
    const parsed = new URL(urlStr);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "external";
  }
}

export default function InboxRoute(): JSX.Element {
  const navigate = useNavigate();
  const [inboxItems, setInboxItems] = createSignal<InboxItem[]>([]);
  const [page, setPage] = createSignal(1);
  const [total, setTotal] = createSignal(0);
  const [pendingCount, setPendingCount] = createSignal(0);
  const [totalPages, setTotalPages] = createSignal(1);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [loading, setLoading] = createSignal(true);
  const [errorMsg, setErrorMsg] = createSignal("");
  const [activePort, setActivePort] = createSignal(14221);
  const [healthStatus, setHealthStatus] = createSignal<HealthStatus>("idle");
  const [healthMsg, setHealthMsg] = createSignal("");
  const [copiedSlug, setCopiedSlug] = createSignal<string | null>(null);
  let unlistenInbox: (() => void) | null = null;

  const fetchInbox = async (targetPage = page()): Promise<void> => {
    setLoading(true);
    setErrorMsg("");
    if (isTauri()) {
      try {
        const result = await ipc.getInboxUrls({
          page: targetPage,
          pageSize: PAGE_SIZE,
        });
        if (result.success && result.payload) {
          setInboxItems(result.payload.items ?? []);
          setTotal(result.payload.total ?? 0);
          setPendingCount(result.payload.pending_count ?? 0);
          setTotalPages(result.payload.total_pages ?? 1);
          setPage(result.payload.page ?? targetPage);
        } else {
          setErrorMsg(result.message || "Failed to query inbox records.");
        }
      } catch (err) {
        console.error("Failed to fetch inbox URLs:", err);
        setErrorMsg("Failed to connect to internal inbox database.");
      } finally {
        setLoading(false);
      }
    } else {
      setInboxItems([]);
      setTotal(0);
      setPendingCount(0);
      setTotalPages(1);
      setLoading(false);
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
    void fetchInbox(1);

    void (async () => {
      try {
        const portResult = await ipc.getActiveApiPort();
        setActivePort(portResult.port);
      } catch (e) {
        console.error("Failed to query active Axum port from SQLite:", e);
      }
    })();

    void safeListen("inbox-updated", () => {
      void fetchInbox(page());
    }).then((unlisten) => {
      unlistenInbox = unlisten;
    });
  });

  onCleanup(() => {
    unlistenInbox?.();
  });

  const handleDelete = async (slug: string, e: Event): Promise<void> => {
    e.stopPropagation();
    if (!confirm("Remove this link from your inbox?")) return;

    if (isTauri()) {
      try {
        await ipc.deleteInboxUrl({ slug });
        await fetchInbox(page());
      } catch (err) {
        console.error("Failed to delete inbox item:", err);
      }
    } else {
      setInboxItems((prev) => prev.filter((item) => item.slug !== slug));
    }
  };

  const handleCopyUrl = async (slug: string, urlText: string, e: Event): Promise<void> => {
    e.stopPropagation();
    try {
      await ipc.writeClipboardText(urlText);
      setCopiedSlug(slug);
      setTimeout(() => {
        if (copiedSlug() === slug) setCopiedSlug(null);
      }, 1500);
    } catch (err) {
      console.error("Failed to copy URL:", err);
    }
  };

  const handlePrevPage = (): void => {
    if (page() > 1 && !loading()) {
      void fetchInbox(page() - 1);
    }
  };

  const handleNextPage = (): void => {
    if (page() < totalPages() && !loading()) {
      void fetchInbox(page() + 1);
    }
  };

  const displayedItems = (): InboxItem[] => {
    const query = searchQuery().toLowerCase().trim();
    if (!query) return inboxItems();
    return inboxItems().filter(
      (item) =>
        item.url.toLowerCase().includes(query) ||
        extractDomain(item.url).toLowerCase().includes(query),
    );
  };

  const rangeStart = (): number => (total() === 0 ? 0 : (page() - 1) * PAGE_SIZE + 1);
  const rangeEnd = (): number => Math.min(page() * PAGE_SIZE, total());

  return (
    <div class="space-y-4 max-w-4xl mx-auto py-2 select-none animate-fade-in text-xs sm:text-sm font-sans text-left">
      {/* Header */}
      <div class="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 flex items-center justify-center bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-xl">
            <Inbox class="w-5 h-5" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-base font-bold text-zinc-900 dark:text-white">Inbox</h1>
              <Show when={pendingCount() > 0}>
                <span class="px-2 py-0.5 text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-full">
                  {pendingCount()} pending
                </span>
              </Show>
            </div>
            <p class="text-[11px] text-zinc-500 dark:text-zinc-400">
              Captured links from browser extensions and local API
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <Tooltip openDelay={200} placement="bottom">
            <Tooltip.Trigger
              as="button"
              onClick={() => void fetchInbox(page())}
              disabled={loading()}
              class="p-2 text-zinc-500 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors border border-zinc-200 dark:border-zinc-800 cursor-pointer disabled:opacity-50"
              type="button"
            >
              <RefreshCw class={`w-4 h-4 ${loading() ? "animate-spin text-blue-500" : ""}`} />
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                <Tooltip.Arrow />
                Refresh Inbox
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip>
        </div>
      </div>

      {/* Search & Info Toolbar */}
      <div class="flex items-center justify-between gap-3">
        <div class="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
          <Show when={total() > 0} fallback={<span>No items recorded</span>}>
            <span>
              Showing <strong class="text-zinc-800 dark:text-zinc-200">{rangeStart()}</strong> to{" "}
              <strong class="text-zinc-800 dark:text-zinc-200">{rangeEnd()}</strong> of{" "}
              <strong class="text-zinc-800 dark:text-zinc-200">{total()}</strong> items
            </span>
          </Show>
        </div>

        {/* Quick Filter Search */}
        <div class="relative w-full sm:max-w-xs">
          <div class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 pointer-events-none">
            <Search class="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            placeholder="Search on page..."
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
            class="w-full pl-9 pr-8 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-blue-500 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-blue-500/10 transition-all outline-none text-xs text-zinc-900 dark:text-white"
          />
          <Show when={searchQuery()}>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              class="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          </Show>
        </div>
      </div>

      {/* Main Inbox List */}
      <Show
        when={!loading()}
        fallback={
          <div class="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div class="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span class="text-xs text-zinc-400 font-medium">Loading inbox page...</span>
          </div>
        }
      >
        <Show
          when={!errorMsg()}
          fallback={
            <div class="border border-red-200 dark:border-red-900/40 bg-red-500/5 p-4 rounded-xl text-center text-red-500 font-semibold text-xs flex items-center justify-center gap-2">
              <span>{errorMsg()}</span>
            </div>
          }
        >
          <Show
            when={displayedItems().length > 0}
            fallback={
              <div class="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3">
                <div class="w-12 h-12 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 rounded-xl">
                  <Inbox class="w-6 h-6" />
                </div>
                <div>
                  <h3 class="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    {searchQuery() ? "No matching links on this page" : "Your inbox is empty"}
                  </h3>
                  <p class="text-[11px] text-zinc-400 max-w-sm mt-0.5">
                    {searchQuery()
                      ? `No links match "${searchQuery()}". Clear your search to view all page items.`
                      : "Links sent via browser extensions or local API POST requests will appear here."}
                  </p>
                </div>
              </div>
            }
          >
            <div class="space-y-2">
              <For each={displayedItems()}>
                {(item) => {
                  const domain = () => extractDomain(item.url);
                  const isCopied = () => copiedSlug() === item.slug;

                  return (
                    <div
                      onClick={() => navigate(`/inbox/${item.slug}`)}
                      class="group border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900/60 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 px-4 py-3 rounded-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer shadow-2xs"
                    >
                      {/* Left: Info */}
                      <div class="flex-1 min-w-0 space-y-1.5">
                        <div class="flex items-center gap-2 flex-wrap">
                          {/* Domain Pill */}
                          <div class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[10px] font-mono font-semibold">
                            <Globe class="w-3 h-3 text-zinc-400" />
                            <span>{domain()}</span>
                          </div>

                          {/* Status Badge */}
                          <StatusBadge status={item.status} />

                          {/* Timestamp */}
                          <div class="flex items-center gap-2 text-zinc-400 dark:text-zinc-500 text-[10px] font-medium ml-1">
                            <span class="flex items-center gap-1">
                              <Calendar class="w-3 h-3" />
                              {formatDate(item.created_at)}
                            </span>
                            <span>•</span>
                            <span class="flex items-center gap-1">
                              <Clock class="w-3 h-3" />
                              {formatTime(item.created_at)}
                            </span>
                          </div>
                        </div>

                        {/* URL String */}
                        <div class="flex items-center gap-2 text-zinc-800 dark:text-zinc-200 font-semibold text-xs">
                          <Link2 class="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                          <span class="truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {item.url}
                          </span>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div class="flex items-center gap-1.5 self-end sm:self-center flex-shrink-0">
                        {/* Copy URL */}
                        <Tooltip openDelay={200} placement="top">
                          <Tooltip.Trigger
                            as="button"
                            onClick={(e) => void handleCopyUrl(item.slug, item.url, e)}
                            class="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                            type="button"
                          >
                            <Show when={isCopied()} fallback={<Copy class="w-3.5 h-3.5" />}>
                              <Check class="w-3.5 h-3.5 text-emerald-500" />
                            </Show>
                          </Tooltip.Trigger>
                          <Tooltip.Portal>
                            <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                              <Tooltip.Arrow />
                              {isCopied() ? "Copied!" : "Copy URL"}
                            </Tooltip.Content>
                          </Tooltip.Portal>
                        </Tooltip>

                        {/* Delete item */}
                        <Tooltip openDelay={200} placement="top">
                          <Tooltip.Trigger
                            as="button"
                            onClick={(e) => void handleDelete(item.slug, e)}
                            class="p-2 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                            type="button"
                          >
                            <Trash2 class="w-3.5 h-3.5" />
                          </Tooltip.Trigger>
                          <Tooltip.Portal>
                            <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                              <Tooltip.Arrow />
                              Remove link
                            </Tooltip.Content>
                          </Tooltip.Portal>
                        </Tooltip>

                        {/* Inspect detail */}
                        <Tooltip openDelay={200} placement="top">
                          <Tooltip.Trigger
                            as="button"
                            onClick={() => navigate(`/inbox/${item.slug}`)}
                            class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors cursor-pointer ml-1"
                            type="button"
                          >
                            <span>Inspect</span>
                            <ArrowRight class="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                          </Tooltip.Trigger>
                          <Tooltip.Portal>
                            <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                              <Tooltip.Arrow />
                              Process this link
                            </Tooltip.Content>
                          </Tooltip.Portal>
                        </Tooltip>
                      </div>
                    </div>
                  );
                }}
              </For>
            </div>
          </Show>
        </Show>
      </Show>

      {/* Real Server-side Pagination Controls */}
      <Show when={totalPages() > 1}>
        <div class="flex items-center justify-between pt-2 px-1">
          <div class="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            Page <strong class="text-zinc-800 dark:text-zinc-200">{page()}</strong> of{" "}
            <strong class="text-zinc-800 dark:text-zinc-200">{totalPages()}</strong>
          </div>

          <div class="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={page() <= 1 || loading()}
              class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <ChevronLeft class="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <button
              type="button"
              onClick={handleNextPage}
              disabled={page() >= totalPages() || loading()}
              class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </Show>

      {/* Local Ingestion Service & API Integration */}
      <div class="border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 rounded-2xl p-4 sm:p-5 space-y-4 mt-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
              <Server class="w-4 h-4" />
            </div>
            <div>
              <h3 class="text-xs font-bold text-zinc-900 dark:text-white">
                Local Ingestion Server
              </h3>
              <p class="text-[11px] text-zinc-500 dark:text-zinc-400">
                Receives links from browser extensions and local webhooks
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void testConnection()}
            disabled={healthStatus() === "checking"}
            class="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 self-start sm:self-auto"
          >
            <RefreshCw
              class={`w-3.5 h-3.5 ${healthStatus() === "checking" ? "animate-spin text-blue-500" : ""}`}
            />
            <span>{healthStatus() === "checking" ? "Checking..." : "Test Connection"}</span>
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Status Details */}
          <div class="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/70 dark:border-zinc-800/70 space-y-2.5">
            <div class="flex items-center justify-between text-[11px]">
              <span class="text-zinc-500 dark:text-zinc-400 font-medium">Local Port</span>
              <code class="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono font-bold rounded">
                {activePort()}
              </code>
            </div>
            <div class="flex items-center justify-between text-[11px]">
              <span class="text-zinc-500 dark:text-zinc-400 font-medium">Service Status</span>
              <Show when={healthStatus() === "idle"}>
                <span class="text-zinc-400 font-medium">Idle (Not Checked)</span>
              </Show>
              <Show when={healthStatus() === "checking"}>
                <span class="text-blue-500 font-medium animate-pulse">Connecting...</span>
              </Show>
              <Show when={healthStatus() === "online"}>
                <span class="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Online
                </span>
              </Show>
              <Show when={healthStatus() === "offline"}>
                <span class="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400 font-semibold">
                  <span class="w-1.5 h-1.5 rounded-full bg-red-500" />
                  Offline
                </span>
              </Show>
            </div>
            <Show when={healthMsg()}>
              <div class="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[10px] text-zinc-500 dark:text-zinc-400 font-mono break-all leading-relaxed">
                {healthMsg()}
              </div>
            </Show>
          </div>

          {/* Developer POST Schema */}
          <div class="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/70 dark:border-zinc-800/70 space-y-1.5">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                HTTP Payload Example
              </span>
              <span class="text-[10px] font-mono text-zinc-400">POST /add</span>
            </div>
            <pre class="p-2.5 bg-zinc-950 text-zinc-300 rounded-lg text-[10px] font-mono overflow-x-auto select-all leading-relaxed">
{`POST http://localhost:${activePort()}/add
Content-Type: application/json

{
  "url": "https://..."
}`}
            </pre>
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
      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
        <span class="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Pending
      </span>
    );
  }
  if (props.status === "parsed") {
    return (
      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
        <span class="w-1.5 h-1.5 rounded-full bg-blue-500" />
        Parsed
      </span>
    );
  }
  return (
    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
      <span class="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      Downloaded
    </span>
  );
}
