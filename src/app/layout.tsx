import type { Metadata } from "next";
import { GlobalLanguageToggle } from "@/components/global-language-toggle";
import { SiteLanguageProvider } from "@/components/site-language-provider";
import { SiteThemeProvider } from "@/components/site-theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aptelys by Interellis | AI Recruitment CRM",
  description: "AI-powered recruitment CRM and ATS SaaS platform by Interellis.",
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
          <SiteThemeProvider>
            {children}
            <GlobalLanguageToggle />
          </SiteThemeProvider>
        </SiteLanguageProvider>
      </body>
    </html>
  );
}
