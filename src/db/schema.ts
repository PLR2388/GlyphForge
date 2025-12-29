import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const apiKeys = sqliteTable('api_keys', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  tier: text('tier', { enum: ['free', 'pro', 'business', 'enterprise'] }).notNull().default('free'),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  requestsThisMonth: integer('requests_this_month').notNull().default(0),
  requestsTotal: integer('requests_total').notNull().default(0),
  lastRequestAt: integer('last_request_at', { mode: 'timestamp' }),
  // Email verification
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  verificationToken: text('verification_token'),
  verificationTokenExpires: integer('verification_token_expires', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const usageLogs = sqliteTable('usage_logs', {
  id: text('id').primaryKey(),
  apiKeyId: text('api_key_id').notNull().references(() => apiKeys.id),
  endpoint: text('endpoint').notNull(),
  style: text('style'),
  inputLength: integer('input_length').notNull(),
  responseTime: integer('response_time').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Tier limits (requests per month)
export const TIER_LIMITS = {
  free: 3000, // 100/day
  pro: 10000,
  business: 100000,
  enterprise: Infinity,
} as const;

export type Tier = keyof typeof TIER_LIMITS;
export type ApiKey = typeof apiKeys.$inferSelect;
export type UsageLog = typeof usageLogs.$inferSelect;
