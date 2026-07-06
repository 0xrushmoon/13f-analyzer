import type { MetadataRoute } from "next";
import { APP_URL, SITE } from "@/lib/seo/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: SITE.name,
    description: SITE.tagline,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f172a",
    lang: "en",
    categories: ["finance", "productivity"],
    icons: [
      {
        src: `${APP_URL}/favicon.ico`,
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
