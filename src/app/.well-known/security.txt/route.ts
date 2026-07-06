import { NextResponse } from "next/server";
import { SITE } from "@/lib/seo/site";

export async function GET() {
  const body = [
    "Contact: mailto:security@holdingskit.dev",
    `Expires: ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}T00:00:00.000Z`,
    `Preferred-Languages: en, zh-CN`,
    `Canonical: https://${SITE.name.toLowerCase()}.dev/.well-known/security.txt`,
    `Policy: ${SITE.github}/blob/main/SECURITY.md`,
  ].join("\n");

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
