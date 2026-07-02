import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const institutions = sqliteTable(
  "institutions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    cik: text("cik").notNull(),
    name: text("name").notNull(),
    ticker: text("ticker"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    tier: text("tier", { enum: ["curated", "expanded"] })
      .notNull()
      .default("curated"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex("institutions_cik_idx").on(table.cik),
    index("institutions_tier_idx").on(table.tier),
  ]
);

export const filings = sqliteTable(
  "filings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    institutionId: integer("institution_id")
      .notNull()
      .references(() => institutions.id),
    accessionNumber: text("accession_number").notNull(),
    periodEnd: text("period_end").notNull(),
    filedAt: text("filed_at"),
    r2Key: text("r2_key"),
    status: text("status", {
      enum: ["pending", "processing", "completed", "failed"],
    })
      .notNull()
      .default("pending"),
    errorMessage: text("error_message"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex("filings_accession_idx").on(table.accessionNumber),
    index("filings_institution_period_idx").on(
      table.institutionId,
      table.periodEnd
    ),
  ]
);

export const holdings = sqliteTable(
  "holdings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    filingId: integer("filing_id")
      .notNull()
      .references(() => filings.id),
    cusip: text("cusip").notNull(),
    issuerName: text("issuer_name").notNull(),
    ticker: text("ticker"),
    shares: real("shares").notNull().default(0),
    valueUsd: real("value_usd").notNull().default(0),
    putCall: text("put_call"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index("holdings_filing_idx").on(table.filingId),
    index("holdings_cusip_idx").on(table.cusip),
  ]
);

export const holdingChanges = sqliteTable(
  "holding_changes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    institutionId: integer("institution_id")
      .notNull()
      .references(() => institutions.id),
    periodEnd: text("period_end").notNull(),
    prevPeriodEnd: text("prev_period_end").notNull(),
    cusip: text("cusip").notNull(),
    issuerName: text("issuer_name").notNull(),
    ticker: text("ticker"),
    changeType: text("change_type", {
      enum: ["new", "increased", "decreased", "closed", "unchanged"],
    }).notNull(),
    sharesDelta: real("shares_delta").notNull().default(0),
    valueDelta: real("value_delta").notNull().default(0),
    sharesCurrent: real("shares_current").notNull().default(0),
    sharesPrevious: real("shares_previous").notNull().default(0),
    valueCurrent: real("value_current").notNull().default(0),
    valuePrevious: real("value_previous").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index("holding_changes_institution_period_idx").on(
      table.institutionId,
      table.periodEnd
    ),
    index("holding_changes_cusip_idx").on(table.cusip),
  ]
);

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  image: text("image"),
  plan: text("plan", { enum: ["free", "pro", "api"] })
    .notNull()
    .default("free"),
  stripeCustomerId: text("stripe_customer_id"),
  aiUsageThisMonth: integer("ai_usage_this_month").notNull().default(0),
  aiUsageResetAt: text("ai_usage_reset_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: text("access_token_expires_at"),
  refreshTokenExpiresAt: text("refresh_token_expires_at"),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const verifications = sqliteTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const subscriptions = sqliteTable("subscriptions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  stripeCustomerId: text("stripe_customer_id").notNull(),
  stripeSubscriptionId: text("stripe_subscription_id"),
  plan: text("plan", { enum: ["free", "pro", "api"] }).notNull(),
  status: text("status").notNull(),
  currentPeriodEnd: text("current_period_end"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const apiKeys = sqliteTable(
  "api_keys",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    keyHash: text("key_hash").notNull(),
    keyPrefix: text("key_prefix").notNull(),
    name: text("name").notNull(),
    lastUsedAt: text("last_used_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [index("api_keys_user_idx").on(table.userId)]
);

export const analysisSessions = sqliteTable(
  "analysis_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    institutionId: integer("institution_id").references(() => institutions.id),
    title: text("title").notNull(),
    messages: text("messages").notNull().default("[]"),
    summary: text("summary"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [index("analysis_sessions_user_idx").on(table.userId)]
);

export const usageEvents = sqliteTable(
  "usage_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    type: text("type", { enum: ["api_call", "ai_analysis"] }).notNull(),
    tokens: integer("tokens").default(0),
    stripeReported: integer("stripe_reported", { mode: "boolean" })
      .notNull()
      .default(false),
    metadata: text("metadata"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [index("usage_events_user_idx").on(table.userId)]
);

export type Institution = typeof institutions.$inferSelect;
export type Filing = typeof filings.$inferSelect;
export type Holding = typeof holdings.$inferSelect;
export type HoldingChange = typeof holdingChanges.$inferSelect;
export type User = typeof users.$inferSelect;
export type AnalysisSession = typeof analysisSessions.$inferSelect;
