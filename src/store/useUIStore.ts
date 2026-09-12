/**
 * UI state singleton: persistent theme + sidebar + download path +
 * per-route badge counters. The store hydrates from the Tauri plugin-store
 * on startup and writes back on changes inside a reactive root.
 */
import { createStore } from "solid-js/store";
import { createEffect, on, createRoot } from "solid-js";
import { nativeStorageAdapter } from "./storageAdapter";

export type ThemePreference = "dark" | "light" | "system";

export type BadgeTab =
  | "home"
  | "about"
  | "downloads"
  | "parsedFiles"
  | "settings"
  | "sites"
  | "logs"
  | "inbox"
  | "extensions";

interface UIState {
  activePath: string;
  badges: Record<BadgeTab, number>;
  theme: ThemePreference;
  downloadPath: string;
  isSidebarExpanded: boolean;
  _hasHydrated: boolean;
}

const [uiState, setUIState] = createStore<UIState>({
  activePath: "/",
  badges: {
    home: 0,
    about: 0,
    downloads: 0,
    parsedFiles: 0,
    settings: 0,
    sites: 0,
    logs: 0,
    inbox: 0,
    extensions: 0,
  },
  theme: "system",
  downloadPath: "",
  isSidebarExpanded: true,
  _hasHydrated: false,
});

interface PersistedUIState {
  theme: ThemePreference;
  downloadPath: string;
  isSidebarExpanded: boolean;
}

const STORAGE_KEY = "synclime-ui-storage";

const isPersistedUIState = (value: unknown): value is PersistedUIState => {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    (candidate.theme === undefined || typeof candidate.theme === "string") &&
    (candidate.downloadPath === undefined || typeof candidate.downloadPath === "string") &&
    (candidate.isSidebarExpanded === undefined || typeof candidate.isSidebarExpanded === "boolean")
  );
};

const clampBadge = (value: number): number => Math.max(0, value);

export const useUIStore = {
  get state() {
    return uiState;
  },
  setActivePath: (path: string): void => setUIState("activePath", path),
  incrementBadge: (tab: BadgeTab): void => setUIState("badges", tab, (current) => current + 1),
  decrementBadge: (tab: BadgeTab): void =>
    setUIState("badges", tab, (current) => clampBadge(current - 1)),
  clearBadge: (tab: BadgeTab): void => setUIState("badges", tab, 0),
  setBadge: (tab: BadgeTab, count: number): void => setUIState("badges", tab, clampBadge(count)),
  setTheme: (theme: ThemePreference): void => setUIState("theme", theme),
  toggleSidebar: (): void => setUIState("isSidebarExpanded", (expanded) => !expanded),
  setDownloadPath: (path: string): void => setUIState("downloadPath", path),
  setHasHydrated: (hydrated: boolean): void => setUIState("_hasHydrated", hydrated),
};

// ── Hydration ────────────────────────────────────────────────────────────────
nativeStorageAdapter
  .getItem(STORAGE_KEY)
  .then((raw) => {
    if (raw === null) {
      useUIStore.setHasHydrated(true);
      return;
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        "state" in parsed &&
        isPersistedUIState((parsed as { state: unknown }).state)
      ) {
        const persisted = (parsed as { state: PersistedUIState }).state;
        if (persisted.theme !== undefined) setUIState("theme", persisted.theme);
        if (persisted.downloadPath !== undefined)
          setUIState("downloadPath", persisted.downloadPath);
        if (persisted.isSidebarExpanded !== undefined)
          setUIState("isSidebarExpanded", persisted.isSidebarExpanded);
      }
    } catch (err) {
      console.warn("Failed to parse hydrated UI state", err);
    } finally {
      useUIStore.setHasHydrated(true);
    }
  })
  .catch((err) => {
    console.warn("Failed to load UI storage", err);
    useUIStore.setHasHydrated(true);
  });

// ── Persistence ──────────────────────────────────────────────────────────────
createRoot(() => {
  createEffect(
    on(
      () => [uiState.theme, uiState.downloadPath, uiState.isSidebarExpanded] as const,
      ([theme, downloadPath, isSidebarExpanded]) => {
        if (!uiState._hasHydrated) return;
        const persisted: { state: PersistedUIState } = {
          state: { theme, downloadPath, isSidebarExpanded },
        };
        nativeStorageAdapter.setItem(STORAGE_KEY, JSON.stringify(persisted));
      },
      { defer: true },
    ),
  );
});
