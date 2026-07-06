"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/theme-context";
import { useLocale } from "@/contexts/locale-context";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { dict } = useLocale();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 header-btn"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? dict.theme.light : dict.theme.dark}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}
