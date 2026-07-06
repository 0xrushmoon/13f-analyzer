"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useLocale } from "@/contexts/locale-context";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const { dict } = useLocale();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { href: "/institutions", label: dict.nav.institutions },
    { href: "/holdings", label: dict.nav.holdings },
    { href: "/analyze", label: dict.nav.analyze },
    { href: "/docs", label: dict.nav.docs },
    { href: "/pricing", label: dict.nav.pricing },
  ];

  const closeMobile = () => setMobileOpen(false);

  return (
    <header className="site-header">
      <div className="container mx-auto flex h-11 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2"
            onClick={closeMobile}
          >
            <span className="text-sm font-semibold text-primary tracking-tight">
              HoldingsKit
            </span>
            <span className="hidden lg:inline text-[10px] text-[hsl(var(--header-muted))] uppercase tracking-widest">
              {dict.nav.tagline}
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-0.5">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "nav-link",
                  pathname === item.href || pathname.startsWith(item.href + "/")
                    ? "nav-link-active"
                    : "",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-0.5">
          <ThemeToggle />
          <LanguageSwitcher />
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="hidden sm:inline-flex h-8 text-xs header-btn"
          >
            <Link href="/login">{dict.nav.login}</Link>
          </Button>
          <Button size="sm" asChild className="hidden sm:inline-flex h-8 text-xs">
            <Link href="/pricing">{dict.nav.deposit}</Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-8 w-8 header-btn"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? dict.nav.menuClose : dict.nav.menuOpen}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-[hsl(var(--header))]">
          <nav className="container mx-auto flex flex-col px-4 py-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobile}
                className="py-2.5 px-2 text-xs rounded-sm text-[hsl(var(--header-muted))] hover:text-[hsl(var(--header-foreground))] hover:bg-[hsl(var(--header-accent))] border-b border-border/50 last:border-0"
              >
                {item.label}
              </Link>
            ))}
            <div className="flex gap-2 pt-3 pb-1">
              <Button variant="outline" size="sm" asChild className="flex-1 h-8 text-xs">
                <Link href="/login" onClick={closeMobile}>
                  {dict.nav.login}
                </Link>
              </Button>
              <Button size="sm" asChild className="flex-1 h-8 text-xs">
                <Link href="/pricing" onClick={closeMobile}>
                  {dict.nav.deposit}
                </Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
