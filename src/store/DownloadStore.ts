import { DownloadStoreInterface } from "@/interfaces/video/DownloadStoreInterface";
import { downloadDir } from "@tauri-apps/api/path";
import { Command } from "@tauri-apps/plugin-shell";
import { create } from "zustand";
import { nanoid } from "nanoid";
import Database from "@tauri-apps/plugin-sql";
import { useUserInputVideoStore } from "./UserInputVideoStore";
// import { useUtilityStore } from "./UtilityStore";
// import {
//   failStatusObject,
//   pauseStatus,
// } from "@/interfaces/video/VideoInformationInterface";
import { addToast } from "@heroui/react";
// import { add } from "lodash";

export const useDownloadStore = create<DownloadStoreInterface>((set, get) => ({
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
    // const utilityStore = useUtilityStore.getState();
    // const parseBoolean = utilityStore.parseBoolean;
    let errorHappened = false;
    let isPaused = false;
    try {
      const db = await Database.load("sqlite:osgui.db");
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

      // const ytdlpWithAria2 = Command.create("ytDlp", [
      //   "--external-downloader",
      //   "aria2c",
      //   "--external-downloader-args",
      //   "-x 16 -s 16 -k 1M",
      //   "-o",
      //   `${downloadDirectory}/OSGUI/%(title)s${formatString}.%(ext)s`,
      //   `${videoUrl}`,
      // ]);

      // // aria2 for direct file download
      // const onlyAria2 = Command.create("aria2c", [
      //   "-x",
      //   "16",
      //   "-s",
      //   "16",
      //   "-k",
      //   "1M",
      //   "-d",
      //   `${downloadDirectory}/OSGUI`,
      //   `${videoUrl}`,
      // ]);

      if (directURL) {
        coreDownloadCommand = directFileDownloadCommand;
      }
      // coreDownloadCommand = ytdlpWithAria2;
      // coreDownloadCommand = onlyAria2;

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

      // let streamCount = 0;
      /*A counter to track check if event occurs even after child is killed at paused stage
      Result : yes as kill is promiss based and the event loop still has the listeners 
      active until promises are resolved.
      */

      // Data catching on spawn

      const errorHandler = async () => {
        //dummy use to avoid lint error
        isPaused = false;
        errorHappened = true;
        // console.log("Error while downloading:", data);
        // console.log("Stream count at Error handler stage :", streamCount);
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
          // console.log("Error while updating download list:", error);
        } finally {
          setDownloadsArr(
            await db.select("SELECT * FROM DownloadList ORDER BY id DESC")
          );
          isPaused = false;
          errorHappened = true;
          //  await childDataProcess.kill();
          // console.log(
          //   "At Error stage :",
          //   "Paused :",
          //   isPaused,
          //   "Error occurred :",
          //   errorHappened
          // );
        }
      };

      /*
      New feature unlocked!
      1.if the internet is gone during download,the data event keeps running,
      so file download is not paused!
      */

      const dataHandler = async (data: string) => {
        // console.log("Stream count at data handler stage :", ++streamCount);

        // console.log(videoToPause, uniqueId, videoToPause === uniqueId);
        // console.log(
        //   "\n\n\n\nStd data start\n\n\n",
        //   data,
        //   "\n\n\nstd end\n\n\n"
        // );

        //   // Remove the listener immediately
        //   console.log("Starting remove the listner");
        //  coreDownloadCommand.stdout.removeListener("data", dataHandler);
        //   coreDownloadCommand.stderr.removeListener("data", errorHandler);
        //   // console.log("\n".repeat(20), x, "\n".repeat(20));
        //   console.log("Done remove the listner");

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
          // console.log("Error while updating download list:", error);
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
          // console.log("Pausing download for id:", uniqueId);
          // useUserInputVideoStore.getState().setVideoToPause(null); //as child.kill() is async,new event are still coming,so id being not null can be used to identify the video to be paused!
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
            // console.log(e);
          } finally {
            setDownloadsArr(
              await db.select("SELECT * FROM DownloadList ORDER BY id DESC")
            );
            // console.log(
            //   "At Paused stage :",
            //   "Paused :",
            //   isPaused,
            //   "Error occurred : ",
            //   errorHappened
            // );
            // console.log(
            //   await db.select("SELECT * FROM DownloadList where unique_id=$1", [
            //     uniqueId,
            //   ])
            // );

            // console.log(
            //   "Stream count at data handler pause stage :",
            //   streamCount
            // );
            await childDataProcess.kill();
            // Return keyword did not work to stop stream as data  stream was active in yt-dlp...
          }
        }

        // console.log("Called even after listner gone");
      };

      coreDownloadCommand.stdout.on("data", dataHandler);

      //   Command error

      coreDownloadCommand.stderr.on("data", errorHandler);

      coreDownloadCommand.on("close", async () => {
        // console.log(
        //   "At Close stage :",
        //   "Pause :",
        //   isPaused,
        //   "Error :",
        //   errorHappened
        // );
        // console.log("Stream count at command close stage :", streamCount);

        try {
          if (!(isPaused || errorHappened)) {
            try {
              // console.log(
              //   "At NoPause,NoError stage :",
              //   isPaused,
              //   errorHappened
              // );
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
          setDownloadsArr(
            await db.select("SELECT * FROM DownloadList ORDER BY id DESC")
          );
          // console.log(
          //   await db.select("SELECT * FROM DownloadList ORDER BY id DESC")
          // );
        }
      });

      coreDownloadCommand.on("error", () => {
        // console.log("Command Error : ---> ", data);
        addToast({
          title: "Command Failed",
          description: "Make sure yt-dlp is installed and added to PATH",
          color: "warning",
          timeout: 2000,
        });
      });
    } catch (e) {}
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
        // console.log("Video stream not found");
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
