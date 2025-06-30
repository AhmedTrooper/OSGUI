import { create } from "zustand";

import { addToast } from "@heroui/react";
import { useUserInputVideoStore } from "@/store/UserInputVideoStore";
import { BaseDirectory, documentDir, join } from "@tauri-apps/api/path";
import {
  exists,
  mkdir,
  readDir,
  readTextFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import { Command } from "@tauri-apps/plugin-shell";
import { HeavyPlaylistStoreInterface } from "@/interfaces/playlist/HeavyPlaylistStore";
import { HeavyPlaylistInformationInterface } from "@/interfaces/playlist/PlaylistInformation";

export const useHeavyPlaylistStore = create<HeavyPlaylistStoreInterface>(
  (set, get) => ({
    playlistUrl:
      "https://www.youtube.com/playlist?list=PLinedj3B30sA_M0oxCRgFzPzEMX3CSfT5",
    playlistFetchFailed: false,
    heavyPlaylistFormatSectionVisible: false,
    setHeavyPlaylistFormatSectionVisible: (status: boolean) =>
      set({ heavyPlaylistFormatSectionVisible: status }),

    setPlaylistUrl: (url: string) => set({ playlistUrl: url }),
    setPlaylistFetchFailed: (status: boolean) =>
      set({ playlistFetchFailed: status }),
    playlistFetchLoading: false,
    setPlaylistFetchLoading: (status: boolean) =>
      set({ playlistFetchLoading: status }),
    isLoadingForPlaylistJsonCreation: false,
    setIsLoadingForPlaylistJsonCreation: (s: boolean) =>
      set({ isLoadingForPlaylistJsonCreation: s }),

    fetchHeavyPlaylistInformation: async () => {
      console.log("Playlist information fetch true");
      const playlistStore = get();
      const userInputVideoStore = useUserInputVideoStore.getState();

      // Extract needed store functions and values
      const playlistUrl = playlistStore.playlistUrl;
      const setIsLoadingForJsonCreation =
        playlistStore.setIsLoadingForPlaylistJsonCreation;
      const setVideoInformationFetchFailed =
        playlistStore.setPlaylistFetchFailed;
      const setDialogSectionVisible =
        userInputVideoStore.setDialogSectionVisible;
      const setPlaylistFetchLoading = playlistStore.setPlaylistFetchLoading;
      setPlaylistFetchLoading(true);

      // Set initial loading state
      setIsLoadingForJsonCreation(true);
      setVideoInformationFetchFailed(false);
      setDialogSectionVisible(false);
      playlistStore.setHeavyPlaylistFormatSectionVisible(false);
      // playlistStore.setVideoInformation(null);

      // Create output folder if not exists
      const documentFolder = await documentDir();
      const folderPath = await join(documentFolder, "OSGUI");
      let noError = true;

      console.log("Reached 1");

      try {
        await readDir(folderPath); // throws if not exist
        console.log("Reached 2");
      } catch {
        await mkdir("OSGUI", {
          baseDir: BaseDirectory.Document,
          recursive: true,
        });
        console.log("Reached 3");
      }

      const filePath = await join(folderPath, "playlist.json");
      let jsonOutput = "";
      console.log("Reached 4");

      // Create ytDlp command

      // const command = Command.create("ytDlp", [
      //   "--dump-single-json",
      //   "--yes-playlist",
      //   "--no-warnings",
      //   "--ignore-errors",
      //   playlistUrl,
      // ]);

      const command = Command.create("ytDlp", [
        "--flat-playlist", // ✅ Only IDs/titles, not full video metadata
        "--dump-single-json", // ✅ Return one single JSON object
        "--yes-playlist",
        "--no-warnings",
        "--ignore-errors",
        playlistUrl,
      ]);

      try {
        // Wrap spawn and events in a Promise to await until "close"
        await new Promise<void>((resolve) => {
          command.stdout.on("data", (line) => {
            console.log("Reached 67");
            jsonOutput += line;
            console.log("Data is : ", line);
            // jsonArray.push(JSON.parse(line));
          });
          console.log("Reached 5");

          command.stderr.on("data", (data) => {
            console.log("Reached 6", data);
            noError = false;
            addToast({
              title: "Error occurred on Data Fetch",
              description: data,
              color: "danger",
              timeout: 2000,
            });
          });

          command.on("close", async () => {
            console.log("Reached 7");
            if (noError) {
              console.log("Started json writing");
              // Save the dumped JSON to file
              await writeTextFile(filePath, jsonOutput, {
                baseDir: BaseDirectory.Document,
              });

              // console.log("Json is reading started ->->\n\n\n:", jsonOutput);

              // Read JSON into UI
              console.log("Tyson 78");
              const readHeavyPlaylistJsonFile = get().readHeavyPlaylistJsonFile;
              await readHeavyPlaylistJsonFile();
              console.log("Tyson 89");
            } else {
              console.log("Reached 9");
              setIsLoadingForJsonCreation(false);
              addToast({
                title: "Error occurred on Data Fetch",
                description: "Unsafe JSON output!",
                color: "danger",
                timeout: 2000,
              });
            }
            resolve();
          });

          command.spawn(); // Start command

          console.log("Reached 10");
        });
        console.log("Reached 11");
      } catch (error) {
        console.log("Reached 12");
        // Catch errors outside the command events
        addToast({
          title: "Error saving video info",
          description: "Hell",
          color: "danger",
          timeout: 2000,
        });
        console.error("❌ Error saving video info:", error);

        const playlistStore = get();
        const setPlaylistFetchFailed = playlistStore.setPlaylistFetchFailed;
        setPlaylistFetchFailed(true);

        addToast({
          title: "Error saving video info",
          description: error as string,
          color: "danger",
          timeout: 2000,
        });

        console.log("Reached 31");
      }

      // return null;
    },
    readHeavyPlaylistJsonFile: async () => {
      const heavyPlaylistStore = get();
      const setHeavyPlaylistInformation =
        heavyPlaylistStore.setHeavyPlaylistInformation;
      try {
        console.log("Reached 20");
        const documentFolder = await documentDir();
        const folderPath = await join(documentFolder, "OSGUI");
        const filePath = await join(folderPath, "playlist.json");

        const fileExists = await exists(filePath);
        const playlistStore = get();

        const setHeavyPlaylistFormatSectionVisible =
          playlistStore.setHeavyPlaylistFormatSectionVisible;
        //   const setVideoInformation = playlistStore.setVideoInformation;

        if (!fileExists) {
          console.log("Reached 21");
          addToast({
            title: "playlistMetaData.json not found",
            description: "playlistMetaData.json does not exist at: " + filePath,
            color: "danger",
            timeout: 2000,
          });
          return null;
        }

        console.log("Reached 21");

        const jsonString = await readTextFile(filePath);
        const jsonData = JSON.parse(jsonString);
        setHeavyPlaylistInformation(jsonData);
        setHeavyPlaylistFormatSectionVisible(true);
        //   setVideoInformation(jsonData as VideoInformationInterface);
        console.log("Reached 22");

        console.log("Json is reading started ->->\n\n\n:", jsonData);
      } catch (err) {
        console.log("Reached 23");
        const playlistStore = get();
        const setPlaylistFetchFailed = playlistStore.setPlaylistFetchFailed;
        const setIsLoadingForPlaylistJsonCreation =
          playlistStore.setIsLoadingForPlaylistJsonCreation;

        setPlaylistFetchFailed(true);
        setIsLoadingForPlaylistJsonCreation(false);

        // console.error("Error reading video.json:", err);
        addToast({
          title: "Error reading video.json",
          description: err as string,
          color: "danger",
          timeout: 1000,
        });
        console.log("Reached 24");
      } finally {
        console.log("Reached 25");
        const playlistStore = get();
        const userInputVideoStore = useUserInputVideoStore.getState();

        const setIsLoadingForJsonCreation =
          playlistStore.setIsLoadingForPlaylistJsonCreation;
        const videoInformationFetchFailed = playlistStore.playlistFetchFailed;

        if (!videoInformationFetchFailed) {
          console.log("Reached 26");
          userInputVideoStore.setDialogSectionVisible(true);
          addToast({
            title: "Successful",
            description: "Video successfully fetched!",
            color: "success",
            timeout: 1000,
          });
        } else {
          console.log("Reached 27");
          addToast({
            title: "Error",
            description:
              "Something went wrong, video information fetching failed!",
            color: "danger",
            timeout: 2000,
          });
        }

        console.log("Reached 28");

        setIsLoadingForJsonCreation(false);
        playlistStore.setPlaylistFetchLoading(false);
      }

      console.log("Reached 29");
    },
    heavyPlaylistInformation: null,
    setHeavyPlaylistInformation: (
      hPlaylistInfo: HeavyPlaylistInformationInterface | null
    ) => set({ heavyPlaylistInformation: hPlaylistInfo }),
  })
);
