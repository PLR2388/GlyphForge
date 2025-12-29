import { Context, Next } from 'hono';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Optional: Use Upstash Redis for distributed rate limiting
// If not configured, falls back to in-memory rate limiting
let ratelimit: Ratelimit | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
    analytics: true,
  });
}

// In-memory fallback rate limiter
const memoryStore = new Map<string, { count: number; resetAt: number }>();

function getMemoryRateLimit(key: string, limit: number, windowMs: number): { success: boolean; remaining: number } {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now > entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0 };
  }

  entry.count++;
  return { success: true, remaining: limit - entry.count };
}

export async function rateLimitMiddleware(c: Context, next: Next) {
  // Get identifier (API key or IP)
  const apiKey = c.get('apiKey')?.id;
  const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
  const identifier = apiKey || ip;

  // Check rate limit
  let success: boolean;
  let remaining: number;

  if (ratelimit) {
    // Use Upstash Redis
    const result = await ratelimit.limit(identifier);
    success = result.success;
    remaining = result.remaining;

    c.header('X-RateLimit-Limit', String(result.limit));
    c.header('X-RateLimit-Remaining', String(result.remaining));
    c.header('X-RateLimit-Reset', String(result.reset));
  } else {
    // Use in-memory fallback
    const result = getMemoryRateLimit(identifier, 100, 60000); // 100/min
    success = result.success;
    remaining = result.remaining;

    c.header('X-RateLimit-Limit', '100');
    c.header('X-RateLimit-Remaining', String(remaining));
  }

  if (!success) {
    return c.json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please slow down.',
      retryAfter: 60,
    }, 429);
  }

  return next();
}
