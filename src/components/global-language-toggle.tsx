"use client";

import { usePathname } from "next/navigation";
import { LanguageToggle } from "@/components/site-language-provider";

export function GlobalLanguageToggle() {
  const pathname = usePathname();

  if (pathname === "/") {
    return null;
  }

  return (
    <div className="global-language-toggle" data-no-translate>
      <LanguageToggle />
    </div>
  );
}
