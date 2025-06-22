import { ApplicationInterface } from "@/interfaces/ApplicationInterface";
import { create } from "zustand";
import { getVersion } from "@tauri-apps/api/app";

export const useApplicationstore = create<ApplicationInterface>((set) => ({
  appVersion: null,
  setAppVersion: (v: string | null) => set({ appVersion: v }),
  onlineVersion: null,
  setOnlineVersion: (ov: string | null) => set({ onlineVersion: ov }),
  isUpdateAvailable: false,
  setIsUpdateAvailable: (status: boolean) => set({ isUpdateAvailable: status }),
  errorOccurredWhileUpdateCheck: false,
  seterrorOccurredWhileUpdateCheck: (status: boolean) =>
    set({ errorOccurredWhileUpdateCheck: status }),
  checkedForUpdate:false,
  setCheckedForUpdate:(s:boolean)=>set({checkedForUpdate:s}),
  fetchAppVersion: async () => {
    try {
      let currentVersion = await getVersion();
      console.log(currentVersion);
    } catch (error) {
      console.log("Version fething Error!", error);
    } finally {
    }
  },
}));
