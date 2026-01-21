import { DownloadStoreInterface } from "@/interfaces/video/DownloadStoreInterface";
import { downloadDir } from "@tauri-apps/api/path";
import { Command } from "@tauri-apps/plugin-shell";
import { create } from "zustand";
import { nanoid } from "nanoid";
import Database from "@tauri-apps/plugin-sql";
import { useUserInputVideoStore } from "./UserInputVideoStore";
import { addToast } from "@heroui/react";

export const useDownloadStore = create<DownloadStoreInterface>((set, get) => ({
  defaultTimeInterval: localStorage.getItem("getTimeInterval")
    ? Number(localStorage.getItem("getTimeInterval"))
    : 1000,
  setDefaultTimeInterval: (interval: number) => {
    localStorage.setItem("getTimeInterval", interval.toString());
    set({ defaultTimeInterval: interval });
  },
  selectedFormat: null,
  setSelectedFormat: (format: string | null) => set({ selectedFormat: format }),
  selectedAudioStream: null,
  setSelectedAudioStream: (format: string | null) =>
    set({ selectedAudioStream: format }),
  selectedVideoStream: null,
  setSelectedVideoStream: (format: string | null) =>
    set({ selectedVideoStream: format }),

  downloadHandler: async (
    formatString: string,
    videoUrl: string,
    videoTitle: string,
    directURL: boolean = false
  ) => {
    const downloadDirectory = await downloadDir();
    const now = new Date();
    const timestampMs = now.getTime();
    const uniqueId = nanoid(20);
    const mainId = timestampMs + nanoid(25);

    const userInputVideoStore = useUserInputVideoStore.getState();
    const setDownloadsArr = userInputVideoStore.setDownloadsArr;
    const downloadStore = get();
    const timeInterval = downloadStore.defaultTimeInterval;
    // const utilityStore = useUtilityStore.getState();
    // const parseBoolean = utilityStore.parseBoolean;
    let errorHappened = false;
    let isPaused = false;
    let intervalId: NodeJS.Timeout;
    try {
      const db = await Database.load("sqlite:osgui.db");
      intervalId = setInterval(async () => {
        setDownloadsArr(
          await db.select("SELECT * FROM DownloadList ORDER BY id DESC")
        );
      }, timeInterval);
      addToast({
        title: "Added",
        description: "File added to download list",
        color: "success",
        timeout: 400,
      });
      let coreDownloadCommand = Command.create("ytDlp", [
        "-f",
        formatString,
        "-o",
        `${downloadDirectory}/OSGUI/%(title)s${formatString}.%(ext)s`,
        `${videoUrl}`,
      ]);
      const directFileDownloadCommand = Command.create("ytDlp", [
        "-o",
        `${downloadDirectory}/OSGUI/%(title)s${formatString}.%(ext)s`,
        `${videoUrl}`,
      ]);

      if (directURL) {
        coreDownloadCommand = directFileDownloadCommand;
      }

      const childDataProcess = await coreDownloadCommand.spawn();

      await db.execute(
        `DELETE FROM DownloadList
   WHERE format_id = $1 AND web_url = $2`,
        [formatString.trim(), videoUrl]
      );

      await db.execute(
        `INSERT INTO DownloadList (
    id, unique_id, active, failed, completed, format_id, web_url, title, tracking_message,isPaused
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          mainId,
          uniqueId,
          true,
          false,
          false,
          formatString,
          videoUrl,
          videoTitle,
          "Retrieving download info",
          false,
        ]
      );
      // setDownloadsArr(await db.select("SELECT * FROM DownloadList"));
      setDownloadsArr(
        await db.select("SELECT * FROM DownloadList ORDER BY id DESC")
      );

      const errorHandler = async () => {
        //dummy use to avoid lint error
        isPaused = false;
        errorHappened = true;
        try {
          await db.execute(
            `UPDATE DownloadList
       SET failed = true,
             active = false,
            isPaused = false,
            completed = false,
           tracking_message = $1
       WHERE unique_id = $2`,
            ["Error occurred!", uniqueId]
          );
        } catch (error) {
        } finally {
          setDownloadsArr(
            await db.select("SELECT * FROM DownloadList ORDER BY id DESC")
          );
          isPaused = false;
          errorHappened = true;
        }
      };

      const dataHandler = async (data: string) => {
        try {
          await db.execute(
            `UPDATE DownloadList
       SET failed = false,
           isPaused = false,
           active = true,
           completed = false,
           tracking_message = $1
       WHERE unique_id = $2`,
            [data.toString().trim(), uniqueId]
          );
        } catch (error) {
        } finally {
          setDownloadsArr(
            await db.select("SELECT * FROM DownloadList ORDER BY id DESC")
          );
          errorHappened = false;
          isPaused = false;
        }

        const videoToPause = useUserInputVideoStore.getState().videoToPause;
        if (videoToPause === uniqueId) {
          isPaused = true;
          errorHappened = false;
          try {
            await db.execute(
              `UPDATE DownloadList 
              SET active = false,
              isPaused = true,
              completed = false,
              tracking_message = "Paused by user"
              WHERE unique_id = $1`,
              [uniqueId]
            );
          } catch (e) {
          } finally {
            setDownloadsArr(
              await db.select("SELECT * FROM DownloadList ORDER BY id DESC")
            );
            await childDataProcess.kill();
          }
        }
      };

      coreDownloadCommand.stdout.on("data", dataHandler);

      coreDownloadCommand.stderr.on("data", errorHandler);

      coreDownloadCommand.on("close", async () => {
        try {
          if (!(isPaused || errorHappened)) {
            try {
              await db.execute(
                `UPDATE DownloadList
           SET failed = false,
                 active = false,
                isPaused = false,
                completed = true,
               tracking_message = $1
           WHERE unique_id = $2`,
                ["Download completed successfully!", uniqueId]
              );
            } catch (error) {
              // console.log("Error while updating download list:", error);
            } finally {
              setDownloadsArr(
                await db.select("SELECT * FROM DownloadList ORDER BY id DESC")
              );
            }
          } else if (isPaused) {
            // console.log("At Paused stage on close :", isPaused, errorHappened);
            try {
              await db.execute(
                `UPDATE DownloadList
           SET failed = false,
                 active = false,
                isPaused = true,
                completed = false,
               tracking_message = $1
           WHERE unique_id = $2`,
                ["Download paused by user", uniqueId]
              );
            } catch (error) {
              // console.log("Error while updating download list:", error);
            } finally {
              setDownloadsArr(
                await db.select("SELECT * FROM DownloadList ORDER BY id DESC")
              );
            }
          } else if (errorHappened) {
            // console.log("At Error stage on close :", isPaused, errorHappened);
            try {
              await db.execute(
                `UPDATE DownloadList
           SET failed = true,
                 active = false,
                isPaused = false,
                completed = false,
               tracking_message = $1
           WHERE unique_id = $2`,
                ["Download failed", uniqueId]
              );
            } catch (error) {
              // console.log("Error while updating download list:", error);
            } finally {
              setDownloadsArr(
                await db.select("SELECT * FROM DownloadList ORDER BY id DESC")
              );
            }
          }
        } catch (error) {
          // console.log("Error while updating download list on close:", error);
        } finally {
          clearInterval(intervalId);
          setDownloadsArr(
            await db.select("SELECT * FROM DownloadList ORDER BY id DESC")
          );
        }
      });

      coreDownloadCommand.on("error", () => {
        addToast({
          title: "Command Failed",
          description: "Make sure yt-dlp is installed and added to PATH",
          color: "warning",
          timeout: 2000,
        });
      });
    } catch (e) { }
  },
  videoStreamSelect: (vst: string) => {
    const downloadStore = get();
    const selectedAudioStream = downloadStore.selectedAudioStream;
    const setSelectedFormat = downloadStore.setSelectedFormat;
    const setSelectedVideoStream = downloadStore.setSelectedVideoStream;
    try {
      setSelectedVideoStream(vst);
      if (selectedAudioStream) {
        let formatString = `${vst.trim()}+${selectedAudioStream.trim()}`.trim();
        setSelectedFormat(formatString);
      } else {
        setSelectedFormat(vst.trim());
      }
    } catch (error) {
      addToast({
        title: "Failed",
        description: "Video stream selection failed!",
        color: "warning",
        timeout: 1000,
      });
    }
  },
  audioStreamSelect: (ast: string) => {
    const downloadStore = get();
    const selectedVideoStream = downloadStore.selectedVideoStream;
    const setSelectedAudioStream = downloadStore.setSelectedAudioStream;
    const setSelectedFormat = downloadStore.setSelectedFormat;
    try {
      setSelectedAudioStream(ast.trim());
      if (selectedVideoStream) {
        let formatString = `${selectedVideoStream.trim()}+${ast.trim()}`.trim();
        setSelectedFormat(formatString);
      } else {
        setSelectedFormat(ast.trim());
      }
    } catch (error) {
      addToast({
        title: "Failed",
        description: "Video stream selection failed!",
        color: "warning",
        timeout: 1000,
      });
    }
  },
}));
