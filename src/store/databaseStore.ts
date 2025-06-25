import { DatabaseInterface } from "@/interfaces/database/Database";
import { create } from "zustand";
import { useUserInputVideoStore } from "./UserInputVideoStore";
import Database from "@tauri-apps/plugin-sql";
import { DownloadListInterface } from "@/interfaces/video/VideoInformation";

export const useDatabaseStore = create<DatabaseInterface>((set) => ({
  createOrLoadDatabase: async () => {
    const UserInputVideoStore = useUserInputVideoStore.getState();
    const setDownloadsArr = UserInputVideoStore.setDownloadsArr;
    try {
      console.log("Database called");
      const db = await Database.load("sqlite:osgui.db");

      await db.execute(`CREATE TABLE IF NOT EXISTS DownloadList (
  id VARCHAR(255) PRIMARY KEY,
  unique_id VARCHAR(255) NOT NULL,
  active BOOLEAN NOT NULL,
  failed BOOLEAN NOT NULL,
  completed BOOLEAN NOT NULL,
  format_id VARCHAR(255) NOT NULL,
  web_url VARCHAR(255),
  title VARCHAR(255)
);`);

      const allDownloads = (await db.select(
        "SELECT * FROM DownloadList"
      )) as DownloadListInterface;
      console.log("<------Download List------->\n\n\n\n\n\n");
      console.log(allDownloads);
      console.log("\n\n\n\n\n\n<------Hell------->\n\n");
      setDownloadsArr(await allDownloads);
    } catch (err) {
      console.log("Database error", err);
    }
  },
  databaseLoaded: false,
  setDatabaseLoaded: (status: boolean) => set({ databaseLoaded: status }),
}));
