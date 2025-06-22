export interface ApplicationInterface {
  appVersion: string | null;
  setAppVersion: (v: string | null) => void;
  onlineVersion: string | null;
  setOnlineVersion: (ov: string | null) => void;
  isUpdateAvailable: boolean;
  setIsUpdateAvailable: (status: boolean) => void;
  fetchAppVersion: () => void;
  errorOccurredWhileUpdateCheck: boolean;
  seterrorOccurredWhileUpdateCheck: (status: boolean) => void;
  checkedForUpdate: boolean;
  setCheckedForUpdate: (s: boolean) => void;
  ytDlpVersion: string | null;
  setYtdlpVersion: (ytdlv: string | null) => void;
  onlineYtdlpVersion: string | null;
  setOnlineYtdlpversion: (onlineytdlpv: string | null) => void;
}
