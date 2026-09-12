/**
 * Three-state theme toggle (dark → light → system). Renders the matching
 * lucide icon and persists the choice through `useUIStore`.
 */
import { Show } from "solid-js";
import { Moon, Sun, Monitor } from "lucide-solid";
import { useUIStore, type ThemePreference } from "@/store/useUIStore";

const CYCLE: ThemePreference[] = ["dark", "light", "system"];

const nextTheme = (current: ThemePreference): ThemePreference => {
  const idx = CYCLE.indexOf(current);
  return CYCLE[(idx + 1) % CYCLE.length] ?? CYCLE[0]!;
};

const titleFor = (theme: ThemePreference): string =>
  `Theme: ${theme.charAt(0).toUpperCase()}${theme.slice(1)}`;

export function ThemeToggle() {
  return (
    <button
      onClick={() => useUIStore.setTheme(nextTheme(useUIStore.state.theme))}
      class="flex items-center justify-center p-2 rounded-lg text-zinc-500 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
      title={titleFor(useUIStore.state.theme)}
      type="button"
    >
      <Show when={useUIStore.state.theme === "dark"}>
        <Moon class="w-4 h-4" />
      </Show>
      <Show when={useUIStore.state.theme === "light"}>
        <Sun class="w-4 h-4" />
      </Show>
      <Show when={useUIStore.state.theme === "system"}>
        <Monitor class="w-4 h-4" />
      </Show>
    </button>
  );
}
