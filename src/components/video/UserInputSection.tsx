import { useUserInputVideoStore } from "@/store/UserInputVideoStore";
import { Button, Card, Input, Spinner } from "@heroui/react";
import { Clipboard } from "lucide-react";

export default function UserInputSection() {
  const fetchVideoInformation = useUserInputVideoStore(
    (state) => state.fetchVideoInformation
  );
  const isLoadingForJsonCreation = useUserInputVideoStore(
    (state) => state.isLoadingForJsonCreation
  );
  const videoUrl = useUserInputVideoStore((state) => state.videoUrl);
  const setVideoUrl = useUserInputVideoStore((state) => state.setVideoUrl);

  return (
    <Card className="w-full grid grid-cols-7 gap-4 justify-items-center p-2 content-center items-center">
      <Input
        className="col-span-4"
        value={videoUrl}
        onChange={(elm) => setVideoUrl(elm.target.value)}
        validate={(x: string) => {
          if (x.startsWith("http://") || x.startsWith("https://")) return true;
          return "URL must start with http:// or https://";
        }}
        validationBehavior="native"
      />
      <Clipboard className="cursor-pointer text-zinc-700 dark:text-zinc-400" />
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
