"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={cn("size-10 rounded-full bg-muted/60 dark:bg-zinc-800/90 shrink-0 box-border border border-border/40", className)} aria-hidden />
    );
  }

  const isDark = theme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        "size-10 rounded-full bg-muted/60 dark:bg-zinc-800/90 hover:bg-muted dark:hover:bg-zinc-700 text-foreground transition-all cursor-pointer inline-flex items-center justify-center p-0 shrink-0 border border-border/40",
        className
      )}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? (
        <Sun className="size-6 stroke-[2] text-foreground transition-colors" />
      ) : (
        <Moon className="size-6 stroke-[2] fill-none text-foreground transition-colors" />
      )}
    </Button>
  );
}
