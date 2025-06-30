import { useHeavyPlaylistStore } from "@/store/HeavyPlaylistStore";
import { useUserInputVideoStore } from "@/store/UserInputVideoStore";
import { Button, Input, Spinner } from "@heroui/react";
import { Eraser, Clipboard } from "lucide-react";

export default function PlaylistInputSection() {
  const clipboardReadingHandle = useUserInputVideoStore(
    (state) => state.clipboardReadingHandle
  );

  const clearVideoInputField = useUserInputVideoStore(
    (state) => state.clearVideoInputField
  );

  const fetchPlaylistInformation = useHeavyPlaylistStore(
    (state) => state.fetchHeavyPlaylistInformation
  );

  const setPlaylistUrl = useHeavyPlaylistStore((state) => state.setPlaylistUrl);

  const playlistUrl = useHeavyPlaylistStore((state) => state.playlistUrl);
  const playlistFetchLoading = useHeavyPlaylistStore(
    (state) => state.playlistFetchLoading
  );

  return (
    <div className="grid gap-4 w-full h-full justify-items-center content-start">
      <div>
        <Input
          placeholder="Enter URL"
          className="col-span-4 overflow-auto w-60"
          value={playlistUrl}
          onChange={(elm) => setPlaylistUrl(elm.target.value)}
          validate={(x: string) => {
            if (x.startsWith("http://") || x.startsWith("https://"))
              return true;
            return "URL must start with http:// or https://";
          }}
          validationBehavior="native"
        />
      </div>

      <div className="w-fit flex  gap-4">
        <Clipboard
          onClick={clipboardReadingHandle}
          className="cursor-pointer text-zinc-700 dark:text-zinc-400"
        />
        <Eraser
          onClick={clearVideoInputField}
          className="cursor-pointer text-zinc-700 dark:text-zinc-400"
        />
      </div>
      <div>
        <Button
          color="primary"
          onPress={fetchPlaylistInformation}
        >
          {playlistFetchLoading ? (
            <Spinner
              variant="wave"
              color="white"
            />
          ) : (
            <span>Light Fetch</span>
          )}
        </Button>
      </div>
    </div>
  );
}
