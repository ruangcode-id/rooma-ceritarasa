import type { MetadataRoute } from "next";

function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://roomaceritarasa.com";
  return raw.replace(/\/$/, "");
}

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: [
        "/",
        "/reservasi",
        "/event",
        "/gallery",
        "/career",
        "/cancel",
        "/vip/",
      ],
      disallow: [
        "/admin/",
        "/owner/",
        "/login",
        "/unauthorized",
        "/api/",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
