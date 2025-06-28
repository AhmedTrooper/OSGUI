import { UserInputVideoStoreInterface } from "@/interfaces/video/UserInputVideoStore";
import { Command } from "@tauri-apps/plugin-shell";
import { create } from "zustand";
import {
  BaseDirectory,
  mkdir,
  writeTextFile,
  readDir,
  readTextFile,
  exists,
} from "@tauri-apps/plugin-fs";
import { documentDir, join } from "@tauri-apps/api/path";
import { addToast } from "@heroui/react";
import {
  DownloadListInterface,
  SingleVideoTileInterface,
  VideoInformationInterface,
} from "@/interfaces/video/VideoInformation";
import {
  readText,
  writeText,
  clear,
} from "@tauri-apps/plugin-clipboard-manager";

export const useUserInputVideoStore = create<UserInputVideoStoreInterface>(
  (set, get) => ({
    showNonMedia: false,
    setShowNonMedia: (status: boolean) => set({ showNonMedia: status }),
    videoInformation: null,
    setVideoInformation: (vio: VideoInformationInterface | null) =>
      set({ videoInformation: vio }),
    downloadsArr: [],
    setDownloadsArr: (dArr: DownloadListInterface) =>
      set({ downloadsArr: dArr }),
    setVideoInformationFetchFailed: (s: boolean) =>
      set({ videoInformationFetchFailed: s }),
    setVideoUrl: (url: string) => set({ videoUrl: url }),
    videoInformationFetchFailed: false,
    videoUrl: "",
    fetchVideoInformation: async () => {
      const UserInputVideoStore = get();

      const videoUrl = UserInputVideoStore.videoUrl;
      const setIsLoadingForJsonCreation =
        UserInputVideoStore.setIsLoadingForJsonCreation;
      await setIsLoadingForJsonCreation(true);

      const setVideoInformationFetchFailed =
        UserInputVideoStore.setVideoInformationFetchFailed;
      setVideoInformationFetchFailed(false);

      const setDialogSectionVisible =
        UserInputVideoStore.setDialogSectionVisible;
      setDialogSectionVisible(false);
      UserInputVideoStore.setFormatSectionVisible(false);
      UserInputVideoStore.setVideoInformation(null);
      const documentFolder = await documentDir();
      const folderPath = await join(documentFolder, "OSGUI");
      let noError = true;

      try {
        await readDir(folderPath); // throws if not exist
      } catch {
        await mkdir("OSGUI", {
          baseDir: BaseDirectory.Document,
          recursive: true,
        });
      }

      const filePath = await join(folderPath, "video.json");

      let jsonOutput = "";
      // let jsonArray:any[] = [];
      const command = Command.create("ytDlp", [
        "--dump-json",
        `${videoUrl.trim()}`,
      ]);
      //       const command = Command.create("ytDlp", [
      //   "--dump-json",
      //   "--yes-playlist",
      //   "--no-warnings",
      //   "--ignore-errors",
      //   videoUrl
      // ]);

      try {
        command.stdout.on("data", (line) => {
          jsonOutput = line;
          // console.log(line);
          // jsonArray.push(JSON.parse(line));
        });
        command.stderr.on("data", (data) => {
          noError = false;
          addToast({
            title: "Error ocurred on Data Fetch",
            description: data,
            color: "danger",
            timeout: 2000,
          });
        });

        command.on("close", async () => {
          if (noError) {
            // console.log(await jsonArray);
            await writeTextFile(filePath, jsonOutput, {
              baseDir: BaseDirectory.Document,
            });
            const readJsonFile = get().readJsonFile;
            await readJsonFile();
          } else {
            setIsLoadingForJsonCreation(false);
            addToast({
              title: "Error ocurred on Data Fetch",
              description: "Unsafe json output!",
              color: "danger",
              timeout: 2000,
            });
          }
        });
        await command.spawn();
      } catch (error) {
        addToast({
          title: "Error saving video info",
          description: "Hell",
          color: "danger",
          timeout: 2000,
        });
        console.error("❌ Error saving video info:", error);

        const UserInputVideoStore = get();
        const setVideoInformationFetchFailed =
          UserInputVideoStore.setVideoInformationFetchFailed;
        setVideoInformationFetchFailed(true);

        addToast({
          title: "Error saving video info",
          description: error as string,
          color: "danger",
          timeout: 2000,
        });
      }
    },
    readJsonFile: async () => {
      try {
        const documentFolder = await documentDir();
        const folderPath = await join(documentFolder, "OSGUI");
        const filePath = await join(folderPath, "video.json");
        const fileExists = await exists(filePath);
        const userInputVideoStore = get();
        const setFormatSectionVisible =
          userInputVideoStore.setFormatSectionVisible;
        const setVideoInformation = userInputVideoStore.setVideoInformation;
        if (!fileExists) {
          addToast({
            title: "video.json not found",
            description: "video.json does not exist at : " + filePath,
            color: "danger",
            timeout: 2000,
          });
          return null;
        }

        const jsonString = await readTextFile(filePath);
        const jsonData = await JSON.parse(jsonString);
        setFormatSectionVisible(true);
        setVideoInformation(jsonData as VideoInformationInterface);
        console.log(await jsonData);
        // return jsonData;
      } catch (err) {
        const UserInputVideoStore = get();
        const setVideoInformationFetchFailed =
          UserInputVideoStore.setVideoInformationFetchFailed;
        setVideoInformationFetchFailed(true);
        console.error("Error reading video.json:", err);

        const setIsLoadingForJsonCreation =
          UserInputVideoStore.setIsLoadingForJsonCreation;

        setIsLoadingForJsonCreation(false);
      } finally {
        const UserInputVideoStore = get();

        const setIsLoadingForJsonCreation =
          UserInputVideoStore.setIsLoadingForJsonCreation;

        const videoInformationFetchFailed =
          UserInputVideoStore.videoInformationFetchFailed;

        if (!videoInformationFetchFailed) {
          UserInputVideoStore.setDialogSectionVisible(true);
          addToast({
            title: "Successfull",
            description: "Video successfully fetched!",
            color: "success",
            timeout: 2000,
          });
        } else {
          addToast({
            title: "Error",
            description:
              "Something went wrong,Video information fetching failed!",
            color: "danger",
            timeout: 2000,
          });
        }

        setIsLoadingForJsonCreation(false);
      }
    },
    isLoadingForJsonCreation: false,
    setIsLoadingForJsonCreation: (s: boolean) =>
      set({ isLoadingForJsonCreation: s }),
    dialogSectionVisible: false,
    setDialogSectionVisible: (status: boolean) =>
      set({ dialogSectionVisible: status }),
    formatSectionVisible: false,
    setFormatSectionVisible: (status: boolean) =>
      set({ formatSectionVisible: status }),

    addVideoToDownloadsArr: (video: SingleVideoTileInterface) => {
      const UserInputVideoStore = get();
      const downloadsArr = UserInputVideoStore.downloadsArr;
      const setDownloadsArr = UserInputVideoStore.setDownloadsArr;

      const singleVideo = video;
      let x = [...downloadsArr];

      try {
        x.push(singleVideo);
        setDownloadsArr(x);
      } catch (e) {
        console.log("Pushing to downloads array failed");
      }
    },
    clipboardReadingHandle: async () => {
      const UserInputVideoStore = get();
      const setVideoUrl = UserInputVideoStore.setVideoUrl;

      try {
        const content = await readText();
        await setVideoUrl(content);
        addToast({
          title: "Paste successfull",
          description: "Successfully pasted the link!",
          color: "success",
          timeout: 1000,
        });
      } catch (err) {
        console.log(err);
        addToast({
          title: "Paste failed",
          description: err as string,
          color: "warning",
          timeout: 1000,
        });
      }
    },
    clipboardWritingHandle: async (data: string | undefined) => {
      try {
        if (data) {
          await writeText(data.trim());

          addToast({
            title: "Copied",
            description: "File link is copied successsfully",
            color: "primary",
            timeout: 1000,
          });
        }
      } catch (err) {
        addToast({
          title: "Copy failed",
          description: err as string,
          color: "warning",
          timeout: 1000,
        });
      }
    },
    handleClipboardClear: async () => {
      try {
        await clear();
        addToast({
          title: "Cleard",
          description: "Input field cleard",
          color: "primary",
          timeout: 1000,
        });
      } catch (error) {
        console.log(error);
        addToast({
          title: "Clear error",
          description: "Couln't clear clipboard",
          color: "warning",
          timeout: 1000,
        });
      }
    },
    clearVideoInputField: () => {
      let videoStore = get();
      videoStore.setVideoUrl("");
      // videoStore.handleClipboardClear();
    },
  })
);
