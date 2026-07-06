import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getDictionary, resolveLocale } from "@/lib/i18n";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("locale")?.value);
  const dict = getDictionary(locale);

  return buildMetadata({
    title: dict.pageMeta.holdings.title,
    description: dict.pageMeta.holdings.description,
    path: "/holdings",
  });
}

export default function HoldingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
