import { DatabaseInterface } from "@/interfaces/database/DatabaseInterface";
import { create } from "zustand";
import { useUserInputVideoStore } from "./UserInputVideoStore";
import Database from "@tauri-apps/plugin-sql";
import { DownloadListInterface } from "@/interfaces/video/VideoInformationInterface";
import { addToast } from "@heroui/react";
import { getSupabaseClient, isSupabaseEnabled } from "@/lib/SupabaseClient";
import { nanoid } from "nanoid";
import {
  platform,
  hostname,
  locale,
  arch,
  version,
  family,
} from "@tauri-apps/plugin-os";
import {
  getVersion,
  getName,
  getTauriVersion,
  getIdentifier,
} from "@tauri-apps/api/app";

export const useDatabaseStore = create<DatabaseInterface>((set) => ({
  supabaseQueryInsert: async () => {
    try {
      if (!isSupabaseEnabled()) {
        console.info("Supabase not configured, skipping usage analytics");
        return;
      }

      const client = getSupabaseClient();
      if (!client) {
        console.warn("Supabase client not available");
        return;
      }

      const [htnm, lcl, pt, arc, vrsn, fml, vr, nm, tauriV, idf] = await Promise.all([
        hostname(),
        locale(),
        platform(),
        arch(),
        version(),
        family(),
        getVersion(),
        getName(),
        getTauriVersion(),
        getIdentifier(),
      ]);

      const appInformationString = `${nm}_${vr}_${tauriV}_${idf}`;
      const osInformationString = `${htnm}_${lcl}_${pt}_${arc}_${vrsn}_${fml}`;

      const { error } = await client
        .from("UniversalApplicationUsages")
        .insert({
          application: appInformationString,
          architecture: osInformationString,
          rand_str: nanoid(),
        });

      if (error) {
        console.warn("Supabase insert error:", error.message);
      } else {
        console.info("Usage data sent successfully");
      }
    } catch (error) {
      console.warn("Failed to send usage data:", error instanceof Error ? error.message : error);
      
    }
  },
  createOrLoadDatabase: async () => {
    const UserInputVideoStore = useUserInputVideoStore.getState();
    const setDownloadsArr = UserInputVideoStore.setDownloadsArr;
    try {
      const db = await Database.load("sqlite:osgui.db");

      await db.execute(`CREATE TABLE IF NOT EXISTS DownloadList (
        id VARCHAR(255) PRIMARY KEY,
        unique_id VARCHAR(255) NOT NULL,
        active BOOLEAN NOT NULL DEFAULT false,
        failed BOOLEAN NOT NULL DEFAULT false,
        completed BOOLEAN NOT NULL DEFAULT false,
        isPaused BOOLEAN NOT NULL DEFAULT false,
        format_id VARCHAR(255) NOT NULL,
        web_url VARCHAR(255),
        title VARCHAR(255),
        tracking_message TEXT,
        playlistVerification TEXT,
        playlistTitle TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`);

      const allDownloads = (await db.select(
        "SELECT * FROM DownloadList ORDER BY id DESC"
      )) as DownloadListInterface;

      setDownloadsArr(allDownloads);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("Database initialization error:", errorMessage);
      addToast({
        title: "Database Error",
        description: "Failed to initialize local database: " + errorMessage,
        color: "danger",
        timeout: 3000,
      });
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
        title: "Success",
        description: "Download list cleared successfully!",
        color: "success",
        timeout: 2000,
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error clearing downloads:", errorMessage);
      addToast({
        title: "Error",
        description: "Failed to clear download list: " + errorMessage,
        color: "danger",
        timeout: 3000,
      });
    }
  },
  singleFileRemove: async (uniqueId: string) => {
    const db = await Database.load("sqlite:osgui.db");
    const UserInputVideoStore = useUserInputVideoStore.getState();
    const setDownloadsArr = UserInputVideoStore.setDownloadsArr;
    try {
      await db.execute("DELETE FROM DownloadList WHERE unique_id = $1", [
        uniqueId,
      ]);
      const updatedDownloads = (await db.select(
        "SELECT * FROM DownloadList ORDER BY id DESC"
      )) as DownloadListInterface;
      setDownloadsArr(updatedDownloads);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("Error removing file:", errorMessage);
      addToast({
        title: "Error",
        description: "Failed to remove download: " + errorMessage,
        color: "danger",
        timeout: 2000,
      });
    }
  },
}));
