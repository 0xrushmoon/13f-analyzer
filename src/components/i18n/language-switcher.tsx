"use client";

import { localeNames, type Locale } from "@/lib/i18n";
import { useLocale } from "@/contexts/locale-context";
import { Button } from "@/components/ui/button";

export function LanguageSwitcher() {
  const { locale, setLocale, dict } = useLocale();

  const toggle = () => {
    const next: Locale = locale === "en" ? "zh-CN" : "en";
    setLocale(next);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      className="h-8 min-w-[3rem] px-2 text-[10px] font-normal header-btn"
      aria-label={dict.theme.language}
    >
      {localeNames[locale === "en" ? "zh-CN" : "en"]}
    </Button>
  );
}
