import { useDownloadStore } from "@/store/downloadStore";
import { useHeavyPlaylistStore } from "@/store/HeavyPlaylistStore";
import { Button, Checkbox } from "@heroui/react";
import { Copy, Download, ExternalLink } from "lucide-react";
import OpenHeavyDialogSection from "../video/OpenHeavyDialogSection";
import { useUserInputVideoStore } from "@/store/UserInputVideoStore";
import CompletePlaylistDownloadComponent from "./CompletePlaylistDownloadComponent";
import SelectedPlaylistDownloadComponent from "./SelectedPlaylistDownloadComponent";

export default function HeavyPlaylistFormatSection() {
  const heavyPlaylistInformation = useHeavyPlaylistStore(
    (state) => state.heavyPlaylistInformation
  );
  const clipboardWritingHandle = useUserInputVideoStore(
    (state) => state.clipboardWritingHandle
  );

  const downloadHandler = useDownloadStore((state) => state.downloadHandler);

  if (!heavyPlaylistInformation) return;
  return (
    <div className="rounded-lg shadow-md shadow-black m-2 p-4 overflow-auto custom-scrollbar max-h-[80vh] grid gap-4">
      <header className="flex gap-4">
        <a
          target="_blank"
          href={heavyPlaylistInformation.webpage_url}
        >
          <ExternalLink />
        </a>
        <span>
          <Copy
            onClick={() =>
              clipboardWritingHandle(heavyPlaylistInformation.webpage_url)
            }
            className="text-blue-600 cursor-pointer"
          />
        </span>
        <h1>{heavyPlaylistInformation.title}</h1>
      </header>
      <CompletePlaylistDownloadComponent/>
      <SelectedPlaylistDownloadComponent/>
      <div className="grid gap-4">
        {heavyPlaylistInformation.entries.map((entry, index) => (
          <div
            key={index}
            className="shadow-lg shadow-black p-4 grid gap-4 rounded-lg"
          >
            <header className="flex gap-4">
              <Checkbox value={index.toString().trim()}></Checkbox>
              <h1>
                {++index + " -> "} {entry.title}
              </h1>
            </header>
            <div className="flex gap-4 p-2 max-w-full">
              <span>
                <Copy
                  onClick={() => clipboardWritingHandle(entry.url)}
                  className="text-blue-600 cursor-pointer"
                />
              </span>
              <a
                className="cursor-pointer"
                href={entry.url}
                target="_blank"
              >
                {entry.url}
              </a>
            </div>
            {/* Download Option..... */}
            <div className="grid grid-cols-3 gap-1">
              <Button
                className="flex max-w-full w-fit"
                onPress={() =>
                  downloadHandler("bestvideo+bestaudio", entry.url, entry.title)
                }
                color="warning"
              >
                <Download />
                Best
              </Button>
              <Button
                className="flex max-w-full w-fit"
                onPress={() =>
                  downloadHandler(
                    "bestvideo[height<=2160]+bestaudio",
                    entry.url,
                    entry.title
                  )
                }
                color="success"
              >
                <Download />
                Max-4K/2160p
              </Button>

              <Button
                className="flex max-w-full w-fit"
                onPress={() =>
                  downloadHandler(
                    "bestvideo[height<=1440]+bestaudio",
                    entry.url,
                    entry.title
                  )
                }
                color="primary"
              >
                <Download />
                Max-2K/1440p
              </Button>

              <Button
                className="flex max-w-full w-fit"
                onPress={() =>
                  downloadHandler(
                    "bestvideo[height<=1080]+bestaudio",
                    entry.url,
                    entry.title
                  )
                }
                color="primary"
              >
                <Download />
                Max-FHD/1080p
              </Button>

              <Button
                className="flex max-w-full w-fit"
                onPress={() =>
                  downloadHandler(
                    "bestvideo[height<=720]+bestaudio",
                    entry.url,
                    entry.title
                  )
                }
                color="primary"
              >
                <Download />
                Max-HD/720
              </Button>
              <Button
                className=" max-w-full w-fit"
                onPress={() =>
                  downloadHandler("bestaudio/ba", entry.url, entry.title)
                }
                color="danger"
              >
                <Download />
                Audio (Max-best)
              </Button>
            </div>
          </div>
        ))}
      </div>
      <SelectedPlaylistDownloadComponent/>
      <OpenHeavyDialogSection />
    </div>
  );
}
