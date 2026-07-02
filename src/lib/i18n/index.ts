import en from "./dictionaries/en";
import zhCN from "./dictionaries/zh-CN";
import { defaultLocale, locales, type Locale } from "./types";

export { defaultLocale, locales, localeNames } from "./types";
export type { Dictionary, Locale } from "./types";

const dictionaries = {
  en,
  "zh-CN": zhCN,
} as const;

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function getDictionary(locale: Locale) {
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}

export function resolveLocale(value: string | undefined | null): Locale {
  if (value && isLocale(value)) {
    return value;
  }
  return defaultLocale;
}
