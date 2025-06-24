import { useUserInputVideoStore } from "@/store/UserInputVideoStore";
import { Spinner } from "@heroui/react";
import { isEmpty } from "lodash";
import { ShieldCheck, Turtle } from "lucide-react";
import { clsx } from "clsx";

export default function DownloadSection() {
  const downloadsArr = useUserInputVideoStore((state) => state.downloadsArr);
  return (
    <div className="mt-4  shadow-lg shadow-black h-[80vh] overflow-auto grid rounded-md">
      {isEmpty(downloadsArr) && (
        <Turtle
          className="justify-self-center self-center text-4xl  text-zinc-500"
          width={100}
          height={100}
        />
      )}
      {!isEmpty(downloadsArr) && (
        <div>
          {downloadsArr.map((video, index) => (
            <div key={index}>
              <h1>{video.format_id}</h1>
              <h1>{video.web_url}</h1>
              {video.active && (
                <Spinner
                  color="white"
                  variant="spinner"
                />
              )}
              {video.completed && (
                <ShieldCheck
                  className={clsx("", {
                    "text-red-500": video.failed,
                    "text-green-500": !video.failed,
                  })}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
