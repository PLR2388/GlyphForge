import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';

import { api } from './routes.js';
import { authMiddleware } from './middleware/auth.js';
import { rateLimitMiddleware } from './middleware/rate-limit.js';
import { stripeRoutes } from '../payments/stripe.js';
import { mcpRoutes } from '../mcp/http-handler.js';

const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', secureHeaders());
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

// Rate limiting
app.use('*', rateLimitMiddleware);

// Authentication (skips public endpoints)
app.use('*', authMiddleware);

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'GlyphForge API',
    version: '1.0.0',
    description: 'Unicode text transformation API & MCP server',
    features: [
      '30+ text transformation styles',
      'Bold, italic, script, fraktur fonts',
      'Zalgo/cursed text with intensity control',
      'Vaporwave, leet speak, morse code',
      'Binary, hex encoding',
      'MCP server for AI integrations',
    ],
    links: {
      docs: '/docs',
      styles: '/styles',
      register: '/register',
      pricing: 'https://glyphforge.dev/pricing',
      github: 'https://github.com/glyphforge/glyphforge',
    },
    example: {
      input: 'Hello World',
      outputs: {
        bold: '𝗛𝗲𝗹𝗹𝗼 𝗪𝗼𝗿𝗹𝗱',
        vaporwave: 'Ｈｅｌｌｏ　Ｗｏｒｌｄ',
        script: '𝓗𝓮𝓵𝓵𝓸 𝓦𝓸𝓻𝓵𝓭',
      },
    },
  });
});

// Mount API routes
app.route('/', api);

// Mount Stripe payment routes
app.route('/stripe', stripeRoutes);

// Mount MCP server routes (for remote MCP connections)
app.route('/mcp', mcpRoutes);

// Error handling
app.onError((err, c) => {
  console.error('API Error:', err);

  if (err.name === 'ZodError') {
    return c.json({
      error: 'Validation error',
      details: err.message,
    }, 400);
  }

  return c.json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  }, 500);
});

// 404 handler
app.notFound((c) => {
  return c.json({
    error: 'Not found',
    message: `Route ${c.req.method} ${c.req.path} not found`,
    docs: '/docs',
  }, 404);
});

// Start server
const port = parseInt(process.env.PORT || '3000', 10);

console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   ██████╗ ██╗  ██╗   ██╗██████╗ ██╗  ██╗             ║
║  ██╔════╝ ██║  ╚██╗ ██╔╝██╔══██╗██║  ██║             ║
║  ██║  ███╗██║   ╚████╔╝ ██████╔╝███████║             ║
║  ██║   ██║██║    ╚██╔╝  ██╔═══╝ ██╔══██║             ║
║  ╚██████╔╝███████╗██║   ██║     ██║  ██║             ║
║   ╚═════╝ ╚══════╝╚═╝   ╚═╝     ╚═╝  ╚═╝             ║
║                                                       ║
║   GlyphForge API Server                               ║
║   Unicode Text Transformation API & MCP Server        ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝

🚀 Server running at http://localhost:${port}
📚 Documentation: http://localhost:${port}/docs
🎨 Available styles: http://localhost:${port}/styles
`);

serve({
  fetch: app.fetch,
  port,
});

export { app };
