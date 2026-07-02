export const locales = ["en", "zh-CN"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "zh-CN";

export const localeNames: Record<Locale, string> = {
  en: "English",
  "zh-CN": "简体中文",
};

export type Dictionary = {
  meta: {
    title: string;
    description: string;
  };
  nav: {
    institutions: string;
    holdings: string;
    analyze: string;
    pricing: string;
    docs: string;
    login: string;
    getStarted: string;
    tagline: string;
  };
  footer: {
    disclaimer: string;
    lagNotice: string;
  };
  home: {
    badge: string;
    title: string;
    titleHighlight: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
    featuresTitle: string;
    features: Array<{ title: string; description: string }>;
    pricingTitle: string;
    pricingSubtitle: string;
    viewPricing: string;
  };
  common: {
    language: string;
  };
};
