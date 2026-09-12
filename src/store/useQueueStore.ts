/**
 * Download queue store. Hydrates on mount via `ipc.getAllJobs` and listens
 * for high-frequency `download-progress-token` events emitted by the Rust
 * downloader.
 */
import { createStore } from "solid-js/store";
import { isTauri, safeListen } from "@/utils/tauri";
import { ipc } from "@/utils/ipc";
import type { DownloadJob, DownloadStatus, FileType } from "@/core/types/database.types";

export type { DownloadJob, DownloadStatus, FileType };

interface QueueState {
  queue: DownloadJob[];
  progressUpdates: Record<string, number>;
}

const [queueState, setQueueState] = createStore<QueueState>({
  queue: [],
  progressUpdates: {},
});

const isDownloadStatus = (value: string): value is DownloadStatus =>
  value === "pending" ||
  value === "downloading" ||
  value === "paused" ||
  value === "completed" ||
  value === "error";

interface ProgressEvent {
  slug: string;
  progress: number;
  message: string;
  status?: string;
}

const applyProgressEvent = (event: ProgressEvent): void => {
  const { slug, progress, message, status } = event;
  useQueueStore.updateJobProgress(slug, progress, message);
  if (status !== undefined && isDownloadStatus(status)) {
    useQueueStore.updateJobStatus(slug, status);
  } else {
    useQueueStore.updateJobStatus(slug, progress >= 100 ? "completed" : "downloading");
  }
};

export const useQueueStore = {
  get state() {
    return queueState;
  },
  setQueue: (jobs: DownloadJob[]): void => setQueueState("queue", jobs),
  addJob: (job: DownloadJob): void => {
    setQueueState("queue", (current) => [
      job,
      ...current.filter((existing) => existing.slug !== job.slug),
    ]);
  },
  updateJobStatus: (slug: string, status: DownloadStatus): void => {
    setQueueState("queue", (job) => job.slug === slug, "status", status);
  },
  updateJobProgress: (slug: string, progress: number, message?: string): void => {
    setQueueState("queue", (job) => job.slug === slug, "progress", progress);
    if (message !== undefined) {
      setQueueState("queue", (job) => job.slug === slug, "message", message);
    }
    if (progress >= 100) {
      setQueueState("queue", (job) => job.slug === slug, "status", "completed");
    }
  },
  removeJob: (slug: string): void => {
    setQueueState("queue", (current) => current.filter((job) => job.slug !== slug));
  },
  setProgress: (id: string, progress: number): void =>
    setQueueState("progressUpdates", id, progress),
  clearProgress: (id: string): void => {
    setQueueState("progressUpdates", (current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  },
  clearQueue: (): void => {
    setQueueState("queue", (current) =>
      current.filter((job) => job.status !== "completed" && job.status !== "error"),
    );
  },
  hydrate: async (): Promise<void> => {
    try {
      const result = await ipc.getAllJobs();
      const jobs = Array.isArray(result) ? result : (result?.payload ?? []);
      if (jobs && jobs.length >= 0) {
        useQueueStore.setQueue(jobs);
      }
    } catch (err) {
      console.error("Failed to hydrate download queue:", err);
    }
  },
};

// Initialize the live progress listener exactly once.
let listenerInstalled = false;
const installProgressListener = (): void => {
  if (listenerInstalled || !isTauri()) return;
  listenerInstalled = true;
  safeListen<ProgressEvent>("download-progress-token", applyProgressEvent).catch((err) => {
    console.error("Failed to install queue progress listener", err);
  });
};

if (typeof window !== "undefined") {
  if (document.readyState === "complete") {
    installProgressListener();
  } else {
    window.addEventListener("load", installProgressListener, { once: true });
  }
}
