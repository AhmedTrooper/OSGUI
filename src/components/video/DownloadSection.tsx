import { useUserInputVideoStore } from "@/store/UserInputVideoStore";
import { Spinner } from "@heroui/react";
import { isEmpty } from "lodash";
import { ShieldCheck } from "lucide-react";
import { clsx } from "clsx";

export default function DownloadSection() {
  const downloadsArr = useUserInputVideoStore((state) => state.downloadsArr);
  return (
    <div className="mt-4 bg-pink-500 h-[80vh] overflow-auto">
      {isEmpty(downloadsArr) && <h1>No download is founds</h1>}
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
