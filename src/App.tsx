import { createSignal, createEffect, onCleanup, onMount, Show, type JSX } from "solid-js";
import { useUIStore } from "./store/useUIStore";
import { safeInvoke } from "./utils/tauri";
import SplashScreen from "./components/SplashScreen";

const SPLASH_DURATION_MS = 2000;
const FALLBACK_DOWNLOADS_PATH = "/home/user/Downloads";

const isReloadCombo = (event: KeyboardEvent): boolean => {
  if (event.key === "F5") return true;
  if (!(event.metaKey || event.ctrlKey)) return false;
  if (event.key === "r") return true;
  if (event.shiftKey && ["I", "i", "C", "c", "J", "j"].includes(event.key)) return true;
  return false;
};

const resolveDownloadPath = async (): Promise<string> => {
  const existing = await safeInvoke<string>("get_download_path");
  if (existing !== null && existing.trim().length > 0) {
    return existing;
  }
  const { downloadDir } = await import("@tauri-apps/api/path");
  const dir = await downloadDir();
  await safeInvoke("update_download_path", { path: dir });
  return dir;
};

export default function App(props: { children?: JSX.Element }) {
  const [isLoaded, setIsLoaded] = createSignal(false);
  const ui = useUIStore.state;

  onMount(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (isReloadCombo(event)) {
        event.preventDefault();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    onCleanup(() => document.removeEventListener("keydown", handleKeyDown));
  });

  createEffect(() => {
    if (!ui._hasHydrated) return;

    const initialize = async (): Promise<void> => {
      try {
        const resolved = await resolveDownloadPath();
        useUIStore.setDownloadPath(resolved);
      } catch (err) {
        console.error("Failed to resolve downloads path:", err);
        if (!ui.downloadPath) {
          useUIStore.setDownloadPath(FALLBACK_DOWNLOADS_PATH);
        }
      }
    };

    initialize();

    const timer = setTimeout(() => setIsLoaded(true), SPLASH_DURATION_MS);
    onCleanup(() => clearTimeout(timer));
  });

  return (
    <>
      <Show when={!isLoaded()}>
        <SplashScreen />
      </Show>
      {props.children}
    </>
  );
}
