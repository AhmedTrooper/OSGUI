import { FileState } from "@/interfaces/file/IFileStore";
import { create } from "zustand";
import { nanoid } from "nanoid";

export const useFileStore = create<FileState>((set, get) => ({
  fileUrl: null,
  fileTitle: null,
  setFileUrl: (url: string) => set({ fileUrl: url }),
  setFileTitle: (title: string) => set({ fileTitle: title }),
  pasteFileUrl: async () => {
    try {
    } catch (error) {
      console.error("Failed to paste file URL:", error);
    }
  },
  generateFileTitle: async () => {
    console.log("Clicked");
    const FileStore = get();
    const generatedFileTitle = nanoid(15);
    FileStore.setFileTitle(generatedFileTitle);
  },
}));
