import { useUserInputVideoStore } from "@/store/UserInputVideoStore";
import { Spinner } from "@heroui/react";
import { isEmpty } from "lodash";
import { Play, ShieldCheck, Turtle } from "lucide-react";
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
        <div className="shadow-lg shadow-black  rounded-md m-2  h-fit">
          {downloadsArr.map((video, index) => (
            <div key={index} className="m-2">
              <h1 className="text-blue-600 font-bold">{video.title}</h1>
              <h1>{video.format_id}</h1>
              <h1>{video.web_url}</h1>
              
              {video.tracking_message && <h1>{video.tracking_message}</h1>}
              {parseBoolean(video.completed) && (
                <ShieldCheck
                  className={clsx("", {
                    "text-red-500": video.failed,
                    "text-green-500": !video.failed,
                  })}
                />
              )}
              {parseBoolean(video.active) && (
                <Spinner
                  color="white"
                  variant="spinner"
                />
              )}

              {!parseBoolean(video.active) && !parseBoolean(video.completed) && <Play className="m-2 cursor-pointer"/>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
