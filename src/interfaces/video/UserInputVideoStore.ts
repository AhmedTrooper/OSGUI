export interface UserInputVideoStoreInterface {
  videoUrl: string;
  setVideoUrl: (url: string) => void;
  fetchVideoInformation: () => void;
  videoInformationFetchFailed: boolean;
  setVideoInformationFetchFailed: (status: boolean) => void;
  readJsonFile: () => void;
  isLoadingForJsonCreation: boolean;
  setIsLoadingForJsonCreation: (s: boolean) => void;
  dialogSectionVisible: boolean;
  setDialogSectionVisible: (status: boolean) => void;
  formatSectionVisible: boolean;
  setFormatSectionVisible: (status: boolean) => void;
}
