export interface FileState {
  fileUrl: string | null;
  fileTitle: string | null;
  pasteFileUrl: () => Promise<void>;
  generateFileTitle: () => Promise<void>;
  setFileUrl: (url: string) => void;
  setFileTitle: (title: string) => void;
  pasteFileTitle: () => Promise<void>;
}
