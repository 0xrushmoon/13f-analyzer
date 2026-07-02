"use client";

import { localeNames, type Locale } from "@/lib/i18n";
import { useLocale } from "@/contexts/locale-context";
import { Button } from "@/components/ui/button";

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  const toggle = () => {
    const next: Locale = locale === "en" ? "zh-CN" : "en";
    setLocale(next);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      className="min-w-[4.5rem] font-normal"
      aria-label="Switch language"
    >
      {localeNames[locale === "en" ? "zh-CN" : "en"]}
    </Button>
  );
}
