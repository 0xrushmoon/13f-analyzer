"use client";

import { useLocale } from "@/contexts/locale-context";

export function SiteFooter() {
  const { dict } = useLocale();

  return (
    <footer className="border-t border-border mt-auto page-section-muted">
      <div className="container mx-auto px-4 py-6 text-center">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
          {dict.footer.disclaimer}
        </p>
        <p className="text-[10px] text-muted-foreground/70 mt-2">{dict.footer.lagNotice}</p>
      </div>
    </footer>
  );
}
