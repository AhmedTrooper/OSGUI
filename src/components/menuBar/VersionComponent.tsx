import { useApplicationstore } from "@/store/applicationStore";
import { Button } from "@heroui/react";

export default function VersionComponent(){
   const metadataInformation =  useApplicationstore(state=>state.metadataInformation);
   const isYtdlpUpdateAvailable =  useApplicationstore(state=>state.isYtdlpUpdateAvailable);
    const ytDlpVersion = useApplicationstore(state=>state.ytDlpVersion);
   if(!metadataInformation) return null;
    return(<div className="grid w-96">
        <div className="m-2 p-4 shadow-md shadow-black rounded-md">
            <h1>Application Information</h1>
            <h1>App{metadataInformation.onlineApplicationVersion}</h1>
            <h1>Yt-Dlp : {metadataInformation.onlineYtDlpVersion}</h1>
        </div>

        {isYtdlpUpdateAvailable && <div className="m-2 p-4 shadow-md shadow-black rounded-md">
            <h1>Yt-Dlp new ersion available</h1>
            <h1 className="text-red-600 font-bold">Current : {ytDlpVersion}</h1>
            <h1>Available : <span  className="text-green-600 font-bold">{metadataInformation.onlineYtDlpVersion}</span></h1>
            <a target="_blank" href={metadataInformation.ytdlpUrl}>Click me</a>
            </div>
            }
        
    </div>);
}