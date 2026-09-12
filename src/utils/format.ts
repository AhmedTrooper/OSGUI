/**
 * Pure formatting helpers for byte sizes, durations, dates, and times.
 * Shared between routes, components, and stores.
 */

const SIZE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

/** Format an optional byte count as a human-readable size. */
export const formatSize = (bytes: number | null | undefined): string => {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) {
    return "Unknown Size";
  }
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < SIZE_UNITS.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${SIZE_UNITS[unitIndex]}`;
};

/** Format a duration in seconds as `H:MM:SS` (or `M:SS` when under an hour). */
export const formatDuration = (secs: number | null | undefined): string => {
  if (secs === null || secs === undefined || !Number.isFinite(secs) || secs <= 0) {
    return "0:00";
  }
  const total = Math.floor(secs);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const mm = minutes.toString().padStart(2, "0");
  const ss = seconds.toString().padStart(2, "0");
  if (hours > 0) return `${hours}:${mm}:${ss}`;
  return `${minutes}:${ss}`;
};

const safeDate = (iso: string): Date | null => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Format an ISO string as `Mon DD, YYYY`. */
export const formatDate = (iso: string): string => {
  const d = safeDate(iso);
  if (!d) return "n/a";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

/** Format an ISO string as `HH:MM`. */
export const formatTime = (iso: string): string => {
  const d = safeDate(iso);
  if (!d) return "n/a";
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
};

/** Format an ISO string as `toLocaleString()`. */
export const formatTimestamp = (iso: string): string => {
  const d = safeDate(iso);
  return d ? d.toLocaleString() : iso;
};
