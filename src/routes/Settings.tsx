import { onMount, type JSX } from "solid-js";
import { Settings as SettingsIcon, Cpu, Layers, Info } from "lucide-solid";
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
    <div class="flex flex-col gap-4 w-full max-w-3xl h-full min-h-full py-2 pb-24 sm:pb-32">
      <div class="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-white/10">
        <div class="flex items-center gap-2.5">
          <div class="p-1.5 bg-zinc-500 rounded-md text-white shadow-sm">
            <SettingsIcon class="w-4 h-4" />
          </div>
          <h1 class="text-base font-bold text-zinc-900 dark:text-white tracking-tight">Settings</h1>
        </div>
      </div>

      <div class="flex flex-col gap-3">
        <SettingsAccordion title="Preferences" icon={SettingsIcon} defaultOpen>
          <PreferencesSection />
        </SettingsAccordion>

        <SettingsAccordion title="Logs" icon={Cpu} defaultOpen>
          <LogsSection />
        </SettingsAccordion>

        <SettingsAccordion title="Extensions" icon={Layers} defaultOpen={false}>
          <ExtensionsSection />
        </SettingsAccordion>

        <SettingsAccordion title="About" icon={Info} defaultOpen={false}>
          <AboutSection />
        </SettingsAccordion>
      </div>

      <div class="flex-1 min-h-[40vh]" />
    </div>
  );
}
