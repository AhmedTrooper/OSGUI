import { useUserInputVideoStore } from "@/store/UserInputVideoStore";
import { Button, Card, Input, Spinner } from "@heroui/react";
import { Clipboard, Eraser } from "lucide-react";

export default function UserInputSection() {
  const fetchVideoInformation = useUserInputVideoStore(
    (state) => state.fetchVideoInformation
  );
  const isLoadingForJsonCreation = useUserInputVideoStore(
    (state) => state.isLoadingForJsonCreation
  );
  const videoUrl = useUserInputVideoStore((state) => state.videoUrl);
  const setVideoUrl = useUserInputVideoStore((state) => state.setVideoUrl);
  const clipboardReadingHandle = useUserInputVideoStore((state) => state.clipboardReadingHandle);
    const clearVideoInputField = useUserInputVideoStore((state) => state.clearVideoInputField);


  return (
    <Card className="w-full grid grid-cols-7 gap-4 justify-items-center p-2 content-center items-center">
      <Input
      placeholder="Enter video URL"
        className="col-span-4"
        value={videoUrl}
        onChange={(elm) => setVideoUrl(elm.target.value)}
        validate={(x: string) => {
          if (x.startsWith("http://") || x.startsWith("https://")) return true;
          return "URL must start with http:// or https://";
        }}
        validationBehavior="native"
      />
     <div className="w-fit flex  gap-4">
       <Clipboard onClick={clipboardReadingHandle} className="cursor-pointer text-zinc-700 dark:text-zinc-400" />
      <Eraser onClick={clearVideoInputField} className="cursor-pointer text-zinc-700 dark:text-zinc-400" />
     </div>
      <Button
        color="primary"
        variant="shadow"
        className="font-bold w-full col-span-2 grid justify-items-center items-center"
        onPress={fetchVideoInformation}
      >
        {isLoadingForJsonCreation ? (
          <Spinner
            color="white"
            variant="dots"
          />
        ) : (
          "Create"
        )}
      </Button>
    </Card>
  );
}
