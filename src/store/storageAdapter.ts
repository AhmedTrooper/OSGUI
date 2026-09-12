/**
 * Persistence adapter that bridges `@tauri-apps/plugin-store` (when running
 * inside the desktop shell) and `localStorage` (in the browser preview).
 *
 * The Tauri store path uses a single 1-second debounce so rapid preference
 * changes batch into a single disk flush.
 */

import { load, type Store } from "@tauri-apps/plugin-store";
import { isTauri } from "@/utils/tauri";

let storePromise: Promise<Store> | null = null;
if (isTauri()) {
  storePromise = load("synclime_state.bin", { autoSave: false, defaults: {} });
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

const debounceSave = (tauriStore: Store): void => {
  if (saveTimeout !== null) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveTimeout = null;
    tauriStore.save().catch((err) => {
      console.warn("[Tauri Store] Failed to save store to disk:", err);
    });
  }, 1000);
};

export const nativeStorageAdapter = {
  getItem: async (name: string): Promise<string | null> => {
    if (isTauri() && storePromise !== null) {
      try {
        const tauriStore = await storePromise;
        const value = await tauriStore.get<string>(name);
        return value ?? null;
      } catch (err) {
        console.warn(`[Tauri Store] Failed to read ${name}:`, err);
        return null;
      }
    }
    return localStorage.getItem(name);
  },

  setItem: async (name: string, value: string): Promise<void> => {
    if (isTauri() && storePromise !== null) {
      try {
        const tauriStore = await storePromise;
        await tauriStore.set(name, value);
        debounceSave(tauriStore);
      } catch (err) {
        console.warn(`[Tauri Store] Failed to write ${name}:`, err);
      }
      return;
    }
    localStorage.setItem(name, value);
  },

  removeItem: async (name: string): Promise<void> => {
    if (isTauri() && storePromise !== null) {
      try {
        const tauriStore = await storePromise;
        await tauriStore.delete(name);
        debounceSave(tauriStore);
      } catch (err) {
        console.warn(`[Tauri Store] Failed to remove ${name}:`, err);
      }
      return;
    }
    localStorage.removeItem(name);
  },
} as const;
