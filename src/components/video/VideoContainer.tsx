import { useUserInputVideoStore } from "@/store/UserInputVideoStore";
import OpenDialogSection from "./OpenDialogSection";
import UserInputSection from "./UserInputSection";

export default function VideoContainer(){
      const dialogSectionVisible =   useUserInputVideoStore(state=>state.dialogSectionVisible);

    return(<div className="video-container">
        <UserInputSection/>
      { dialogSectionVisible &&  <OpenDialogSection/>}
    </div>);
}