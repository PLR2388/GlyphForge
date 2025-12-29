import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import * as schema from './schema.js';

const sqlite = new Database(process.env.DATABASE_PATH || 'glyphforge.db');
export const db = drizzle(sqlite, { schema });

// Initialize database - create tables (without new verification columns for compatibility)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    tier TEXT NOT NULL DEFAULT 'free',
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    requests_this_month INTEGER NOT NULL DEFAULT 0,
    requests_total INTEGER NOT NULL DEFAULT 0,
    last_request_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS usage_logs (
    id TEXT PRIMARY KEY,
    api_key_id TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    style TEXT,
    input_length INTEGER NOT NULL,
    response_time INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (api_key_id) REFERENCES api_keys(id)
  );

  CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);
  CREATE INDEX IF NOT EXISTS idx_usage_logs_api_key_id ON usage_logs(api_key_id);
`);

// Migration: Add verification columns to existing tables
try {
  sqlite.exec(`ALTER TABLE api_keys ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0`);
} catch (e) { /* Column already exists */ }
try {
  sqlite.exec(`ALTER TABLE api_keys ADD COLUMN verification_token TEXT`);
} catch (e) { /* Column already exists */ }
try {
  sqlite.exec(`ALTER TABLE api_keys ADD COLUMN verification_token_expires INTEGER`);
} catch (e) { /* Column already exists */ }

// Create indexes (after columns exist)
try {
  sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_api_keys_email ON api_keys(email)`);
} catch (e) { /* Index already exists */ }
try {
  sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_api_keys_verification_token ON api_keys(verification_token)`);
} catch (e) { /* Index already exists */ }

export async function createApiKey(data: { name: string; email: string; tier?: schema.Tier }) {
  const id = nanoid();
  const key = `gf_${nanoid(32)}`;

  await db.insert(schema.apiKeys).values({
    id,
    key,
    name: data.name,
    email: data.email,
    tier: data.tier || 'free',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return { id, key };
}

export async function getApiKeyByKey(key: string) {
  const results = await db.select().from(schema.apiKeys).where(eq(schema.apiKeys.key, key)).limit(1);
  return results[0] || null;
}

export async function getApiKeyByEmail(email: string) {
  const results = await db.select().from(schema.apiKeys).where(eq(schema.apiKeys.email, email)).limit(1);
  return results[0] || null;
}

export async function incrementUsage(apiKeyId: string) {
  await db.update(schema.apiKeys)
    .set({
      requestsThisMonth: sql`${schema.apiKeys.requestsThisMonth} + 1`,
      requestsTotal: sql`${schema.apiKeys.requestsTotal} + 1`,
      lastRequestAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.apiKeys.id, apiKeyId));
}

export async function logUsage(data: {
  apiKeyId: string;
  endpoint: string;
  style?: string;
  inputLength: number;
  responseTime: number;
}) {
  await db.insert(schema.usageLogs).values({
    id: nanoid(),
    ...data,
    createdAt: new Date(),
  });
}

export async function resetMonthlyUsage() {
  await db.update(schema.apiKeys)
    .set({
      requestsThisMonth: 0,
      updatedAt: new Date(),
    });
}

export async function updateApiKeyTier(apiKeyId: string, tier: schema.Tier, stripeData?: {
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}) {
  await db.update(schema.apiKeys)
    .set({
      tier,
      stripeCustomerId: stripeData?.stripeCustomerId,
      stripeSubscriptionId: stripeData?.stripeSubscriptionId,
      updatedAt: new Date(),
    })
    .where(eq(schema.apiKeys.id, apiKeyId));
}

// Email verification functions
export async function createVerificationToken(apiKeyId: string): Promise<string> {
  const token = nanoid(32);
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await db.update(schema.apiKeys)
    .set({
      verificationToken: token,
      verificationTokenExpires: expires,
      updatedAt: new Date(),
    })
    .where(eq(schema.apiKeys.id, apiKeyId));

  return token;
}

export async function verifyToken(token: string): Promise<{ success: boolean; apiKey?: string; error?: string }> {
  if (!token) {
    return { success: false, error: 'Token is required' };
  }

  const results = await db.select()
    .from(schema.apiKeys)
    .where(eq(schema.apiKeys.verificationToken, token))
    .limit(1);

  const record = results[0];

  if (!record) {
    return { success: false, error: 'Invalid verification link' };
  }

  if (record.verificationTokenExpires && new Date(record.verificationTokenExpires) < new Date()) {
    return { success: false, error: 'Verification link has expired' };
  }

  // Mark as verified and clear token
  await db.update(schema.apiKeys)
    .set({
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpires: null,
      updatedAt: new Date(),
    })
    .where(eq(schema.apiKeys.id, record.id));

  return { success: true, apiKey: record.key };
}

export async function getApiKeyByEmailVerified(email: string) {
  const results = await db.select()
    .from(schema.apiKeys)
    .where(eq(schema.apiKeys.email, email))
    .limit(1);

  return results[0] || null;
}

// Admin function to clear all data
export async function clearDatabase() {
  await db.delete(schema.usageLogs);
  await db.delete(schema.apiKeys);
  return { success: true };
}
