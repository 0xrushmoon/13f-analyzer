import { getAuth } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = await getAuth();
  if (!auth) {
    return new Response("Auth not configured", { status: 503 });
  }
  return auth.handler(request);
}

export async function POST(request: Request) {
  const auth = await getAuth();
  if (!auth) {
    return new Response("Auth not configured", { status: 503 });
  }
  return auth.handler(request);
}
