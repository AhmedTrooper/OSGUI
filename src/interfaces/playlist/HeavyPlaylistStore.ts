import { HeavyPlaylistInformationInterface } from "./PlaylistInformation";

export interface HeavyPlaylistStoreInterface {
  playlistUrl: string;
  setPlaylistUrl: (url: string) => void;
  playlistFetchFailed: boolean;
  setPlaylistFetchFailed: (status: boolean) => void;
  playlistFetchLoading: boolean;
  setPlaylistFetchLoading: (status: boolean) => void;
  readHeavyPlaylistJsonFile: () => Promise<null | undefined>;
  isLoadingForPlaylistJsonCreation: boolean;
  setIsLoadingForPlaylistJsonCreation: (s: boolean) => void;
  heavyPlaylistFormatSectionVisible: boolean;
  setHeavyPlaylistFormatSectionVisible: (status: boolean) => void;
  heavyPlaylistInformation: null | HeavyPlaylistInformationInterface;
  setHeavyPlaylistInformation: (
    vio: HeavyPlaylistInformationInterface | null
  ) => void;
  fetchHeavyPlaylistInformation: () => Promise<void>;
}
