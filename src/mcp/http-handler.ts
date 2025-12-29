// Simplified HTTP handler for remote MCP connections
import { Hono } from 'hono';
import { transform, transformAll, getStylesInfo, STYLES, type StyleName, type ZalgoOptions } from '../transforms/index.js';
import { getApiKeyByKey, incrementUsage } from '../db/client.js';
import { TIER_LIMITS } from '../db/schema.js';

type McpEnv = {
  Variables: {
    apiKey: Awaited<ReturnType<typeof getApiKeyByKey>>;
  };
};

export const mcpRoutes = new Hono<McpEnv>();

// MCP authentication middleware
mcpRoutes.use('*', async (c, next) => {
  // GET /mcp is public (info endpoint)
  if (c.req.method === 'GET') {
    return next();
  }

  // Extract API key from header or query
  const authHeader = c.req.header('Authorization');
  const apiKeyParam = c.req.query('api_key');

  let keyValue: string | undefined;
  if (authHeader?.startsWith('Bearer ')) {
    keyValue = authHeader.slice(7);
  } else if (apiKeyParam) {
    keyValue = apiKeyParam;
  }

  if (!keyValue) {
    return c.json({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32001,
        message: 'API key required. Get your free API key at https://glyphforge.dev/register then use Authorization: Bearer <key> header or ?api_key=<key> query param',
      },
    }, 401);
  }

  // Validate API key
  const apiKey = await getApiKeyByKey(keyValue);
  if (!apiKey) {
    return c.json({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32002,
        message: 'Invalid API key. Register for a free API key at https://glyphforge.dev/register',
      },
    }, 401);
  }

  // Check rate limit
  const limit = TIER_LIMITS[apiKey.tier as keyof typeof TIER_LIMITS];
  if (apiKey.requestsThisMonth >= limit) {
    return c.json({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32003,
        message: `Rate limit exceeded. You've used ${apiKey.requestsThisMonth}/${limit} requests this month. Upgrade at https://glyphforge.dev/dashboard`,
      },
    }, 429);
  }

  // Track usage
  await incrementUsage(apiKey.id);

  // Store API key info for handlers
  c.set('apiKey', apiKey);

  return next();
});

// MCP Tools definition
const TOOLS = [
  {
    name: 'transform_text',
    description: 'Transform text into a specific Unicode style. Available styles: ' + Object.keys(STYLES).join(', '),
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'The text to transform' },
        style: { type: 'string', description: 'The style to apply', enum: Object.keys(STYLES) },
        zalgoIntensity: { type: 'string', description: 'Intensity for zalgo style', enum: ['mini', 'normal', 'maxi'] },
      },
      required: ['text', 'style'],
    },
  },
  {
    name: 'transform_all',
    description: 'Transform text into all available styles at once',
    inputSchema: {
      type: 'object',
      properties: { text: { type: 'string', description: 'The text to transform' } },
      required: ['text'],
    },
  },
  {
    name: 'list_styles',
    description: 'List all available text transformation styles with examples',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'batch_transform',
    description: 'Transform multiple texts with multiple styles',
    inputSchema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: { text: { type: 'string' }, style: { type: 'string' } },
            required: ['text', 'style'],
          },
        },
      },
      required: ['items'],
    },
  },
];

// Handle tool execution
function executeTool(name: string, args: Record<string, unknown>): { content: Array<{ type: string; text: string }>; isError?: boolean } {
  try {
    switch (name) {
      case 'transform_text': {
        const { text, style, zalgoIntensity } = args as { text: string; style: StyleName; zalgoIntensity?: 'mini' | 'normal' | 'maxi' };
        if (!text) throw new Error('Text is required');
        if (!Object.keys(STYLES).includes(style)) throw new Error(`Invalid style: ${style}`);
        const options: ZalgoOptions = zalgoIntensity ? { intensity: zalgoIntensity } : {};
        const result = transform(text, style, options);
        return { content: [{ type: 'text', text: JSON.stringify({ original: text, style, transformed: result }, null, 2) }] };
      }

      case 'transform_all': {
        const { text } = args as { text: string };
        if (!text) throw new Error('Text is required');
        const result = transformAll(text);
        return { content: [{ type: 'text', text: JSON.stringify({ original: text, transformations: result }, null, 2) }] };
      }

      case 'list_styles': {
        const styles = getStylesInfo();
        return { content: [{ type: 'text', text: JSON.stringify({ totalStyles: styles.length, styles }, null, 2) }] };
      }

      case 'batch_transform': {
        const { items } = args as { items: Array<{ text: string; style: StyleName }> };
        if (!Array.isArray(items)) throw new Error('Items must be an array');
        const results = items.map((item, index) => {
          try {
            return { index, original: item.text, style: item.style, transformed: transform(item.text, item.style), success: true };
          } catch (error) {
            return { index, original: item.text, style: item.style, error: String(error), success: false };
          }
        });
        return { content: [{ type: 'text', text: JSON.stringify({ totalItems: items.length, results }, null, 2) }] };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return { content: [{ type: 'text', text: JSON.stringify({ error: true, message: String(error) }) }], isError: true };
  }
}

// MCP info endpoint
mcpRoutes.get('/', (c) => {
  return c.json({
    name: 'GlyphForge MCP Server',
    version: '1.0.0',
    protocol: 'mcp',
    transport: 'streamable-http',
    description: 'Remote MCP server for Unicode text transformations. Transform text into 31+ styles including bold, italic, fraktur, vaporwave, zalgo, and more.',
    tools: TOOLS.map(t => t.name),
    authentication: {
      required: true,
      type: 'Bearer token or api_key query param',
      register: 'https://glyphforge.dev/register',
      free_tier: '3,000 requests/month',
    },
    usage: 'Send JSON-RPC requests to POST /mcp with Authorization: Bearer <api_key> header',
    docs: 'https://glyphforge.dev/docs',
    pricing: 'https://glyphforge.dev/#pricing',
  });
});

// Handle JSON-RPC requests
mcpRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { jsonrpc, id, method, params } = body;

    if (jsonrpc !== '2.0') {
      return c.json({ jsonrpc: '2.0', id, error: { code: -32600, message: 'Invalid JSON-RPC version' } }, 400);
    }

    let result: unknown;

    switch (method) {
      case 'initialize':
        result = {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'glyphforge', version: '1.0.0' },
        };
        break;

      case 'tools/list':
        result = { tools: TOOLS };
        break;

      case 'tools/call': {
        const { name, arguments: args } = params as { name: string; arguments: Record<string, unknown> };
        result = executeTool(name, args || {});
        break;
      }

      case 'ping':
        result = {};
        break;

      case 'notifications/initialized':
        // Client notification, no response needed
        return c.json({ jsonrpc: '2.0', id, result: {} });

      default:
        return c.json({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } }, 404);
    }

    return c.json({ jsonrpc: '2.0', id, result });
  } catch (error) {
    console.error('MCP error:', error);
    return c.json({ jsonrpc: '2.0', id: null, error: { code: -32603, message: String(error) } }, 500);
  }
});
