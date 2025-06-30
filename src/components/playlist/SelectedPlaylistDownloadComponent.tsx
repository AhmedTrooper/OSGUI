import { Button } from "@heroui/react";
import { Download } from "lucide-react";

export default function SelectedPlaylistDownloadComponent(){
    return( <div className="w-full  h-fit p-2 grid grid-cols-2 gap-2 shadow-md shadow-black rounded-md">
      <Button
        color="success"
        className="flex"
      >
        <Download />
        Selected Playlist (Best Q.)
      </Button>
      <Button
        color="success"
        className="flex"
      >
        <Download />
        Selected Playlist (Max-720p)
      </Button>
      <Button
        color="success"
        className="flex"
      >
        <Download />
        Selected Playlist (Max-1080p)
      </Button>
      <Button
        color="success"
        className="flex"
      >
        <Download />
        Selected Playlist (Max-2K)
      </Button>
      <Button
        color="success"
        className="flex"
      >
        <Download />
        Selected Playlist (Max-4K)
      </Button>
      <Button
        color="danger"
        className="flex"
      >
        <Download />
        Audio (Selected Playlist)
      </Button>
    </div>);
}