"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { SunIcon, MoonIcon, MonitorIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
    );
  }

  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800">
      <button
        onClick={() => setTheme("light")}
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
          theme === "light"
            ? "bg-white dark:bg-zinc-700 shadow-sm text-amber-500"
            : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
        )}
        title="Light mode"
      >
        <SunIcon className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme("dark")}
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
          theme === "dark"
            ? "bg-white dark:bg-zinc-700 shadow-sm text-blue-500"
            : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
        )}
        title="Dark mode"
      >
        <MoonIcon className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme("system")}
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
          theme === "system"
            ? "bg-white dark:bg-zinc-700 shadow-sm text-emerald-500"
            : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
        )}
        title="System preference"
      >
        <MonitorIcon className="w-4 h-4" />
      </button>
    </div>
  );
}

