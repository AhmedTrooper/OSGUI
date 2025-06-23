import { useEffect } from "react";
import "./App.css";
import MenuBar from "./components/menuBar/MenuBar";
import useThemeStore from "./store/themeStore";
import { Outlet } from "react-router-dom";
import useOsInfoStore from "./store/osInfoStore";
import FooterBase from "./components/footer/FooterBase";
import { useApplicationstore } from "./store/applicationStore";

function App() {
  const dark = useThemeStore((state) => state.dark);
  const setDark = useThemeStore((state) => state.setDark);
  const detectOS = useOsInfoStore((state) => state.detectMobileOS);
  const isMobileOS = useOsInfoStore((state) => state.isMobileOS);
  const checkedForUpdate = useApplicationstore(
    (state) => state.checkedForUpdate
  );
  const fetchAppVersion = useApplicationstore((state) => state.fetchAppVersion);
  const setCheckedForUpdate = useApplicationstore(
    (state) => state.setCheckedForUpdate
  );

  const errorOccurredWhileUpdateCheck = useApplicationstore(
    (state) => state.errorOccurredWhileUpdateCheck
  );
  const setThemeData = useThemeStore((state) => state.setThemeData);
  const fetchYtdlpVersion = useApplicationstore(state=>state.fetchYtdlpVersion);

  useEffect(() => {
    detectOS();
  });

  useEffect(() => {
    setThemeData();
  }, [setDark]);

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  useEffect(() => {
    if (!checkedForUpdate || errorOccurredWhileUpdateCheck) {
      fetchAppVersion();
      setCheckedForUpdate(true);
    }
  }, []);

  useEffect(()=>{
    fetchYtdlpVersion();
  })

  return (
    <div className="flex flex-col min-h-screen bg-white text-black dark:bg-zinc-900 dark:text-white transition-colors pt-10">
      {!isMobileOS && <MenuBar />}
      <main className="flex-1">
        <Outlet />
      </main>
      <FooterBase />
    </div>
  );
}

export default App;
