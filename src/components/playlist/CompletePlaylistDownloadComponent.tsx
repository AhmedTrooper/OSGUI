import { Button } from "@heroui/react";
import { Download } from "lucide-react";

export default function CompletePlaylistDownloadComponent() {
  return (
    <div className="w-full h-fit p-2 grid grid-cols-2 gap-2 shadow-md shadow-black rounded-md">
        <Button
          color="primary"
          className="flex"
        >
          <Download />
          Complete Playlist (Best Q.)
        </Button>
        <Button
          color="primary"
          className="flex"
        >
          <Download />
          Complete Playlist (Max-720p)
        </Button>
        <Button
          color="primary"
          className="flex"
        >
          <Download />
          Complete Playlist (Max-1080p)
        </Button>
        <Button
          color="primary"
          className="flex"
        >
          <Download />
          Complete Playlist (Max-2K)
        </Button>
        <Button
          color="primary"
          className="flex"
        >
          <Download />
          Complete Playlist (Max-4K)
        </Button>
        <Button
          color="danger"
          className="flex"
        >
          <Download />
          Audio (Complete Playlist)
        </Button>
      </div>
  );
}
