import { NextResponse } from "next/server";
import { buildAgentCard } from "@/lib/seo/discovery";

export async function GET() {
  return NextResponse.json(buildAgentCard(), {
    headers: {
      "Cache-Control": "public, max-age=3600",
    },
  });
}
