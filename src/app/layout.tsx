import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { LocaleProvider } from "@/contexts/locale-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { ThemeScript } from "@/components/theme/theme-script";
import { getDictionary, resolveLocale } from "@/lib/i18n";
import { resolveTheme } from "@/lib/theme";
import { buildMetadata } from "@/lib/seo/metadata";
import { SiteJsonLd } from "@/lib/seo/json-ld";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("locale")?.value);
  const dict = getDictionary(locale);

  return buildMetadata({
    title: dict.meta.title,
    description: dict.meta.description,
    path: "/",
    keywords: dict.meta.keywords,
  });
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("locale")?.value);
  const theme = resolveTheme(cookieStore.get("theme")?.value);
  const dict = getDictionary(locale);

  return (
    <html
      lang={locale}
      className={theme === "dark" ? "dark" : ""}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans`}>
        <SiteJsonLd />
        <ThemeProvider initialTheme={theme}>
          <LocaleProvider locale={locale} dict={dict}>
            <div className="flex min-h-screen flex-col">
              <SiteHeader />
              <main className="flex-1">{children}</main>
              <SiteFooter />
            </div>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
