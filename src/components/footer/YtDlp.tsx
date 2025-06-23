import { useApplicationstore } from "@/store/applicationStore";

export default function YtDlp(){
    const ytDlpVersion = useApplicationstore(state=>state.ytDlpVersion);
    return(<div className="grid">
        <h1>{ytDlpVersion}</h1>
    </div>);
}