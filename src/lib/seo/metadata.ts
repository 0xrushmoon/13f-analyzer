import type { Metadata } from "next";
import { APP_URL, SEO_KEYWORDS, SITE } from "./site";

type PageMetaInput = {
  title: string;
  description: string;
  path?: string;
  keywords?: string[];
  noIndex?: boolean;
};

export function buildMetadata({
  title,
  description,
  path = "",
  keywords = [],
  noIndex = false,
}: PageMetaInput): Metadata {
  const url = `${APP_URL}${path}`;
  const fullTitle =
    path === "" || path === "/"
      ? `${SITE.name} — ${title}`
      : `${title} | ${SITE.name}`;
  const allKeywords = [...SEO_KEYWORDS, ...keywords];

  const verification: Metadata["verification"] = {};
  if (process.env.GOOGLE_SITE_VERIFICATION) {
    verification.google = process.env.GOOGLE_SITE_VERIFICATION;
  }
  if (process.env.BING_SITE_VERIFICATION) {
    verification.other = {
      "msvalidate.01": process.env.BING_SITE_VERIFICATION,
    };
  }

  return {
    title: fullTitle,
    description,
    keywords: allKeywords,
    authors: [{ name: SITE.name, url: SITE.github }],
    creator: SITE.name,
    publisher: SITE.name,
    metadataBase: new URL(APP_URL),
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "en_US",
      alternateLocale: ["zh_CN"],
      url,
      siteName: SITE.name,
      title: fullTitle,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      creator: "@holdingskit",
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    ...(Object.keys(verification).length > 0 ? { verification } : {}),
  };
}
