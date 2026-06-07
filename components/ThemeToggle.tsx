"use client";
import { useTheme } from "next-themes";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="tap-scale h-12 w-full rounded-[18px] border border-neutral-200 bg-white text-[15px] font-black dark:border-neutral-800 dark:bg-[#181d1b]"
    >
      Toggle {theme === "dark" ? "Light" : "Dark"} Mode
    </button>
  );
}
