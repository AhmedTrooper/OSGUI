import { DownloadStoreInterface } from "@/interfaces/video/DownloadStore";
import { videoDir } from "@tauri-apps/api/path";
import { Command } from "@tauri-apps/plugin-shell";
import { create } from "zustand";
import { nanoid } from "nanoid";
import Database from "@tauri-apps/plugin-sql";
import { useUserInputVideoStore } from "./UserInputVideoStore";

export const useDownloadStore = create<DownloadStoreInterface>((set) => ({
  selectedBestFormat: null,
  setSelectedBestFormat: (format: string | null) =>
    set({ selectedBestFormat: format }),
  selectedAudioStream: null,
  setSelectedAudioStream: (format: string | null) =>
    set({ selectedAudioStream: format }),
  selectedVideoStream: null,
  setSelectedVideoStream: (format: string | null) =>
    set({ selectedVideoStream: format }),
  downloadBestFormat: async (
    bestFormat: string,
    videoUrl: string,
    videoTitle: string
  ) => {
    try {
      console.log("Selected Formats is :", bestFormat);
      const videoDirectory = await videoDir();
      const uniqueId = nanoid(20);
      const mainId = nanoid(25);
      console.log(uniqueId);
      const userInputVideoStore = useUserInputVideoStore.getState();
      const setDownloadsArr = userInputVideoStore.setDownloadsArr;
      const db = await Database.load("sqlite:osgui.db");
      const bestVideoDownloadCommand = Command.create("ytDlp", [
        "-f",
        bestFormat,
        "-o",
        `${videoDirectory}/OSGUI/%(title)s${bestFormat}.%(ext)s`,
        `${videoUrl}`,
      ]);

      await bestVideoDownloadCommand.spawn();

      await db.execute(
        `DELETE FROM DownloadList
   WHERE format_id = $1 AND web_url = $2`,
        [bestFormat.trim(), videoUrl]
      );

      await db.execute(
        `INSERT INTO DownloadList (
    id, unique_id, active, failed, completed, format_id, web_url, title, tracking_message
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          mainId,
          uniqueId,
          true,
          false,
          false,
          bestFormat,
          videoUrl,
          videoTitle,
          "Retrieving download info",
        ]
      );
      setDownloadsArr(await db.select("SELECT * FROM DownloadList"));

      bestVideoDownloadCommand.stdout.on("data", async (data) => {
        console.log(
          "\n\n\n\nStd data start\n\n\n",
          data,
          "\n\n\nstd end\n\n\n"
        );

        //  await db.execute(
        //   "UPDATE DownloadList SET downloadTrackingMessage = $1 WHERE unique_id = $2",
        //   [data.toString().trim(), uniqueId]
        // );
        await db.execute(
          `UPDATE DownloadList
       SET failed = false,
           tracking_message = $1
       WHERE unique_id = $2`,
          [data.toString().trim(), uniqueId]
        );
        setDownloadsArr(await db.select("SELECT * FROM DownloadList"));
      });

      //   Coomand error

      bestVideoDownloadCommand.stderr.on("data", async (data) => {
        console.log("Error while downloading:", data);

        await db.execute(
          `UPDATE DownloadList
       SET failed = true,
           tracking_message = $1
       WHERE unique_id = $2`,
          [data.toString().trim(), uniqueId]
        );
      });

      bestVideoDownloadCommand.on("close", (data) => {
        console.log("Command closed", data);
      });
      bestVideoDownloadCommand.on("error", (data) => {
        console.log("Command Error", data);
      });
    } catch (e) {
    } finally {
      console.log("Command is finished!");
    }
  },
}));
