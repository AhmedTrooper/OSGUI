export interface DownloadStoreInterface {
  selectedBestFormat: string | null;
  setSelectedBestFormat: (format: string | null) => void;
  selectedAudioStream: string | null;
  setSelectedAudioStream: (format: string | null) => void;
  selectedVideoStream: string | null;
  setSelectedVideoStream: (format: string | null) => void;
  downloadBestFormat: (bestFormat: string, videoUrl: string,videoTitle:string) => void;
}
