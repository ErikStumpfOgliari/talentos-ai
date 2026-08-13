import type { MetadataRoute } from "next";

const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://aptelys.com").replace(/\/$/, "");

// Áreas privadas (atrás de login) — não devem ser rastreadas nem indexadas.
const privatePaths = [
  "/api/",
  "/dashboard",
  "/jobs",
  "/candidates",
  "/applications",
  "/pipeline",
  "/interviews",
  "/matching",
  "/email-automation",
  "/analytics",
  "/settings",
  "/billing",
  "/admin",
  "/schedule",
  "/candidate-status",
  "/verify-login",
  "/forgot-password",
  "/reset-password",
  "/logout",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: privatePaths,
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
