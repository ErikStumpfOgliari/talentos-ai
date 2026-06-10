import type { Metadata } from "next";
import { GlobalLanguageToggle } from "@/components/global-language-toggle";
import { SiteLanguageProvider } from "@/components/site-language-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "TalentOS AI | Recruitment CRM",
  description: "AI-powered recruitment CRM and ATS SaaS platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <SiteLanguageProvider>
          {children}
          <GlobalLanguageToggle />
        </SiteLanguageProvider>
      </body>
    </html>
  );
}
