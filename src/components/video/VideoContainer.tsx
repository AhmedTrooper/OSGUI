import { useUserInputVideoStore } from "@/store/UserInputVideoStore";
import OpenDialogSection from "./OpenDialogSection";
import UserInputSection from "./UserInputSection";
import FormatSection from "./FormatSection";
import DownloadSection from "./DownloadSection";

export default function VideoContainer() {
  const dialogSectionVisible = useUserInputVideoStore(
    (state) => state.dialogSectionVisible
  );
  const formatSectionVisible = useUserInputVideoStore(
    (state) => state.formatSectionVisible
  );

  return (
    <div className="video-container">
      <UserInputSection />
      {dialogSectionVisible && <OpenDialogSection />}
      {formatSectionVisible && <FormatSection />}
      <DownloadSection />
    </div>
  );
}
