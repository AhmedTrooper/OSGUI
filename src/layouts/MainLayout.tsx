import { createEffect, onCleanup, type JSX } from "solid-js";
import { useLocation } from "@solidjs/router";
import Sidebar from "./Sidebar";
import TitleBar from "./TitleBar";
import { useUIStore } from "@/store/useUIStore";

const isInPlaylist = (path: string): boolean => path.startsWith("/parsed_file/");
const isInDownloads = (path: string): boolean => path.startsWith("/downloads/");

const resolveActivePath = (pathname: string): string => {
  if (isInPlaylist(pathname)) return "/parsed_files";
  if (isInDownloads(pathname)) return "/downloads";
  return pathname;
};

export default function MainLayout(props: { children?: JSX.Element }) {
  const ui = useUIStore.state;
  const location = useLocation();

  createEffect(() => {
    const theme = ui.theme;
    const apply = (isDark: boolean): void => {
      document.documentElement.classList.toggle("dark", isDark);
    };

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      apply(mediaQuery.matches);
      const listener = (event: MediaQueryListEvent): void => apply(event.matches);
      mediaQuery.addEventListener("change", listener);
      onCleanup(() => mediaQuery.removeEventListener("change", listener));
    } else {
      apply(theme === "dark");
    }
  });

  createEffect(() => {
    useUIStore.setActivePath(resolveActivePath(location.pathname));
  });

  return (
    <div class="relative h-screen w-screen bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 transition-colors duration-300 overflow-hidden flex flex-col font-sans select-none">
      <TitleBar />

      <div class="flex flex-col-reverse sm:flex-row flex-1 overflow-hidden relative z-10 w-full">
        <Sidebar />

        <main class="flex-1 overflow-y-auto custom-scrollbar px-2 py-2 sm:px-6 sm:py-6 w-full relative bg-white dark:bg-zinc-800/20 shadow-inner">
          {props.children}
        </main>
      </div>
    </div>
  );
}
