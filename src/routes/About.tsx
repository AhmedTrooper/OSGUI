import { onMount, type JSX } from "solid-js";
import { useUIStore } from "@/store/useUIStore";
import { AboutSection } from "@/features/settings/sections/AboutSection";

export default function About(): JSX.Element {
  onMount(() => {
    useUIStore.setActivePath("/about");
  });
  return <AboutSection />;
}
