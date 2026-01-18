export interface DownloadStoreInterface {
  defaultTimeInterval: number;
  setDefaultTimeInterval: (interval: number) => void;
  selectedFormat: string | null;
  setSelectedFormat: (format: string | null) => void;
  selectedAudioStream: string | null;
  setSelectedAudioStream: (format: string | null) => void;
  selectedVideoStream: string | null;
  setSelectedVideoStream: (format: string | null) => void;
  downloadHandler: (
    formatString: string,
    videoUrl: string,
    videoTitle: string,
    directURL?: boolean
  ) => void;
  videoStreamSelect: (vst: string) => void;
  audioStreamSelect: (ast: string) => void;
}
