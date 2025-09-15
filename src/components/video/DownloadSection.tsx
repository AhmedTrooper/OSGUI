import { useUserInputVideoStore } from "@/store/UserInputVideoStore";
import { Button, Spinner } from "@heroui/react";
import { isEmpty } from "lodash";
import {
  BadgeX,
  ChevronRight,
  CirclePower,
  Copy,
  Play,
  ShieldCheck,
  Trash2Icon,
  Turtle,
} from "lucide-react";
import { clsx } from "clsx";
import { useUtilityStore } from "@/store/UtilityStore";
import { useDatabaseStore } from "@/store/DatabaseStore";
import { useDownloadStore } from "@/store/DownloadStore";
import DownloadsHeader from "./DownloadsHeader";
import { useHeavyPlaylistStore } from "@/store/HeavyPlaylistStore";
import { LightPlaylistVideoQuality } from "@/interfaces/playlist/QualityEnumsInterface";
import { FaPause } from "react-icons/fa";

export default function DownloadSection() {
  const downloadsArr = useUserInputVideoStore((state) => state.downloadsArr);
  const parseBoolean = useUtilityStore((state) => state.parseBoolean);
  const singleFileRemove = useDatabaseStore((state) => state.singleFileRemove);
  const downloadHandler = useDownloadStore((state) => state.downloadHandler);
  const clipboardWritingHandle = useUserInputVideoStore(
    (state) => state.clipboardWritingHandle
  );
  const playlistVerificationString = useHeavyPlaylistStore(
    (state) => state.playlistVerificationString
  );
  const lightPlaylistSingleDownloadHandler = useHeavyPlaylistStore(
    (state) => state.lightPlaylistSingleDownloadHandler
  );
  const setVideoToPause = useUserInputVideoStore(
    (state) => state.setVideoToPause
  );
  return (
    <div className="mt-4  shadow-lg shadow-black h-[80vh] overflow-auto grid gap-4 custom-scrollbar rounded-md">
      {isEmpty(downloadsArr) && (
        <Turtle
          className="justify-self-center self-center text-4xl  text-zinc-500"
          width={100}
          height={100}
        />
      )}

      {/* Video Downloads List... */}

      {!isEmpty(downloadsArr) && (
        <div className="  rounded-md m-2  h-fit min-h-[80vh]">
          <DownloadsHeader />
          {downloadsArr.map((video, index) => (
            <div
              key={index}
              className={clsx(
                "m-2 w-max-[100px]  shadow-md shadow-black p-2 rounded-md"
              )}
            >
              <h1 className="text-blue-600 font-bold flex">
                <span>
                  <ChevronRight />
                </span>
                <p>{video.title}</p>
              </h1>
              <Button color="primary" className="m-1">
                {video.format_id}
              </Button>
              <div className="flex max-w-full  gap-4 p-2 ">
                <span>
                  <Copy
                    onClick={() => clipboardWritingHandle(video.web_url!)}
                    className="text-blue-600 cursor-pointer"
                  />
                </span>
                <p className="max-w-[200px] sm:max-w-[400px] md:max-w-[500px] lg:max-w-[800px] truncate ">
                  {video.web_url}
                </p>
              </div>

              {video.tracking_message && (
                <h1
                  className={clsx("max-w-full p-2", {
                    hidden: video.tracking_message.trim() === "falseFoundTrue",
                  })}
                >
                  {video.tracking_message}
                </h1>
              )}

              {parseBoolean(video.completed) && (
                <ShieldCheck className={clsx("text-green-600 m-2", {})} />
              )}

              {parseBoolean(video.failed)  && (
                <BadgeX className={clsx("text-red-600 m-2", {})} />
              )}

              {parseBoolean(video.active) && (
                <Spinner color="white" variant="spinner" className="m-2" />
              )}

              {!(video.failed || video.completed || video.active) &&
                parseBoolean(video.isPaused) && (
                  <Play className="m-2 cursor-pointer" />
                )}
              <div className=" gap-6 w-fit p-1 items-center justify-items-end justify-center justify-self-center self-center grid grid-cols-3">
                <Trash2Icon
                  onClick={() => singleFileRemove(video.unique_id)}
                  className="cursor-pointer  active:scale-95 transition-transform duration-100 text-red-500"
                />

                {playlistVerificationString !== video.playlistVerification &&
                  video.format_id !== "DFU" && (
                    <CirclePower
                      onClick={() =>
                        downloadHandler(
                          video.format_id,
                          video.web_url as string,
                          video.title as string
                        )
                      }
                      className="cursor-pointer  active:scale-95 transition-transform duration-100 text-green-600"
                    />
                  )}

                {playlistVerificationString === video.playlistVerification &&
                  video.format_id !== "DFU" && (
                    <CirclePower
                      onClick={() =>
                        lightPlaylistSingleDownloadHandler(
                          video.title as string,
                          video.web_url as string,
                          video.playlistTitle,
                          video.format_id as LightPlaylistVideoQuality
                        )
                      }
                      className="cursor-pointer  active:scale-95 transition-transform duration-100 text-blue-600"
                    />
                  )}
                {video.format_id === "DFU" && (
                  <CirclePower
                    onClick={() =>
                      downloadHandler(
                        video.format_id,
                        video.web_url as string,
                        video.title as string,
                        true
                      )
                    }
                    className="cursor-pointer  active:scale-95 transition-transform duration-100 text-green-600"
                  />
                )}
                {!video.isPaused && (
                  <Button
                    color="danger"
                    onPress={() => setVideoToPause(video.unique_id)}
                    className=" text-white font-bold flex"
                  >
                    <span>Pause</span>
                    <FaPause className="ml-2 mt-1" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Header section downloads.... */}

      {/* Modified Arrays...... */}
      {/* {modifiedDownloadsArr && !isEmpty(modifiedDownloadsArr) && (
        <div className="  rounded-md m-2  h-fit ">
          <h1>Modified download list</h1>
          <DownloadsHeader />
          {modifiedDownloadsArr.map((video, index) => (
            <div
              key={index}
              className={clsx("m-2 shadow-md shadow-black p-2 rounded-md")}
            >
              <h1 className="text-blue-600 font-bold flex">
                <span>
                  <ChevronRight />
                </span>
                {video.title}
              </h1>
              <Button
                color="primary"
                className="m-1"
              >
                {video.format_id}
              </Button>
              <div className="flex gap-4 p-2 max-w-full">
                <span>
                  <Copy
                    onClick={() => clipboardWritingHandle(video.web_url!)}
                    className="text-blue-600 cursor-pointer"
                  />
                </span>
                {video.web_url}
              </div>

              {video.tracking_message && (
                <h1
                  className={clsx("max-w-full p-2", {
                    hidden: video.tracking_message.trim() === "falseFoundTrue",
                  })}
                >
                  {video.tracking_message}
                </h1>
              )}

              {!parseBoolean(video.failed) && parseBoolean(video.completed) && (
                <ShieldCheck className={clsx("text-green-600 m-2", {})} />
              )}

              {parseBoolean(video.failed) && parseBoolean(video.completed) && (
                <BadgeX className={clsx("text-red-600 m-2", {})} />
              )}

              {parseBoolean(video.active) && (
                <Spinner
                  color="white"
                  variant="spinner"
                  className="m-2"
                />
              )}

              {parseBoolean(video.isPaused) &&
                !parseBoolean(video.completed) && (
                  <Play className="m-2 cursor-pointer" />
                )}
              <div className=" gap-4 w-40 p-1  justify-items-end justify-center justify-self-center self-center grid grid-cols-2">
                <Trash2Icon
                  onClick={() => singleFileRemove(video.unique_id)}
                  className="cursor-pointer  active:scale-95 transition-transform duration-100 text-red-500"
                />
                <CirclePower
                  onClick={() =>
                    downloadHandler(
                      video.format_id,
                      video.web_url as string,
                      video.title as string
                    )
                  }
                  className="cursor-pointer  active:scale-95 transition-transform duration-100 text-green-600"
                />
              </div>
            </div>
          ))}
        </div>
      )} */}
    </div>
  );
}
