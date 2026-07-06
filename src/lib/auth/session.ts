import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";

export async function getSessionUser() {
  const auth = await getAuth();
  if (!auth) return null;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) return null;
  return session.user;
}
