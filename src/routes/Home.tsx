import VideoContainer from "@/components/video/VideoContainer";
import { Button } from "@heroui/react";
import { Command } from "@tauri-apps/plugin-shell";
export default function Home() {
  return (
    <div className="p-8">
      <VideoContainer />
    </div>
  );
}
