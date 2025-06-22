import { LocalStorageThemeInterface } from "@/interfaces/theme/LocalStorageTheme";
import { create } from "zustand";

interface ThemeState {
  dark: boolean;
  setDark: (value: boolean) => void;
  toggleDark: () => void;
  setThemeData: () => void;
  savedTheme: null | "dark" | "light";
}

const useThemeStore = create<ThemeState>((set, get) => ({
  dark: true,
  savedTheme: localStorage.getItem("theme") as LocalStorageThemeInterface,
  setDark: (value) => set({ dark: value }),
  toggleDark: () => set((state) => ({ dark: !state.dark })),
  setThemeData: () => {
    const themeStore = get();
    const setDark = themeStore.setDark;
    const savedTheme = themeStore.savedTheme;
    try {
      if (savedTheme) {
        if (savedTheme === "dark") {
          console.log("Theme was dark not null")
          setDark(true);
          localStorage.setItem("theme", "dark");
        } else {
           console.log("Theme was light not null")
          setDark(false);
          localStorage.setItem("theme", "light");
        }
      } else {
        localStorage.setItem("theme", "dark");
        console.log("Saved theme was null is now saved to dark");
      }
    } catch (error) {
      console.log(error);
    }
  },
}));

export default useThemeStore;
