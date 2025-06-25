import { useUserInputVideoStore } from "@/store/UserInputVideoStore";
import { Spinner } from "@heroui/react";
import { isEmpty } from "lodash";
import { BadgeX, Play, ShieldCheck, Turtle } from "lucide-react";
import { clsx } from "clsx";
import { useUtilityStore } from "@/store/UtilityStore";

export default function DownloadSection() {
  const downloadsArr = useUserInputVideoStore((state) => state.downloadsArr);
  const parseBoolean = useUtilityStore((state) => state.parseBoolean);
  return (
    <div className="mt-4  shadow-lg shadow-black h-[80vh] overflow-auto grid gap-4 rounded-md">
      {isEmpty(downloadsArr) && (
        <Turtle
          className="justify-self-center self-center text-4xl  text-zinc-500"
          width={100}
          height={100}
        />
      )}
      {!isEmpty(downloadsArr) && (
        <div className="  rounded-md m-2  h-fit">
          {downloadsArr.map((video, index) => (
            <div
              key={index}
              className={clsx("m-2 shadow-md shadow-black p-1 rounded-md")}
            >
              <h1 className="text-blue-600 font-bold">{video.title}</h1>
              <h1>{video.format_id}</h1>
              <h1>{video.web_url}</h1>

              {video.tracking_message && (
                <h1
                  className={clsx("", {
                    hidden: video.tracking_message.trim() === "falseFoundTrue",
                  })}
                >
                  {video.tracking_message}
                </h1>
              )}

              {!parseBoolean(video.failed) && parseBoolean(video.completed) && (
                <ShieldCheck className={clsx("text-green-600", {})} />
              )}

              {parseBoolean(video.failed) && parseBoolean(video.completed) && (
                <BadgeX className={clsx("text-red-600", {})} />
              )}

              {parseBoolean(video.active) && (
                <Spinner
                  color="white"
                  variant="spinner"
                />
              )}

              {parseBoolean(video.isPaused) &&
                !parseBoolean(video.completed) && (
                  <Play className="m-2 cursor-pointer" />
                )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
