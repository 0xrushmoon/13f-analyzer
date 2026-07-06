import { eq } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { analysisSessions, users } from "@/lib/db/schema";
import type { ChatMessage } from "@/lib/ai/deepseek";

export const ANONYMOUS_USER_ID = "anonymous";

export function generateSessionId(): string {
  return crypto.randomUUID();
}

export async function ensureAnonymousUser(db: Database) {
  await db
    .insert(users)
    .values({
      id: ANONYMOUS_USER_ID,
      name: "Anonymous",
      email: "anonymous@holdingskit.internal",
      emailVerified: false,
      plan: "free",
      aiUsageThisMonth: 0,
    })
    .onConflictDoNothing();
}

export async function createAnalysisSession(
  db: Database,
  userId: string,
  institutionId: number,
  title: string
) {
  if (userId === ANONYMOUS_USER_ID) {
    await ensureAnonymousUser(db);
  }

  const id = generateSessionId();
  await db.insert(analysisSessions).values({
    id,
    userId,
    institutionId,
    title,
    messages: "[]",
  });
  return id;
}

export async function getSessionMessages(
  db: Database,
  sessionId: string
): Promise<ChatMessage[]> {
  const [session] = await db
    .select()
    .from(analysisSessions)
    .where(eq(analysisSessions.id, sessionId))
    .limit(1);
  if (!session) return [];
  try {
    return JSON.parse(session.messages) as ChatMessage[];
  } catch {
    return [];
  }
}

export async function appendSessionMessages(
  db: Database,
  sessionId: string,
  newMessages: ChatMessage[],
  summary?: string
) {
  const existing = await getSessionMessages(db, sessionId);
  const updated = [...existing, ...newMessages];
  await db
    .update(analysisSessions)
    .set({
      messages: JSON.stringify(updated),
      summary: summary ?? undefined,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(analysisSessions.id, sessionId));
}
