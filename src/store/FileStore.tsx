import { FileState } from "@/interfaces/file/IFileStore";
import { create } from "zustand";
import { nanoid } from "nanoid";
import { readText } from "@tauri-apps/plugin-clipboard-manager";
import { addToast } from "@heroui/react";

export const useFileStore = create<FileState>((set, get) => ({
  fileUrl: null,
  fileTitle: null,
  setFileUrl: (url: string) => set({ fileUrl: url }),
  setFileTitle: (title: string) => set({ fileTitle: title }),
  pasteFileUrl: async () => {
    try {
      const clipText = await readText();
      get().setFileUrl(clipText);
    } catch (error) {
      addToast({
        title: "Paste fail",
        description: "Paste failed",
        color: "danger",
        timeout: 1000,
      });
    }
  },
  generateFileTitle: async () => {
    console.log("Clicked");
    const FileStore = get();
    const generatedFileTitle = nanoid(15);
    FileStore.setFileTitle(generatedFileTitle);
  },
  pasteFileTitle: async () => {
    try {
      const clipText = await readText();
      get().setFileTitle(clipText);
    } catch (error) {
      addToast({
        title: "Paste fail",
        description: "Paste failed",
        color: "danger",
        timeout: 1000,
      });
    }
  },
}));
