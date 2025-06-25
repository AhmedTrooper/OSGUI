import { DatabaseInterface } from "@/interfaces/database/Database";
import { create } from "zustand";
import { useUserInputVideoStore } from "./UserInputVideoStore";
import Database from "@tauri-apps/plugin-sql";
import { DownloadListInterface } from "@/interfaces/video/VideoInformation";
import { addToast } from "@heroui/react";

export const useDatabaseStore = create<DatabaseInterface>((set) => ({
  createOrLoadDatabase: async () => {
    const UserInputVideoStore = useUserInputVideoStore.getState();
    const setDownloadsArr = UserInputVideoStore.setDownloadsArr;
    try {
      const db = await Database.load("sqlite:osgui.db");

      await db.execute(`CREATE TABLE IF NOT EXISTS DownloadList (
  id VARCHAR(255) PRIMARY KEY,
  unique_id VARCHAR(255) NOT NULL,
  active BOOLEAN NOT NULL,
  failed BOOLEAN NOT NULL,
  completed BOOLEAN NOT NULL,
  format_id VARCHAR(255) NOT NULL,
  web_url VARCHAR(255),
  title VARCHAR(255),
  tracking_message TEXT
);`);

      const allDownloads = (await db.select(
        "SELECT * FROM DownloadList"
      )) as DownloadListInterface;

      setDownloadsArr(await allDownloads);
    } catch (err) {
      console.log("Database error", err);
    }
  },
  databaseLoaded: false,
  setDatabaseLoaded: (status: boolean) => set({ databaseLoaded: status }),
  emptyDatabase: async () => {
    const UserInputVideoStore = useUserInputVideoStore.getState();
    const setDownloadsArr = UserInputVideoStore.setDownloadsArr;
    try {
      const db = await Database.load("sqlite:osgui.db");
      await db.execute("DELETE FROM DownloadList;");
      setDownloadsArr([]);
       addToast({
            title: "Successfull",
            description: "Download list is empty!",
            color: "success",
            timeout: 2000,
          });
    } catch (e) {
      console.log("Error on Downloads clear", e);
       addToast({
            title: "Error",
            description: "Error on Downloads clear",
            color: "danger",
            timeout: 2000,
          });
    }
  },
}));
