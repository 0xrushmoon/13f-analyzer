"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useLocale } from "@/contexts/locale-context";

export function SiteHeader() {
  const { dict } = useLocale();

  const navItems = [
    { href: "/institutions", label: dict.nav.institutions },
    { href: "/holdings", label: dict.nav.holdings },
    { href: "/analyze", label: dict.nav.analyze },
    { href: "/pricing", label: dict.nav.pricing },
    { href: "/docs", label: dict.nav.docs },
  ];

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <span className="text-primary">13F</span>
          <span className="hidden sm:inline text-muted-foreground font-normal text-sm">
            {dict.nav.tagline}
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
            <Link href="/login">{dict.nav.login}</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/pricing">{dict.nav.getStarted}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
