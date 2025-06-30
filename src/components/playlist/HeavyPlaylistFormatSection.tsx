import { useDownloadStore } from "@/store/downloadStore";
import { useHeavyPlaylistStore } from "@/store/HeavyPlaylistStore";
import { Button } from "@heroui/react";
import { Copy, Download, ExternalLink, FilePlus2 } from "lucide-react";
import OpenHeavyDialogSection from "../video/OpenHeavyDialogSection";
import { useUserInputVideoStore } from "@/store/UserInputVideoStore";
import CompletePlaylistDownloadComponent from "./CompletePlaylistDownloadComponent";
import SelectedPlaylistDownloadComponent from "./SelectedPlaylistDownloadComponent";
import SelectedLightEntries from "./SelectedLightEntries";
import { LightPlaylistVideoQuality } from "@/interfaces/playlist/QualityEnums";

export default function HeavyPlaylistFormatSection() {
  const heavyPlaylistInformation = useHeavyPlaylistStore(
    (state) => state.heavyPlaylistInformation
  );
  const clipboardWritingHandle = useUserInputVideoStore(
    (state) => state.clipboardWritingHandle
  );

  const downloadHandler = useDownloadStore((state) => state.downloadHandler);
  const lightEntriesArr = useHeavyPlaylistStore(
    (state) => state.lightEntriesArr
  );
  const lightPlaylistSingleDownloadHandler = useHeavyPlaylistStore(
    (state) => state.lightPlaylistSingleDownloadHandler
  );

  const addItemsToLightModifiedEntriesArr = useHeavyPlaylistStore(
    (state) => state.addItemsToLightModifiedEntriesArr
  );

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
      <CompletePlaylistDownloadComponent />
      <SelectedPlaylistDownloadComponent />
      <SelectedLightEntries />
      <div className="grid gap-4">
        {lightEntriesArr.map((entry, index) => (
          <div
            key={index}
            className="shadow-lg shadow-black p-4 grid gap-4 rounded-lg"
          >
            <header className="flex gap-4">
              <span>
                <FilePlus2
                  onClick={() => addItemsToLightModifiedEntriesArr(entry)}
                  className="text-zinc-600 cursor-pointer"
                />
              </span>
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
                  lightPlaylistSingleDownloadHandler(
                    entry.title,
                    entry.url,
                    heavyPlaylistInformation.title,
                    LightPlaylistVideoQuality.BEST
                  )
                }
                color="warning"
              >
                <Download />
                Best
              </Button>
              <Button
                className="flex max-w-full w-fit"
                onPress={() =>
                  lightPlaylistSingleDownloadHandler(
                    entry.title,
                    entry.url,
                    heavyPlaylistInformation.title,
                    LightPlaylistVideoQuality.MAX4K
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
                  lightPlaylistSingleDownloadHandler(
                    entry.title,
                    entry.url,
                    heavyPlaylistInformation.title,
                    LightPlaylistVideoQuality.MAX2K
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
                  lightPlaylistSingleDownloadHandler(
                    entry.title,
                    entry.url,
                    heavyPlaylistInformation.title,
                    LightPlaylistVideoQuality.MAX1080P
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
                  lightPlaylistSingleDownloadHandler(
                    entry.title,
                    entry.url,
                    heavyPlaylistInformation.title,
                    LightPlaylistVideoQuality.MAX720P
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
                  lightPlaylistSingleDownloadHandler(
                    entry.title,
                    entry.url,
                    heavyPlaylistInformation.title,
                    LightPlaylistVideoQuality.AUDIOONLY
                  )
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
      <SelectedPlaylistDownloadComponent />
      <OpenHeavyDialogSection />
    </div>
  );
}
