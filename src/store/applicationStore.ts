import { ApplicationInterface } from "@/interfaces/application/ApplicationInterface";
import { create } from "zustand";
import { getVersion } from "@tauri-apps/api/app";
import { Command } from "@tauri-apps/plugin-shell";

export const useApplicationstore = create<ApplicationInterface>((set, get) => ({
  appVersion: null,
  setAppVersion: (v: string | null) => set({ appVersion: v }),
  onlineVersion: null,
  setOnlineVersion: (ov: string | null) => set({ onlineVersion: ov }),
  isApplicationUpdateAvailable: false,
  setIsApplicationUpdateAvailable: (status: boolean) =>
    set({ isApplicationUpdateAvailable: status }),
  errorOccurredWhileApplicationUpdateCheck: false,
  setErrorOccurredWhileApplicationUpdateCheck: (status: boolean) =>
    set({ errorOccurredWhileApplicationUpdateCheck: status }),
  checkedForApplicationUpdate: false,
  setCheckedForApplicationUpdate: (s: boolean) =>
    set({ checkedForApplicationUpdate: s }),
  ytDlpVersion: null,
  setYtdlpVersion: (ytdlv: string | null) => set({ ytDlpVersion: ytdlv }),
  onlineYtdlpVersion: null,
  setOnlineYtdlpversion: (onlineytdlpv: string | null) =>
    set({ onlineYtdlpVersion: onlineytdlpv }),
  checkedForYtdlpUpdate: false,
  setCheckedForYtdlpUpdate: (s: boolean) => set({ checkedForYtdlpUpdate: s }),
  errorOccurredWhileYtdlpUpdateCheck: false,
  setErrorOccurredWhileYtdlpUpdateCheck: (status: boolean) =>
    set({ errorOccurredWhileYtdlpUpdateCheck: status }),
  fetchAppVersion: async () => {
    const applicationStore = get();
    try {
      let currentVersion = await getVersion();
      applicationStore.setAppVersion(currentVersion);
      let response = await fetch(applicationStore.applicationOnlineUrl);
      let data = await response.json();
      console.log(data);
    } catch (error) {
      console.log("Version fething Error!", error);
    } finally {
    }
  },
  fetchYtdlpVersion: async () => {
    const ApplicationStore = get();
    const setYtdlpVersion = ApplicationStore.setYtdlpVersion;
    try {
      const cmd = Command.create("ytDlp", ["--version"]);
      const result = await cmd.execute();
      setYtdlpVersion(result.stdout.trim());
    } catch (error) {
      console.log("Ytdl version faild");
    }
  },
  applicationOnlineUrl:"",
  ytdlpOnlineUrl:"",
}));
