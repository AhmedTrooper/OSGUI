import { onMount, type JSX } from "solid-js";
import { Tooltip } from "@kobalte/core/tooltip";
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
    <div class="flex flex-col gap-4 w-full px-2 sm:px-6">
      <div class="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-white/10">
        <Tooltip openDelay={200} placement="right">
          <Tooltip.Trigger
            as="div"
            class="p-1.5 bg-zinc-500 rounded-md text-white shadow-sm cursor-default"
          >
            <SettingsIcon class="w-4 h-4" />
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
              <Tooltip.Arrow />
              Settings
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip>
      </div>

      <div class="flex flex-col gap-3 pb-4">
        <SettingsAccordion icon={SettingsIcon} defaultOpen>
          <PreferencesSection />
        </SettingsAccordion>

        <SettingsAccordion icon={Cpu} defaultOpen>
          <LogsSection />
        </SettingsAccordion>

        <SettingsAccordion icon={Layers} defaultOpen={false}>
          <ExtensionsSection />
        </SettingsAccordion>

        <SettingsAccordion icon={Info} defaultOpen={false}>
          <AboutSection />
        </SettingsAccordion>
      </div>
    </div>
  );
}
