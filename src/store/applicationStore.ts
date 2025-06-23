import { ApplicationInterface } from "@/interfaces/ApplicationInterface";
import { create } from "zustand";
import { getVersion } from "@tauri-apps/api/app";
import { Command } from '@tauri-apps/plugin-shell';

export const useApplicationstore = create<ApplicationInterface>((set,get) => ({
  appVersion: null,
  setAppVersion: (v: string | null) => set({ appVersion: v }),
  onlineVersion: null,
  setOnlineVersion: (ov: string | null) => set({ onlineVersion: ov }),
  isUpdateAvailable: false,
  setIsUpdateAvailable: (status: boolean) => set({ isUpdateAvailable: status }),
  errorOccurredWhileUpdateCheck: false,
  seterrorOccurredWhileUpdateCheck: (status: boolean) =>
    set({ errorOccurredWhileUpdateCheck: status }),
  checkedForUpdate: false,
  setCheckedForUpdate: (s: boolean) => set({ checkedForUpdate: s }),
  ytDlpVersion: null,
  setYtdlpVersion: (ytdlv: string | null) => set({ ytDlpVersion: ytdlv }),
  onlineYtdlpVersion: null,
  setOnlineYtdlpversion: (onlineytdlpv: string | null) =>
    set({ onlineYtdlpVersion: onlineytdlpv }),
  fetchAppVersion: async () => {
    try {
      let currentVersion = await getVersion();
      console.log(currentVersion);
    } catch (error) {
      console.log("Version fething Error!", error);
    } finally {
    }
  },
  fetchYtdlpVersion: async () => {
    const ApplicationStore = get();
    const setYtdlpVersion = ApplicationStore.setYtdlpVersion;
    try{
    const cmd =  Command.create("ytDlp",["--version"]);
    const result = await cmd.execute();
    setYtdlpVersion(result.stdout.trim());
    } catch(error){
      console.log("Ytdl version faild");
    }
  },
}));
