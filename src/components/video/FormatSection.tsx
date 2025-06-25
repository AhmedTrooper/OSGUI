import { useDownloadStore } from "@/store/downloadStore";
import { useUserInputVideoStore } from "@/store/UserInputVideoStore";
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Divider,
} from "@heroui/react";
import clsx from "clsx";
import { isEmpty } from "lodash";
import { BadgeCheck, Download, Turtle } from "lucide-react";
import OpenDialogSection from "./OpenDialogSection";

export default function FormatSection() {
  let videoInformation = useUserInputVideoStore(
    (state) => state.videoInformation
  );
  let showNonMedia = useUserInputVideoStore((state) => state.showNonMedia);
  let setShowNonMedia = useUserInputVideoStore(
    (state) => state.setShowNonMedia
  );

  const downloadBestFormat = useDownloadStore(
    (state) => state.downloadBestFormat
  );
  return (
    <div className="mt-4  h-[80vh] w-full flex flex-col p-4 shadow-lg shadow-black rounded-md">
      {!videoInformation && (
        <div className="w-full h-full p-2 justify-items-center items-center content-center">
          <Turtle />
        </div>
      )}

      {videoInformation && <h1>{videoInformation.title}</h1>}
      <Button
        onPress={() => setShowNonMedia(!showNonMedia)}
        className="m-2 p-2 w-fit justify-self-center"
        color={!showNonMedia ? "primary" : "danger"}
      >
        {!showNonMedia ? (
          <span>Show Non-Media</span>
        ) : (
          <span>Hide Non-Media</span>
        )}
      </Button>

      {/* Non media Part */}

      <div
        className={clsx(" overflow-auto mt-4", {
          "grid  gap-4 flex-1": showNonMedia,
          hidden: !showNonMedia,
        })}
      >
        {videoInformation && !isEmpty(videoInformation.formats) && (
          <div className="flex-1 overflow-auto mt-4">
            {videoInformation.formats.reverse().map((video, idx: number) => (
              <Card
                key={idx}
                className={clsx("m-2", {
                  hidden: !(video.vcodec === "none" && video.acodec === "none"),
                })}
              >
                <CardHeader className="text-blue-700">
                  {video.vcodec !== "none" && video.acodec === "none" && (
                    <BadgeCheck className="m-1 text-green-600" />
                  )}
                  {video.resolution && (
                    <h1>
                      {video.resolution}
                      <span className="text-red-600">[{video.format_id}]</span>
                    </h1>
                  )}
                </CardHeader>
                <Divider></Divider>
                <CardBody>
                  {video.vcodec === "none" && video.acodec === "none" && (
                    <h1>No Audio or Video-a</h1>
                  )}
                  {video.vcodec === "none" && video.acodec !== "none" && (
                    <h1> Audio Only</h1>
                  )}
                  {video.vcodec !== "none" && video.acodec === "none" && (
                    <h1> Video Only</h1>
                  )}
                  {video.video_ext && <h1>Extention : {video.ext}</h1>}
                  {!("acodec" in videoInformation) &&
                    !("vcodec" in videoInformation) && <h1>Audio + Video</h1>}
                </CardBody>

                <CardFooter>
                  <Button color="primary">Download</Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Media part.... */}
      <div
        className={clsx(" overflow-auto mt-4", {
          "grid grid-cols-2 gap-4 flex-1": !showNonMedia,
          hidden: showNonMedia,
        })}
      >
        {videoInformation && !isEmpty(videoInformation.formats) && (
          <div className="flex-1 overflow-auto mt-4">
            {videoInformation.formats.reverse().map((video, idx: number) => (
              <Card
                key={idx}
                className={clsx("m-2", {
                  hidden:
                    (video.vcodec === "none" && video.acodec !== "none") ||
                    (video.vcodec === "none" && video.acodec === "none"),
                })}
              >
                <CardHeader className="text-blue-600">
                  {video.vcodec !== "none" && video.acodec === "none" && (
                    <BadgeCheck className="m-1 text-green-600" />
                  )}
                  {video.resolution && (
                    <h1>
                      {video.resolution}
                      <span className="text-red-600">[{video.format_id}]</span>
                    </h1>
                  )}
                </CardHeader>
                <Divider></Divider>
                <CardBody>
                  {video.vcodec === "none" && video.acodec === "none" && (
                    <h1 className="text-red-600 font-bold">
                      No Audio or Video
                    </h1>
                  )}
                  {video.vcodec === "none" && video.acodec !== "none" && (
                    <h1 className="text-red-600 font-bold"> Audio Only</h1>
                  )}
                  {video.vcodec !== "none" && video.acodec === "none" && (
                    <h1 className="text-red-600 font-bold"> Video Only</h1>
                  )}
                  {video.video_ext && (
                    <h1>
                      Extention :{" "}
                      <span className="text-red-600 font-bold">
                        {video.ext}
                      </span>
                    </h1>
                  )}
                  {!("acodec" in videoInformation) &&
                    !("vcodec" in videoInformation) && (
                      <h1 className="text-gree-600 font-bold">Audio + Video</h1>
                    )}
                </CardBody>
                {!(video.vcodec === "none" && video.acodec === "none") && (
                  <CardFooter>
                    <Button color="primary">Select</Button>
                  </CardFooter>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Audio Part  */}

        {videoInformation && !isEmpty(videoInformation.formats) && (
          <div className={clsx("flex-1 overflow-auto mt-4", {})}>
            {videoInformation.formats.map((video, idx: number) => (
              <Card
                key={idx}
                className={clsx("m-2", {
                  hidden: !(video.vcodec === "none" && video.acodec !== "none"),
                })}
              >
                <CardHeader className="text-blue-600">
                  {video.vcodec === "none" && video.acodec !== "none" && (
                    <BadgeCheck className="m-1 text-green-600" />
                  )}

                  {video.resolution && (
                    <h1>
                      {video.resolution}
                      <span className="text-red-600">[{video.format_id}]</span>
                    </h1>
                  )}
                </CardHeader>
                <Divider></Divider>
                <CardBody>
                  {video.vcodec === "none" && video.acodec === "none" && (
                    <h1 className="text-red-600 font-bold">
                      No Audio or Video-a
                    </h1>
                  )}
                  {video.vcodec === "none" && video.acodec !== "none" && (
                    <h1 className="text-red-600 font-bold"> Audio Only</h1>
                  )}
                  {video.vcodec !== "none" && video.acodec === "none" && (
                    <h1 className="text-red-600 font-bold"> Video Only</h1>
                  )}
                  {video.video_ext && (
                    <h1>
                      Extention :{" "}
                      <span className="text-red-600 font-bold">
                        {video.ext}
                      </span>
                    </h1>
                  )}

                  {(video.vcodec !== "none" || video.vcodec === undefined) &&
                    (video.acodec !== "none" || video.acodec === undefined) && (
                      <h1 className="text-green-600 font-bold">
                        Audio + Video
                      </h1>
                    )}
                </CardBody>

                {!(video.vcodec === "none" && video.acodec === "none") &&
                  video.vcodec === "none" &&
                  video.acodec !== "none" && (
                    <CardFooter>
                      <Button color="primary">Select</Button>
                    </CardFooter>
                  )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {videoInformation && videoInformation.format_id && !showNonMedia && (
        <div className="w-full grid">
          <Button
            color="primary"
            className=" w-fit mt-4 p-2 justify-self-center"
            onPress={() =>
              downloadBestFormat(
                videoInformation.format_id as string,
                videoInformation.webpage_url as string,
                videoInformation.title as string
              )
            }
          >
            <Download /> <span>{videoInformation.format}</span>
          </Button>
        </div>
      )}

      {videoInformation && videoInformation.format_id && !showNonMedia && (
        <div className="w-full grid">
          <Button
            color="danger"
            className=" w-fit mt-4 p-2 justify-self-center"
          >
            <Download /> <span>{videoInformation.format}</span>
          </Button>
        </div>
      )}
      <OpenDialogSection/>
    </div>
  );
}
