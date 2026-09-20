"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="size-9 rounded-md border-0 bg-card/60 shrink-0 box-border" aria-hidden />
    );
  }

  const isDark = theme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-9 rounded-md border-0 bg-card/60 text-muted-foreground hover:text-foreground hover:bg-accent transition-all shadow-none cursor-pointer inline-flex items-center justify-center p-0 shrink-0 box-border"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className="size-4 text-foreground" /> : <Moon className="size-4 text-foreground" />}
    </Button>
  );
}
