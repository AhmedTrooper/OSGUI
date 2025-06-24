import { useUserInputVideoStore } from "@/store/UserInputVideoStore";
import { Button, Card, CardBody, CardFooter, CardHeader } from "@heroui/react";
import { isEmpty } from "lodash";
import { Download, Turtle } from "lucide-react";

export default function FormatSection() {
  const videoInformation = useUserInputVideoStore(
    (state) => state.videoInformation
  );
  videoInformation?.formats.reverse();
  return (
    <div className="mt-4  h-[80vh] w-full flex flex-col p-4 shadow-lg shadow-black rounded-md">
      {!videoInformation && <Turtle />}

      {videoInformation && <h1>{videoInformation.title}</h1>}

      <div className="grid grid-cols-2 gap-4 flex-1 overflow-auto mt-4">
        {videoInformation && !isEmpty(videoInformation.formats) && (
          <div className="flex-1 overflow-auto mt-4">
            {videoInformation.formats.map((video, idx: number) => (
              <Card
                key={idx}
                className="m-2"
              >
                <CardHeader className="text-blue-700">
                  {video.resolution && <h1>{video.resolution}</h1>}
                </CardHeader>
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
                  {video.video_ext && <h1>Extention : {video.video_ext}</h1>}
                  {!("acodec" in videoInformation) &&
                    !("vcodec" in videoInformation) && <h1>Audio + Video</h1>}
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
          <div className="flex-1 overflow-auto mt-4">
            {videoInformation.formats.map((video, idx: number) => (
              <Card
                key={idx}
                className="m-2"
              >
                <CardHeader className="text-blue-700">
                  {video.resolution && <h1>{video.resolution}</h1>}
                </CardHeader>
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
                  {video.video_ext && <h1>Extention : {video.video_ext}</h1>}
                  {!("acodec" in videoInformation) &&
                    !("vcodec" in videoInformation) && <h1>Audio + Video</h1>}
                </CardBody>
                {(!(video.vcodec === "none" && video.acodec === "none") && video.vcodec === "none" && video.acodec !== "none") && (
                  <CardFooter>
                    <Button color="primary">Select</Button>
                  </CardFooter>
                )}
              </Card>
            ))}
          </div>
        )}


      </div>

      {videoInformation && videoInformation.format_id && (
        <div className="w-full grid">
          <Button
            color="primary"
            className=" w-fit mt-4 p-2 justify-self-center"
          >
            <Download /> <span>{videoInformation.format}</span>
          </Button>
        </div>
      )}

      {videoInformation && videoInformation.format_id && (
        <div className="w-full grid">
          <Button
            color="danger"
            className=" w-fit mt-4 p-2 justify-self-center"
          >
            <Download /> <span>{videoInformation.format}</span>
          </Button>
        </div>
      )}
    </div>
  );
}
