/**
 * Parse-result cache singleton. Every `yt-dlp --dump-single-json` call lands
 * here so the user can revisit past analyses even after a relaunch.
 */
import { createStore } from "solid-js/store";
import { createEffect, on, createRoot } from "solid-js";
import { nativeStorageAdapter } from "./storageAdapter";
import type { DiscoveryPayload, ParsedFile } from "@/core/types/ytdlp.types";

export type { ParsedFile };

interface ParseState {
  parsedFiles: ParsedFile[];
  isParsing: boolean;
}

const [parseState, setParseState] = createStore<ParseState>({
  parsedFiles: [],
  isParsing: false,
});

const STORAGE_KEY = "synclime-parse-storage";
let hasHydrated = false;

const isDiscoveryPayload = (value: unknown): value is DiscoveryPayload =>
  typeof value === "object" && value !== null && "id" in value && "title" in value;

const sanitizeParsedFiles = (raw: unknown): ParsedFile[] => {
  if (!Array.isArray(raw)) return [];
  return raw.filter((entry): entry is ParsedFile => {
    if (typeof entry !== "object" || entry === null) return false;
    const candidate = entry as Record<string, unknown>;
    return (
      typeof candidate.slug === "string" &&
      typeof candidate.url === "string" &&
      typeof candidate.title === "string" &&
      typeof candidate.sanitizedTitle === "string" &&
      typeof candidate.isPlaylist === "boolean" &&
      typeof candidate.thumbnail === "string" &&
      typeof candidate.duration === "number" &&
      typeof candidate.author === "string" &&
      typeof candidate.views === "number" &&
      isDiscoveryPayload(candidate.payload) &&
      typeof candidate.parsedAt === "string"
    );
  });
};

export const useParseStore = {
  get state() {
    return parseState;
  },
  addParsedFile: (file: ParsedFile): void => {
    setParseState("parsedFiles", (existing) => [
      file,
      ...existing.filter((current) => current.slug !== file.slug),
    ]);
  },
  removeParsedFile: (slug: string): void => {
    setParseState("parsedFiles", (existing) => existing.filter((file) => file.slug !== slug));
  },
  clearParsedFiles: (): void => setParseState("parsedFiles", []),
  setParsing: (parsing: boolean): void => setParseState("isParsing", parsing),
};

// ── Hydration ────────────────────────────────────────────────────────────────
nativeStorageAdapter
  .getItem(STORAGE_KEY)
  .then((raw) => {
    if (raw === null) {
      hasHydrated = true;
      return;
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        "state" in parsed &&
        typeof (parsed as { state: unknown }).state === "object"
      ) {
        const state = (parsed as { state: { parsedFiles?: unknown } }).state;
        const sanitized = sanitizeParsedFiles(state.parsedFiles);
        setParseState("parsedFiles", sanitized);
      }
    } catch (err) {
      console.warn("Failed to parse hydrated parse state", err);
    } finally {
      hasHydrated = true;
    }
  })
  .catch((err) => {
    console.warn("Failed to load parse storage", err);
    hasHydrated = true;
  });

createRoot(() => {
  createEffect(
    on(
      () => parseState.parsedFiles,
      (files) => {
        if (!hasHydrated) return;
        const payload = JSON.stringify({ state: { parsedFiles: files } });
        nativeStorageAdapter.setItem(STORAGE_KEY, payload);
      },
      { defer: true },
    ),
  );
});
