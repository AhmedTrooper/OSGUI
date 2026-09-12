import { onMount, type JSX } from "solid-js";
import { useUIStore } from "@/store/useUIStore";
import { ExtensionsSection } from "@/features/settings/sections/ExtensionsSection";

export default function Extensions(): JSX.Element {
  onMount(() => {
    useUIStore.setActivePath("/extensions");
  });
  return <ExtensionsSection />;
}
