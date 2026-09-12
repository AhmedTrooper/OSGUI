import { onMount, createMemo, For, Show, type JSX } from "solid-js";
import { Tooltip } from "@kobalte/core/tooltip";
import { useUIStore } from "@/store/useUIStore";
import { useQueueStore } from "@/store/useQueueStore";
import { ipc } from "@/utils/ipc";
import { isTauri } from "@/utils/tauri";
import type { DownloadJob, FileType } from "@/core/types/database.types";
import { DownloadRow } from "@/features/downloader/components/DownloadRow";
import { DownloadCloud, Trash2, Folder } from "lucide-solid";

interface TreeNode {
  id: string;
  type: FileType;
  name: string;
  isPlaylistGroup?: boolean;
  job?: DownloadJob;
  children: TreeNode[];
}

export default function Downloads(): JSX.Element {
  onMount(() => {
    useUIStore.setActivePath("/downloads");
    if (!isTauri()) return;
    void ipc
      .getAllJobs()
      .then((result) => useQueueStore.setQueue(result.payload ?? []))
      .catch((err: unknown) => console.error("Failed to fetch jobs from SQLite:", err));
  });

  const handlePauseToggle = async (job: DownloadJob): Promise<void> => {
    const isDownloading = job.status === "downloading";
    const nextStatus = isDownloading ? "paused" : "downloading";
    useQueueStore.updateJobStatus(job.slug, nextStatus);
    if (!isDownloading) {
      useQueueStore.updateJobProgress(job.slug, job.progress, "Resuming...");
    }

    try {
      const res = isDownloading
        ? await ipc.requestJobPause({ jobSlug: job.slug })
        : await ipc.triggerJobStart({ jobSlug: job.slug });
      if (!res.success) {
        throw new Error(res.message ?? "ipc call failed");
      }
    } catch (e) {
      console.error(`Pause/Resume toggle failed for job ${job.slug}:`, e);
      const errMsg =
        e instanceof Error ? e.message : "Failed to communicate with native downloader pipeline.";
      useQueueStore.updateJobStatus(job.slug, "error");
      useQueueStore.updateJobProgress(job.slug, job.progress, errMsg);
    }
  };

  const treeNodes = createMemo<TreeNode[]>(() => {
    const jobNodes: Record<string, TreeNode> = {};
    useQueueStore.state.queue.forEach((job) => {
      jobNodes[job.slug] = {
        id: job.slug,
        type: job.fileType,
        name: job.name,
        job,
        children: [],
      };
    });

    const rootNodes: TreeNode[] = [];
    const playlistGroups: Record<string, TreeNode> = {};
    const parentedJobs = new Set<string>();

    useQueueStore.state.queue.forEach((job) => {
      if (job.fileType !== "subtitle") return;
      let parentSlug = job.associatedMediaJobSlug;
      if (!parentSlug) {
        const matchedParent = useQueueStore.state.queue.find(
          (j) => j.url === job.url && j.fileType !== "subtitle",
        );
        if (matchedParent) parentSlug = matchedParent.slug;
      }
      if (parentSlug) {
        const parentNode = jobNodes[parentSlug];
        const jobNode = jobNodes[job.slug];
        if (parentNode && jobNode) {
          parentNode.children.push(jobNode);
          parentedJobs.add(job.slug);
        }
      }
    });

    const virtualVideoNodes: Record<string, TreeNode> = {};

    useQueueStore.state.queue.forEach((job) => {
      if (job.fileType !== "subtitle" || parentedJobs.has(job.slug)) return;
      const urlKey = job.url;
      if (!virtualVideoNodes[urlKey]) {
        let cleanVideoTitle = job.name;
        if (job.name.startsWith("[sub_") && job.name.includes("]_")) {
          cleanVideoTitle = job.name.substring(job.name.indexOf("]_") + 2);
        }
        virtualVideoNodes[urlKey] = {
          id: `virtual-video-${urlKey}`,
          type: "video",
          name: cleanVideoTitle,
          children: [],
        };
      }
      virtualVideoNodes[urlKey].children.push(jobNodes[job.slug]!);
    });

    useQueueStore.state.queue.forEach((job) => {
      if (job.fileType === "subtitle") return;
      const node = jobNodes[job.slug];
      if (!node) return;
      const groupSlug = job.parentPlaylistSlug || (job.isPlaylist ? job.parsedFileSlug : undefined);

      if (groupSlug) {
        if (!playlistGroups[groupSlug]) {
          playlistGroups[groupSlug] = {
            id: `playlist-${groupSlug}`,
            type: "playlist",
            name: job.playlistName || "Playlist Batch",
            isPlaylistGroup: true,
            children: [],
          };
          rootNodes.push(playlistGroups[groupSlug]);
        }
        playlistGroups[groupSlug].children.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    Object.values(virtualVideoNodes).forEach((virtualNode) => {
      const firstChild = virtualNode.children[0]?.job;
      const groupSlug = firstChild?.parentPlaylistSlug;

      if (groupSlug && playlistGroups[groupSlug]) {
        playlistGroups[groupSlug].children.push(virtualNode);
      } else {
        rootNodes.push(virtualNode);
      }
    });

    return rootNodes;
  });

  const handleReveal = async (job: DownloadJob): Promise<void> => {
    try {
      const res = await ipc.revealJobInExplorer({ jobSlug: job.slug });
      if (!res.success) throw new Error(res.message ?? "reveal_job_in_explorer failed");
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : String(e);
      alert(`Asset location could not be revealed: ${msg}`);
    }
  };

  const renderTree = (nodes: TreeNode[], depth = 0): JSX.Element => (
    <For each={nodes}>
      {(node) => (
        <div
          class={`flex flex-col min-w-0 ${depth > 0 ? "ml-4 sm:ml-8 border-l-2 border-zinc-200 dark:border-white/10 pl-4 py-1 w-auto" : "py-1 w-full"}`}
        >
          <Show
            when={node.isPlaylistGroup}
            fallback={
              <Show
                when={node.job}
                fallback={
                  <div class="flex items-center gap-3 bg-blue-500/5 dark:bg-blue-500/5 p-3 rounded-xl border border-blue-500/10 w-full min-w-0 shadow-sm mb-2 mt-1">
                    <Tooltip openDelay={200} placement="right">
                      <Tooltip.Trigger
                        as="div"
                        class="p-2 bg-blue-600/10 text-blue-600 dark:text-blue-400 rounded-lg flex-shrink-0 cursor-default inline-flex"
                      >
                        <Folder class="w-4 h-4" />
                      </Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                          <Tooltip.Arrow />
                          Video Subtitles
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    </Tooltip>
                    <div class="flex flex-col min-w-0">
                      <span class="font-semibold text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 leading-tight line-clamp-1">
                        {node.name}
                      </span>
                      <Tooltip openDelay={200} placement="right">
                        <Tooltip.Trigger
                          as="span"
                          class="cursor-default text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400"
                        >
                          {node.children.length}
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                            <Tooltip.Arrow />
                            Active subtitle tracks
                          </Tooltip.Content>
                        </Tooltip.Portal>
                      </Tooltip>
                    </div>
                  </div>
                }
              >
                <div class="w-full min-w-0">
                  <DownloadRow
                    id={node.job!.slug}
                    onPauseToggle={() => {
                      void handlePauseToggle(node.job!);
                    }}
                    onReveal={() => {
                      void handleReveal(node.job!);
                    }}
                    onDelete={() => {
                      void handleDelete(node.job!.slug);
                    }}
                  />
                </div>
              </Show>
            }
          >
            <div class="flex items-center gap-3 bg-purple-500/10 dark:bg-purple-500/10 p-3 sm:p-4 rounded-xl border border-purple-500/20 w-full min-w-0 shadow-sm mb-2 mt-2">
              <Tooltip openDelay={200} placement="right">
                <Tooltip.Trigger
                  as="div"
                  class="p-2 bg-purple-500 text-white rounded-lg shadow-sm flex-shrink-0 cursor-default inline-flex"
                >
                  <Folder class="w-4 h-4" />
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                    <Tooltip.Arrow />
                    Playlist Group
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip>
              <div class="flex flex-col min-w-0">
                <span class="font-bold text-xs sm:text-sm text-zinc-900 dark:text-white leading-tight line-clamp-1">
                  {node.name}
                </span>
                <Tooltip openDelay={200} placement="right">
                  <Tooltip.Trigger
                    as="span"
                    class="cursor-default text-[10px] sm:text-xs text-purple-600 dark:text-purple-400 font-semibold uppercase tracking-wider"
                  >
                    {node.children.length}
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                      <Tooltip.Arrow />
                      Items in playlist
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip>
              </div>
            </div>
          </Show>

          <Show when={node.children.length > 0}>
            <div class="flex flex-col gap-1 mt-1 w-auto min-w-0">
              {renderTree(node.children, depth + 1)}
            </div>
          </Show>
        </div>
      )}
    </For>
  );

  const handleDelete = async (slug: string): Promise<void> => {
    useQueueStore.removeJob(slug);
    if (!isTauri()) return;
    try {
      await ipc.deleteJobRecord({ jobSlug: slug });
    } catch (e) {
      console.error(`Failed to delete job ${slug} from SQLite backend:`, e);
    }
  };

  const handleClearAll = async (): Promise<void> => {
    useQueueStore.clearQueue();
    if (!isTauri()) return;
    try {
      await ipc.clearAllJobsRecords();
    } catch (e) {
      console.error("Failed to clear all jobs from SQLite backend:", e);
    }
  };

  return (
    <div class="flex flex-col gap-6 w-full max-w-4xl mx-auto h-full py-2">
      <div class="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-white/10">
        <div class="flex items-center gap-2.5">
          <Tooltip openDelay={200} placement="bottom">
            <Tooltip.Trigger
              as="div"
              class="p-1.5 bg-indigo-500 rounded-md text-white shadow-sm cursor-default inline-flex"
            >
              <DownloadCloud class="w-4 h-4" />
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                <Tooltip.Arrow />
                Active Downloads
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip>
        </div>
        <Show when={useQueueStore.state.queue.length > 0}>
          <Tooltip openDelay={200} placement="left">
            <Tooltip.Trigger
              as="button"
              onClick={() => {
                void handleClearAll();
              }}
              class="flex items-center justify-center p-2 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors"
              type="button"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                <Tooltip.Arrow />
                Clear Finished
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip>
        </Show>
      </div>

      <div class="flex flex-col w-full mt-2">
        <Show
          when={useQueueStore.state.queue.length > 0}
          fallback={
            <div class="flex flex-col items-center justify-center py-20 text-center gap-2">
              <Tooltip openDelay={200} placement="bottom">
                <Tooltip.Trigger as="div" class="cursor-default inline-flex">
                  <DownloadCloud class="w-8 h-8 text-zinc-300 dark:text-zinc-700" />
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                    <Tooltip.Arrow />
                    No active downloads
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip>
            </div>
          }
        >
          <div class="flex flex-col gap-2 w-full">{renderTree(treeNodes(), 0)}</div>
        </Show>
      </div>
    </div>
  );
}
