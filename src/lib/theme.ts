import type { Theme } from "@/contexts/theme-context";

export function resolveTheme(cookie?: string | null): Theme {
  if (cookie === "light") return "light";
  return "dark";
}
