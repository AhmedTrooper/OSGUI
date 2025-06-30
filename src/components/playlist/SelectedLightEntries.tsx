import { useHeavyPlaylistStore } from "@/store/HeavyPlaylistStore";
import { Trash2 } from "lucide-react";

export default function SelectedLightEntries() {
  const modifiedLightEntriesArr = useHeavyPlaylistStore(
    (state) => state.modifiedLightEntriesArr
  );
  const removeItemsFromLightModifiedEntriesArr = useHeavyPlaylistStore(
    (state) => state.removeItemsFromLightModifiedEntriesArr
  );

  if (!modifiedLightEntriesArr) return;

  return (
    <div className="rounded-md h-max-[60vh] shadow-black shadow-md p-2 grid  overflow-auto custom-scrollbar">
      <div className="max-h-[60vh] min-h-fit grid overflow-auto custom-scrollba">
        {modifiedLightEntriesArr.map((fileEntry, index) => (
          <div
            className="shadow-black shadow-sm p-1 rounded-sm flex gap-4"
            key={index}
          >
            <span
              onClick={() => removeItemsFromLightModifiedEntriesArr(fileEntry)}
            >
              <Trash2 className="text-red-600 cursor-pointer" />
            </span>
            {fileEntry.title}
          </div>
        ))}
      </div>
    </div>
  );
}
