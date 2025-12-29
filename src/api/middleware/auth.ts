import { Context, Next } from 'hono';
import { getApiKeyByKey, incrementUsage, logUsage } from '../../db/client.js';
import { TIER_LIMITS } from '../../db/schema.js';

export interface AuthContext {
  apiKey: {
    id: string;
    tier: string;
    requestsThisMonth: number;
  };
}

export async function authMiddleware(c: Context, next: Next) {
  const startTime = Date.now();

  // Get API key from header
  const authHeader = c.req.header('Authorization');
  const apiKeyParam = c.req.query('api_key');

  let keyValue: string | undefined;

  if (authHeader?.startsWith('Bearer ')) {
    keyValue = authHeader.slice(7);
  } else if (apiKeyParam) {
    keyValue = apiKeyParam;
  }

  // Allow unauthenticated access to certain endpoints
  const publicPaths = ['/', '/health', '/styles', '/docs', '/register', '/success', '/dashboard', '/dashboard/data', '/lookup', '/checkout', '/verify'];
  const publicPrefixes = ['/stripe/', '/mcp'];

  if (publicPaths.includes(c.req.path) || publicPrefixes.some(p => c.req.path.startsWith(p))) {
    return next();
  }

  if (!keyValue) {
    return c.json({
      error: 'API key required',
      message: 'Provide API key via Authorization: Bearer <key> header or ?api_key=<key> query param',
      docs: 'https://glyphforge.dev/docs',
    }, 401);
  }

  // Look up API key
  const apiKey = await getApiKeyByKey(keyValue);

  if (!apiKey) {
    return c.json({
      error: 'Invalid API key',
      message: 'The provided API key is not valid',
    }, 401);
  }

  // Check rate limit
  const limit = TIER_LIMITS[apiKey.tier as keyof typeof TIER_LIMITS];

  if (apiKey.requestsThisMonth >= limit) {
    return c.json({
      error: 'Rate limit exceeded',
      message: `You have exceeded your monthly limit of ${limit} requests`,
      tier: apiKey.tier,
      usage: apiKey.requestsThisMonth,
      limit,
      upgrade: 'https://glyphforge.dev/pricing',
    }, 429);
  }

  // Set context for downstream handlers
  c.set('apiKey', {
    id: apiKey.id,
    tier: apiKey.tier,
    requestsThisMonth: apiKey.requestsThisMonth,
  });

  // Increment usage
  await incrementUsage(apiKey.id);

  // Continue to handler
  await next();

  // Log usage after response
  const responseTime = Date.now() - startTime;
  const body = await c.req.text().catch(() => '');

  logUsage({
    apiKeyId: apiKey.id,
    endpoint: c.req.path,
    style: c.req.query('style'),
    inputLength: body.length,
    responseTime,
  }).catch(console.error);
}

export function getAuthContext(c: Context): AuthContext | null {
  return c.get('apiKey') || null;
}
