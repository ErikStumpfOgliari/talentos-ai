"use client";

import { LanguageToggle } from "@/components/site-language-provider";

export function GlobalLanguageToggle() {
  return (
    <div className="global-language-toggle" data-no-translate>
      <LanguageToggle />
    </div>
  );
}
