import { useDownloadStore } from "@/store/DownloadStore";
import { useFileStore } from "@/store/FileStore";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button, Input } from "@heroui/react";
import { Download, SparkleIcon } from "lucide-react";
import { FaEraser, FaPaste } from "react-icons/fa";

export const DirectDownloadSection = () => {
  const generateFileTitle = useFileStore((state) => state.generateFileTitle);
  const fileTitle = useFileStore((state) => state.fileTitle);
  const fileUrl = useFileStore((state) => state.fileUrl);
  const pasteFileTitle = useFileStore((state) => state.pasteFileTitle);
  const pasteFileUrl = useFileStore((state) => state.pasteFileUrl);
  const downloadHandler = useDownloadStore((state) => state.downloadHandler);

  return (
    <div className="mt-4 mb-4">
      <Card>
        <CardHeader className="grid">
          <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">
            Direct File Download{" "}
            <span className="text-sm">(any file type)</span>
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Paste a direct download link to a file and optionally a title, then
            click download.
          </p>
        </CardHeader>
        <CardBody className="grid grid-cols-2 gap-4">
          <Input
            placeholder="Direct Download URL (if available)"
            type="text"
            value={fileUrl as string}
            onChange={(e: any) =>
              useFileStore.getState().setFileUrl(e.target.value)
            }
          ></Input>

          <span className="w-full gap-4 cursor-pointer flex items-center justify-center">
            <FaPaste onClick={pasteFileUrl} className="text-2xl" />
            <FaEraser
              className="text-2xl"
              onClick={() => useFileStore.getState().resetFileUrl()}
            />
          </span>

          <Input
            onChange={(e: any) =>
              useFileStore.getState().setFileTitle(e.target.value)
            }
            value={fileTitle as string}
            placeholder="File Title"
          ></Input>
          <span className="w-full cursor-pointer flex gap-4 items-center justify-center">
            <FaPaste onClick={pasteFileTitle} className="text-2xl" />
            <FaEraser
              className="text-2xl"
              onClick={() => useFileStore.getState().resetFileTitle()}
            />
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
            onPress={() =>
              downloadHandler(
                "DFU",
                fileUrl as string,
                fileTitle as string,
                true
              )
            }
          >
            Download File
            <span>
              <Download />
            </span>
          </Button>
        </CardBody>
      </Card>
    </div>
  );
};
