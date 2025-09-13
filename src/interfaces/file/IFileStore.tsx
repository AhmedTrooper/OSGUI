export interface FileState {
  fileUrl: string | null;
  fileTitle: string | null;
  pasteFileUrl: () => Promise<void>;
  generateFileTitle: () => Promise<void>;
  setFileUrl: (url: string | null) => void;
  setFileTitle: (title: string | null) => void;
  pasteFileTitle: () => Promise<void>;
  resetFileUrl: () => void;
  resetFileTitle: () => void;
}
