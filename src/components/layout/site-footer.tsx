"use client";

import { useLocale } from "@/contexts/locale-context";

export function SiteFooter() {
  const { dict } = useLocale();

  return (
    <footer className="border-t py-8 mt-auto">
      <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
        <p>{dict.footer.disclaimer}</p>
        <p className="mt-2">{dict.footer.lagNotice}</p>
      </div>
    </footer>
  );
}
