import { onMount, type JSX } from "solid-js";
import { useUIStore } from "@/store/useUIStore";
import { LogsSection } from "@/features/settings/sections/LogsSection";

export default function Logs(): JSX.Element {
  onMount(() => {
    useUIStore.setActivePath("/logs");
  });
  return <LogsSection />;
}
