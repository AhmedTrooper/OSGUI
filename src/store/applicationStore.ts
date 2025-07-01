import { ApplicationInterface } from "@/interfaces/application/ApplicationInterface";
import { create } from "zustand";
import { getVersion } from "@tauri-apps/api/app";
import { Command } from "@tauri-apps/plugin-shell";
import { MetadataInterface } from "@/interfaces/application/MetaData";
import { addToast } from "@heroui/react";

export const useApplicationstore = create<ApplicationInterface>((set, get) => ({
  isYtdlpUpdateAvailable: false,
  setIsYtdlpUpdateAvailable: (status: boolean) =>
    set({ isYtdlpUpdateAvailable: status }),
  metadataInformation: null,
  setMetadataInformation: (metadata: null | MetadataInterface) =>
    set({ metadataInformation: metadata }),
  metadataUrl:
    "https://raw.githubusercontent.com/AhmedTrooper/OSGUI/main/update/metadata.json",
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
    // try {
    //   let currentVersion = await getVersion();
    //   applicationStore.setAppVersion(currentVersion);
    //   let response = await fetch(applicationStore.metadataUrl);
    //   let data = await response.;
    //   console.log("Application Version", data);
    // } catch (error) {
    //   console.log("Application Version fething Error!", error);
    // } finally {
    // }
  },
  fetchYtdlpVersion: async () => {
    const ApplicationStore = get();
    const setYtdlpVersion = ApplicationStore.setYtdlpVersion;
    ApplicationStore.setOnlineYtdlpversion;
    let localYtdlp: string | null = null;
    let onlineYtdlp: string | null = null;
    try {
      console.log("Yt-dlp is started fetching!");
      const cmd = Command.create("ytDlp", ["--version"]);
      const result = await cmd.execute();
      const response = await fetch(ApplicationStore.metadataUrl);
      console.log(response);
      if (response.status === 200) {
        const data = (await response.json()) as MetadataInterface;
        console.log(data);
        ApplicationStore.setMetadataInformation(data);
        ApplicationStore.setOnlineYtdlpversion(data.onlineYtDlpVersion);
        onlineYtdlp = data.onlineYtDlpVersion;
      }
      setYtdlpVersion(result.stdout.trim());
      localYtdlp = result.stdout.trim();
      ApplicationStore.setYtdlpVersion(result.stdout.trim());
    } catch (error) {
      console.log("Ytdl version faild");
    } finally {
      if (localYtdlp && onlineYtdlp && localYtdlp < onlineYtdlp) {
        ApplicationStore.setIsYtdlpUpdateAvailable(true);
        addToast({
          title: "Yt-dlp update available",
          description: `Online: ${onlineYtdlp}, Local: ${localYtdlp}`,
          color: "danger",
          timeout: 3000,
        });
      } else {
        addToast({
          title: "Yt-dlp update available",
          description: `Online: ${onlineYtdlp}, Local: ${localYtdlp}`,
          color: "success",
          timeout: 3000,
        });
      }
    }
  },
  applicationOnlineUrl: "",
  ytdlpOnlineUrl: "",
}));
