import { onMount, type JSX } from "solid-js";
import { SlidersHorizontal, Cpu, Layers, Info, Settings as SettingsIcon } from "lucide-solid";
import { useUIStore } from "@/store/useUIStore";
import { SettingsAccordion } from "@/features/settings/components/SettingsAccordion";
import { PreferencesSection } from "@/features/settings/sections/PreferencesSection";
import { LogsSection } from "@/features/settings/sections/LogsSection";
import { ExtensionsSection } from "@/features/settings/sections/ExtensionsSection";
import { AboutSection } from "@/features/settings/sections/AboutSection";

export default function Settings(): JSX.Element {
  onMount(() => {
    useUIStore.setActivePath("/settings");
  });

  return (
    <div class="space-y-4 max-w-4xl mx-auto py-2 select-none animate-fade-in text-xs sm:text-sm font-sans text-left">
      {/* Header */}
      <div class="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 flex items-center justify-center bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-xl">
            <SettingsIcon class="w-5 h-5" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-base font-bold text-zinc-900 dark:text-white">
                Settings & Preferences
              </h1>
              <span class="px-2 py-0.5 text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-full font-mono">
                Config
              </span>
            </div>
            <p class="text-[11px] text-zinc-500 dark:text-zinc-400">
              Download paths, concurrency limits, SQLite diagnostics, browser integration & runtime
              specs
            </p>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-3.5 pb-6">
        <SettingsAccordion
          title="General Preferences"
          description="Download destination directory, simultaneous jobs, and parallel connection chunks"
          badge="Core"
          icon={SlidersHorizontal}
          defaultOpen
        >
          <PreferencesSection />
        </SettingsAccordion>

        <SettingsAccordion
          title="Engine Logs & Traces"
          description="SQLite exception ledger, execution commands, yt-dlp probe traces and exit codes"
          badge="SQLite"
          icon={Cpu}
          defaultOpen
        >
          <LogsSection />
        </SettingsAccordion>

        <SettingsAccordion
          title="Browser Companion & Updates"
          description="Chrome, Firefox and Edge integration hub, local API sync bridge, and release changelogs"
          badge="Sync"
          icon={Layers}
          defaultOpen={false}
        >
          <ExtensionsSection />
        </SettingsAccordion>

        <SettingsAccordion
          title="System Architecture & Environment"
          description="Operating system specs, native runtime info, database health metrics, and framework stack"
          badge="Platform"
          icon={Info}
          defaultOpen={false}
        >
          <AboutSection />
        </SettingsAccordion>
      </div>
    </div>
  );
}
