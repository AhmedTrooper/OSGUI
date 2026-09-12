import { A } from "@solidjs/router";
import { For, Show, onMount, onCleanup } from "solid-js";
import {
  Home,
  Download,
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
  GlobeLock,
  Inbox,
  Settings as SettingsIcon,
} from "lucide-solid";
import { useUIStore, type BadgeTab } from "@/store/useUIStore";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ipc } from "@/utils/ipc";
import { safeListen } from "@/utils/tauri";
import type { InboxItem } from "@/core/types/database.types";

interface NavItem {
  path: string;
  label: string;
  icon: typeof Home;
  badgeKey: BadgeTab;
}

const PRIMARY_NAV: NavItem[] = [
  { path: "/", label: "New Task", icon: Home, badgeKey: "home" },
  { path: "/inbox", label: "Inbox", icon: Inbox, badgeKey: "inbox" },
  { path: "/downloads", label: "Queue", icon: Download, badgeKey: "downloads" },
  { path: "/parsed_files", label: "Library", icon: FileText, badgeKey: "parsedFiles" },
  { path: "/sites_config", label: "Network Preferences", icon: GlobeLock, badgeKey: "sites" },
  { path: "/settings", label: "Settings", icon: SettingsIcon, badgeKey: "settings" },
];

export default function Sidebar() {
  const ui = useUIStore.state;
  let unlistenInbox: (() => void) | null = null;

  const refreshInboxBadge = async (): Promise<void> => {
    const result = await ipc.getInboxUrls();
    if (!result.success) return;
    const pending = (result.payload as InboxItem[]).filter(
      (item) => item.status === "pending",
    ).length;
    useUIStore.setBadge("inbox", pending);
  };

  onMount(() => {
    refreshInboxBadge().catch((err) => {
      console.error("Failed to query inbox count for badge:", err);
    });
    safeListen("inbox-updated", () => {
      refreshInboxBadge().catch((err) => {
        console.error("Failed to refresh inbox badge:", err);
      });
    })
      .then((unlisten) => {
        unlistenInbox = unlisten;
      })
      .catch((err) => {
        console.error("Failed to setup sidebar inbox badge listener:", err);
      });
  });

  onCleanup(() => {
    if (unlistenInbox !== null) {
      unlistenInbox();
      unlistenInbox = null;
    }
  });

  return (
    <div
      class={`w-full ${
        ui.isSidebarExpanded ? "sm:w-56" : "sm:w-16"
      } transition-all duration-300 ease-in-out h-auto sm:h-full border-t sm:border-t-0 sm:border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex flex-row sm:flex-col flex-shrink-0 sm:pt-4 sm:pb-4 select-none z-20 shadow-[0_-1px_10px_rgba(0,0,0,0.02)] sm:shadow-[1px_0_10px_rgba(0,0,0,0.02)] relative`}
    >
      <div
        class={`flex-1 overflow-x-auto sm:overflow-y-auto px-1 ${
          ui.isSidebarExpanded ? "sm:px-3" : "sm:px-2"
        } py-1 sm:py-0 flex items-center sm:items-stretch scrollbar-hide`}
      >
        <nav class="flex flex-row sm:flex-col gap-1 sm:gap-1 w-full justify-around sm:justify-start">
          <For each={PRIMARY_NAV}>
            {(item) => {
              const isActive = (): boolean =>
                item.path === "/" ? ui.activePath === "/" : ui.activePath.startsWith(item.path);
              const badgeCount = (): number => ui.badges[item.badgeKey];
              const Icon = item.icon;

              return (
                <A
                  href={item.path}
                  class={`flex-1 sm:flex-initial flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-3 px-1 sm:px-3 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl transition-all duration-300 relative group overflow-hidden ${
                    isActive()
                      ? "bg-white dark:bg-white/10 text-blue-600 dark:text-white font-bold shadow-sm"
                      : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white font-medium"
                  }`}
                >
                  <div class="relative flex items-center justify-center">
                    <Icon
                      class={`w-5 h-5 sm:w-4 sm:h-4 ${
                        isActive()
                          ? "text-blue-600 dark:text-white"
                          : "text-zinc-400 dark:text-zinc-500"
                      }`}
                    />
                    <Show when={badgeCount() > 0}>
                      <span
                        class={`absolute -top-1.5 -right-2.5 flex h-3.5 min-w-3.5 px-1 items-center justify-center rounded-full text-[8px] sm:text-[10px] font-bold sm:h-4 sm:min-w-4 ${
                          ui.isSidebarExpanded
                            ? "sm:static sm:top-0 sm:right-0 sm:ml-auto"
                            : "sm:absolute sm:-top-1.5 sm:-right-2"
                        } ${
                          isActive()
                            ? "bg-blue-600 text-white sm:bg-white sm:text-blue-600"
                            : "bg-blue-500 text-white"
                        }`}
                      >
                        {badgeCount()}
                      </span>
                    </Show>
                  </div>
                  <span
                    class={`block sm:inline tracking-tight text-[9px] sm:text-xs font-semibold text-center sm:text-left truncate w-full sm:w-auto ${
                      ui.isSidebarExpanded ? "" : "sm:hidden"
                    }`}
                  >
                    {item.label}
                  </span>
                </A>
              );
            }}
          </For>
        </nav>
      </div>

      <div class="hidden sm:flex flex-col gap-2 px-3 mt-auto pt-4">
        <ThemeToggle />
        <button
          onClick={useUIStore.toggleSidebar}
          class="flex items-center justify-center p-2 rounded-lg text-zinc-500 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          title={ui.isSidebarExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
          type="button"
        >
          <Show when={ui.isSidebarExpanded} fallback={<PanelLeftOpen class="w-4 h-4" />}>
            <PanelLeftClose class="w-4 h-4" />
          </Show>
        </button>
      </div>
    </div>
  );
}
