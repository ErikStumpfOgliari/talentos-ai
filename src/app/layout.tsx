import type { Metadata } from "next";
import { GlobalLanguageToggle } from "@/components/global-language-toggle";
import { SiteLanguageProvider } from "@/components/site-language-provider";
import { SiteThemeProvider } from "@/components/site-theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://aptelys.com"),
  title: "Aptelys by Interellis | CRM de recrutamento com IA",
  description: "CRM de recrutamento e plataforma ATS SaaS com IA da Interellis.",
  verification: {
    google: "rcZ0eGypatakO8iPZqiWIV1Gds4qKz3_vTpAu9y49J4",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
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
