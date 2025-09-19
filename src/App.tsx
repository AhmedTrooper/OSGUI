import { useEffect } from "react";
import "./App.css";
import { useApplicationstore } from "./store/ApplicationStore";
import { useDatabaseStore } from "./store/DatabaseStore";
import useOsInfoStore from "./store/OsInfoStore";
import useThemeStore from "./store/ThemeStore";
import MenuBar from "./components/menuBar/MenuBar";
import { Outlet } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AppError } from "./types/global";

function App() {
  const dark = useThemeStore((state) => state.dark);
  const detectOS = useOsInfoStore((state) => state.detectMobileOS);
  const isMobileOS = useOsInfoStore((state) => state.isMobileOS);
  const checkedForApplicationUpdate = useApplicationstore(
    (state) => state.checkedForApplicationUpdate
  );
  const fetchAppVersion = useApplicationstore((state) => state.fetchAppVersion);
  const supabaseQueryInsert = useDatabaseStore(
    (state) => state.supabaseQueryInsert
  );

  const setThemeData = useThemeStore((state) => state.setThemeData);

  const createOrLoadDatabase = useDatabaseStore(
    (state) => state.createOrLoadDatabase
  );
  const setDatabaseLoaded = useDatabaseStore(
    (state) => state.setDatabaseLoaded
  );
  const databaseLoaded = useDatabaseStore((state) => state.databaseLoaded);

  // Handle global errors
  const handleError = (error: AppError) => {
    console.error('Global error caught:', error);
    // You could send this to an error reporting service
    // or show a global error notification
  };

  useEffect(() => {
    detectOS();
  }, [detectOS]);

  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  useEffect(() => {
    if (!databaseLoaded) {
      createOrLoadDatabase();
      setDatabaseLoaded(true);
    }
  }, [databaseLoaded, createOrLoadDatabase, setDatabaseLoaded]);

  useEffect(() => {
    setThemeData();
  }, [setThemeData]);

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
    if (!checkedForApplicationUpdate) fetchAppVersion();
  }, [checkedForApplicationUpdate, fetchAppVersion]);

  useEffect(() => {
    supabaseQueryInsert();
  }, [supabaseQueryInsert]);

  return (
    <ErrorBoundary onError={handleError}>
      <div className="flex flex-col select-none max-h-[100vh] bg-white text-black dark:bg-zinc-900 dark:text-white transition-colors pt-10 overflow-auto custom-scrollbar">
        {!isMobileOS && (
          <ErrorBoundary>
            <MenuBar />
          </ErrorBoundary>
        )}
        <main className="flex-1">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;
