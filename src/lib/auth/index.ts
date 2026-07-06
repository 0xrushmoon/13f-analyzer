import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createDb } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { sendEmail } from "@/lib/email/send";

export function createAuth(db: ReturnType<typeof createDb>) {
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: {
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
      },
    }),
    user: {
      additionalFields: {
        plan: {
          type: "string",
          required: false,
          defaultValue: "free",
          input: false,
        },
        stripeCustomerId: {
          type: "string",
          required: false,
          input: false,
        },
        aiUsageThisMonth: {
          type: "number",
          required: false,
          defaultValue: 0,
          input: false,
        },
        aiUsageResetAt: {
          type: "string",
          required: false,
          input: false,
        },
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        void sendEmail({
          to: user.email,
          subject: "验证您的 HoldingsKit 邮箱",
          html: `<p>欢迎注册 HoldingsKit。</p><p>请点击链接验证邮箱：</p><p><a href="${url}">${url}</a></p><p>验证后请前往 <a href="https://oktangle.com/pricing">定价页</a> 完成订阅以使用服务。</p>`,
        });
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }) => {
        void sendEmail({
          to: user.email,
          subject: "重置 HoldingsKit 密码",
          html: `<p>请点击链接重置密码：</p><p><a href="${url}">${url}</a></p>`,
        });
      },
    },
    socialProviders:
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
        ? {
            google: {
              clientId: process.env.GOOGLE_CLIENT_ID,
              clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            },
          }
        : undefined,
    secret: process.env.BETTER_AUTH_SECRET ?? "dev-secret-change-me",
    baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  });
}

export async function getAuth() {
  const { getDb } = await import("@/lib/cloudflare");
  const db = await getDb();
  if (!db) return null;
  return createAuth(db);
}
