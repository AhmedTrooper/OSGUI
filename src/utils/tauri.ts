/**
 * Tauri runtime detection + safe IPC wrappers.
 *
 * Replaces the previous `(window as any).__TAURI_INTERNALS__` checks that
 * were duplicated across every route, store, and helper. All checks are
 * fully type-safe — no `any` escapes the surface.
 */

interface TauriInternalsShape {
  metadata?: { currentWindow?: { label?: string }; currentWebview?: { label?: string } };
  invoke?: (...args: unknown[]) => Promise<unknown>;
  ipc?: unknown;
}

const TAURI_INTERNALS_KEY = "__TAURI_INTERNALS__";

const getTauriInternals = (): TauriInternalsShape | null => {
  if (typeof window === "undefined") return null;
  const value = (window as unknown as Record<string, unknown>)[TAURI_INTERNALS_KEY];
  if (value === undefined || value === null) return null;
  if (typeof value !== "object") return null;
  return value as TauriInternalsShape;
};

/** True when the host process exposes Tauri v2 internals on `window`. */
export const isTauri = (): boolean => getTauriInternals() !== null;

/**
 * Invoke a Tauri command, but only when running inside the Tauri shell.
 *
 * In a plain browser the promise resolves to `null` immediately so that
 * preview builds (Storybook, Vite preview, etc.) never crash.
 */
export const safeInvoke = async <T>(
  cmd: string,
  args?: Record<string, unknown>,
): Promise<T | null> => {
  if (!isTauri()) return null;
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(cmd, args);
};

/**
 * Listen for a Tauri event from a typed callback. Returns an unsubscribe
 * function that is a no-op when not running inside Tauri.
 */
export const safeListen = async <T>(
  event: string,
  handler: (payload: T) => void,
): Promise<() => void> => {
  if (!isTauri()) return () => {};
  const { listen } = await import("@tauri-apps/api/event");
  const unlisten = await listen<T>(event, (e) => handler(e.payload));
  return unlisten;
};
