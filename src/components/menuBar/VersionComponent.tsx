import { useApplicationstore } from "@/store/applicationStore";

export default function VersionComponent(){
   const metadataInformation =  useApplicationstore(state=>state.metadataInformation);
   if(!metadataInformation) return null;
    return(<div>
        <div>
            <h1>Application Information</h1>
            <h1>App{metadataInformation.onlineApplicationVersion}</h1>
        </div>
        
    </div>);
}