import { useFileStore } from "@/store/FileStore";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button, Input } from "@heroui/react";
import { SparkleIcon } from "lucide-react";
import { FaPaste } from "react-icons/fa";

export const DirectDownloadSection = () => {
  const generateFileTitle = useFileStore((state) => state.generateFileTitle);
  const fileTitle = useFileStore((state) => state.fileTitle);
  const fileUrl = useFileStore((state) => state.fileUrl);
  const pasteFileTitle = useFileStore((state) => state.pasteFileTitle);
  const pasteFileUrl = useFileStore((state) => state.pasteFileUrl);

  return (
    <div className="mt-4 mb-4">
      <Card>
        <CardBody className="grid grid-cols-2 gap-4">
          <Input
            placeholder="Direct Download URL (if available)"
            type="text"
            value={fileUrl as string}
            onChange={(e: any) =>
              useFileStore.getState().setFileUrl(e.target.value)
            }
          ></Input>

          <span
            onClick={pasteFileUrl}
            className="w-full cursor-pointer flex items-center justify-center"
          >
            <FaPaste className="text-2xl" />
          </span>

          <Input
            onChange={(e: any) =>
              useFileStore.getState().setFileTitle(e.target.value)
            }
            value={fileTitle as string}
            placeholder="File Title"
          ></Input>
          <span
            onClick={pasteFileTitle}
            className="w-full cursor-pointer flex items-center justify-center"
          >
            <FaPaste className="text-2xl" />
          </span>
          <Button color="primary" onPress={generateFileTitle}>
            <span>Generate Title</span>
            <SparkleIcon />
          </Button>
          <Button
            color={
              fileTitle && fileTitle !== "" && fileUrl && fileUrl !== ""
                ? "primary"
                : "danger"
            }
            disabled={!fileTitle || !fileUrl}
          >
            Download
          </Button>
        </CardBody>
      </Card>
    </div>
  );
};
