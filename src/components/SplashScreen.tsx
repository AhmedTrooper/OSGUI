import { createSignal, createEffect, onCleanup, type JSX } from "solid-js";
import { useUIStore } from "@/store/useUIStore";
import { isTauri } from "@/utils/tauri";

const PROGRESS_INTERVAL_MS = 16;
const PROGRESS_DURATION_MS = 1800;

const systemPrefersDark = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
};

export default function SplashScreen(): JSX.Element {
  const theme = useUIStore.state.theme;
  const [progress, setProgress] = createSignal(0);
  const [appVersion, setAppVersion] = createSignal("0.1.1");
  const [tauriVersion, setTauriVersion] = createSignal("2.x");

  createEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setProgress(Math.min((elapsed / PROGRESS_DURATION_MS) * 100, 100));
      if (elapsed >= PROGRESS_DURATION_MS) clearInterval(interval);
    }, PROGRESS_INTERVAL_MS);
    onCleanup(() => clearInterval(interval));
  });

  createEffect(() => {
    if (!isTauri()) return;
    void (async () => {
      try {
        const { getVersion, getTauriVersion } = await import("@tauri-apps/api/app");
        setAppVersion(await getVersion());
        setTauriVersion(await getTauriVersion());
      } catch {
        // Browser preview — keep default fallback values.
      }
    })();
  });

  const isDark = (): boolean => theme === "dark" || (theme === "system" && systemPrefersDark());

  return (
    <div
      class={`fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none overflow-hidden transition-colors duration-500 ${
        isDark() ? "bg-[#09090b] text-white" : "bg-zinc-50 text-zinc-900"
      }`}
    >
      <div class="flex flex-col items-center gap-6">
        <div
          class={`p-4.5 rounded-2xl border transition-all duration-500 ${
            isDark()
              ? "bg-white/[0.02] border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.3)]"
              : "bg-black/[0.01] border-zinc-200/50 shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
          }`}
        >
          <svg class="w-12 h-12" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M38 24C38 31.732 31.732 38 24 38C19.5 38 15.5 35.8 13 32.5"
              stroke={isDark() ? "#3b82f6" : "#2563eb"}
              stroke-width="3"
              stroke-linecap="round"
            />
            <path
              d="M10 24C10 16.268 16.268 10 24 10C28.5 10 32.5 12.2 35 15.5"
              stroke={isDark() ? "#3b82f6" : "#2563eb"}
              stroke-width="3"
              stroke-linecap="round"
            />
            <path
              d="M24 16V30M18 24L24 30L30 24"
              stroke={isDark() ? "#ffffff" : "#09090b"}
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>

        <div class="text-center flex flex-col gap-1.5 mt-1">
          <h1 class="text-3xl font-bold tracking-[0.2em] uppercase pl-[0.2em] font-sans">
            Synclime
          </h1>
          <span
            class={`text-[10px] font-semibold tracking-[0.25em] uppercase pl-[0.25em] ${
              isDark() ? "text-zinc-500" : "text-zinc-400"
            }`}
          >
            Media Downloader
          </span>
        </div>

        <div
          class={`relative w-48 h-[2px] rounded-full overflow-hidden mt-3 transition-colors duration-500 ${
            isDark() ? "bg-zinc-800/60" : "bg-zinc-200"
          }`}
        >
          <div
            class={`absolute top-0 bottom-0 left-0 rounded-full transition-all duration-100 ${
              isDark() ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" : "bg-blue-600"
            }`}
            style={{ width: `${progress()}%` }}
          />
        </div>
      </div>

      <div
        class={`absolute bottom-6 left-8 right-8 flex justify-between text-[8px] font-mono tracking-widest ${
          isDark() ? "text-zinc-600" : "text-zinc-400"
        }`}
      >
        <span>TAURI V{tauriVersion()}</span>
        <span>SYNCLIME V{appVersion()}</span>
      </div>
    </div>
  );
}
