import { useApplicationstore } from "@/store/applicationStore";
import YtDlp from "./YtDlp";

export default function FooterBase() {
      const ytDlpVersion = useApplicationstore(state=>state.ytDlpVersion);
  
  return (
    <div className="w-full grid bg-blue-600 dark:bg-transparent text-white p-2 text-center">
      {ytDlpVersion && <YtDlp/>}
    </div>
  );
}
