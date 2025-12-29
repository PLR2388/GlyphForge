# GlyphForge

[![License: PolyForm Noncommercial](https://img.shields.io/badge/License-PolyForm%20Noncommercial-purple.svg)](https://polyformproject.org/licenses/noncommercial/1.0.0/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)

**Unicode Text Transform API & MCP Server**

Transform text into 30+ Unicode styles via REST API and Model Context Protocol (MCP) server. Bold, italic, zalgo, vaporwave, fraktur, and more.

```
Hello World  ->  𝗛𝗲𝗹𝗹𝗼 𝗪𝗼𝗿𝗹𝗱      (bold)
Hello World  ->  𝘏𝘦𝘭𝘭𝘰 𝘞𝘰𝘳𝘭𝘥      (italic)
Hello World  ->  𝓗𝓮𝓵𝓵𝓸 𝓦𝓸𝓻𝓵𝓭      (script)
Hello World  ->  H̷̢e̵͔l̶̪l̸͚o̴̤ W̷o̸r̵l̶d̴  (zalgo)
Hello World  ->  Ｈｅｌｌｏ　Ｗｏｒｌｄ    (vaporwave)
```

## Features

- **30+ Text Styles** - Mathematical fonts, enclosures, decorations, encodings
- **REST API** - Simple HTTP endpoints with JSON responses
- **MCP Server** - Native integration with Claude, Cursor, and AI tools
- **Rate Limiting** - Built-in with Upstash Redis or in-memory fallback
- **Stripe Payments** - Subscription billing for Pro/Business tiers
- **TypeScript** - Fully typed codebase with strict mode

## Available Styles

| Category | Styles |
|----------|--------|
| **Mathematical Fonts** | bold, italic, boldItalic, script, boldScript, fraktur, boldFraktur, doubleStruck, monospace |
| **Enclosures** | circled, negativeCircled, squared, negativeSquared, parenthesized |
| **Size Variants** | smallCaps, superscript, subscript |
| **Transformations** | upsideDown, vaporwave, regional, leet |
| **Encodings** | morse, binary, hex |
| **Decorations** | zalgo, strikethrough, underline, sparkles, wave |
| **Aliases** | bubble (=circled), medieval (=fraktur) |

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/PLR2388/GlyphForge.git
cd GlyphForge

# Install dependencies
npm install

# Set up environment
cp .env.example .env
```

### Run Development Server

```bash
# Start API server (http://localhost:3000)
npm run dev

# Start MCP server (stdio transport)
npm run dev:mcp
```

### Test the API

```bash
# List available styles
curl http://localhost:3000/styles

# Register for a free API key
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{"name": "My App", "email": "me@example.com"}'

# Transform text
curl -X POST http://localhost:3000/transform \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"text": "Hello World", "style": "bold"}'
```

## API Reference

### Public Endpoints (No Auth Required)

#### `GET /` - API Info
Returns API name, version, and available features.

#### `GET /health` - Health Check
```json
{ "status": "ok", "version": "1.0.0" }
```

#### `GET /styles` - List Styles
Returns all 30+ available transformation styles with examples.

#### `GET /docs` - API Documentation
Returns full API documentation as JSON.

#### `POST /register` - Get Free API Key
```bash
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Project Name", "email": "user@example.com"}'
```

Response:
```json
{
  "success": true,
  "data": {
    "apiKey": "gf_...",
    "tier": "free",
    "limits": { "requestsPerMonth": 3000, "requestsPerDay": 100 }
  }
}
```

### Authenticated Endpoints

Authentication via header or query parameter:
- Header: `Authorization: Bearer <api-key>`
- Query: `?api_key=<api-key>`

#### `POST /transform` - Transform Text
```bash
curl -X POST http://localhost:3000/transform \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello", "style": "bold"}'
```

Response:
```json
{
  "success": true,
  "data": {
    "original": "Hello",
    "style": "bold",
    "transformed": "𝗛𝗲𝗹𝗹𝗼"
  }
}
```

#### `GET /transform` - Transform via Query
```bash
curl "http://localhost:3000/transform?text=Hello&style=italic&api_key=YOUR_KEY"
```

#### `POST /transform/all` - All Styles at Once
```bash
curl -X POST http://localhost:3000/transform/all \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hi"}'
```

Returns transformations in all 30+ styles.

#### `POST /batch` - Batch Transform
```bash
curl -X POST http://localhost:3000/batch \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"text": "Hello", "style": "bold"},
      {"text": "World", "style": "italic"}
    ]
  }'
```

### Stripe Payment Endpoints

#### `POST /stripe/checkout` - Create Checkout Session
```json
{
  "apiKey": "gf_...",
  "plan": "pro",
  "successUrl": "https://yoursite.com/success",
  "cancelUrl": "https://yoursite.com/pricing"
}
```

#### `POST /stripe/portal` - Customer Portal
Manage subscription and billing.

#### `GET /stripe/status` - Subscription Status
Returns current tier, usage, and subscription details.

## MCP Server

GlyphForge includes a Model Context Protocol server for AI tool integration.

### Remote MCP Server (Recommended)

Connect to our hosted MCP server - no installation required:

**For Claude Desktop**, add to `~/.config/Claude/claude_desktop_config.json` (Mac/Linux) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "glyphforge": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://glyphforge.dev/mcp"
      ]
    }
  }
}
```

**For Claude Pro/Max/Team users**: Go to Settings → Connectors → Add Custom Connector → Enter URL:
```
https://glyphforge.dev/mcp
```

### Local MCP Server (Self-hosted)

For development or self-hosting:

```json
{
  "mcpServers": {
    "glyphforge": {
      "command": "npx",
      "args": ["glyphforge-mcp"]
    }
  }
}
```

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `transform_text` | Transform text to a specific Unicode style |
| `transform_all` | Apply all 30+ styles to text |
| `list_styles` | List available styles with examples |
| `batch_transform` | Transform multiple texts at once |

### Usage in Claude

Once configured, you can use natural language:

> "Transform 'Hello World' to bold"
> "Show me all Unicode styles for 'GlyphForge'"
> "Convert this text to zalgo with maxi intensity"

### MCP Server Endpoint

The remote MCP server is available at:
- **Info**: `GET https://glyphforge.dev/mcp`
- **JSON-RPC**: `POST https://glyphforge.dev/mcp`

## Project Structure

```
glyphforge/
├── src/
│   ├── api/
│   │   ├── index.ts          # Hono server setup
│   │   ├── routes.ts         # API endpoints
│   │   └── middleware/
│   │       ├── auth.ts       # API key authentication
│   │       └── rate-limit.ts # Rate limiting
│   ├── mcp/
│   │   └── server.ts         # MCP server implementation
│   ├── transforms/
│   │   ├── index.ts          # Transform functions
│   │   └── unicode-maps.ts   # Character mappings
│   ├── db/
│   │   ├── client.ts         # Database queries
│   │   └── schema.ts         # Drizzle ORM schema
│   └── payments/
│       └── stripe.ts         # Stripe integration
├── landing/
│   └── index.html            # Landing page
├── package.json
├── tsconfig.json
├── .env.example
└── DEPLOYMENT.md             # Deployment guide
```

## Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_PATH=./glyphforge.db

# Stripe (required for payments)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_BUSINESS=price_...

# Upstash Redis (optional - distributed rate limiting)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start API server with hot reload |
| `npm run dev:mcp` | Start MCP server |
| `npm run build` | Compile TypeScript |
| `npm run start` | Run production API server |
| `npm run start:mcp` | Run production MCP server |
| `npm run test` | Run tests with Vitest |
| `npm run typecheck` | Type check without emitting |

## Tech Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript (strict mode)
- **API Framework**: [Hono](https://hono.dev) - lightweight, edge-ready
- **Database**: SQLite via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- **ORM**: [Drizzle](https://orm.drizzle.team)
- **Payments**: [Stripe](https://stripe.com)
- **Rate Limiting**: [Upstash](https://upstash.com) Redis (with in-memory fallback)
- **MCP**: [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/sdk)
- **Validation**: [Zod](https://zod.dev)

## Pricing Tiers

| Tier | Price | Requests | Features |
|------|-------|----------|----------|
| **Free** | $0/month | 3,000/month (100/day) | REST API, all styles |
| **Pro** | $9/month | 10,000/month | REST API + MCP, priority support |
| **Business** | $29/month | 100,000/month | REST API + MCP, dedicated support |
| **Enterprise** | Custom | Unlimited | SLA, custom integration |

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment instructions including:

- Railway deployment (recommended)
- Fly.io deployment
- Stripe configuration
- Custom domain setup
- Monitoring and scaling

### Quick Deploy to Railway

```bash
npm install -g @railway/cli
railway login
railway init
railway variables set PORT=3000 NODE_ENV=production
railway up
```

## Database Schema

### `api_keys` Table
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary key (nanoid) |
| key | TEXT | API key (gf_...) |
| name | TEXT | Project name |
| email | TEXT | User email |
| tier | TEXT | free/pro/business/enterprise |
| stripe_customer_id | TEXT | Stripe customer ID |
| requests_this_month | INTEGER | Monthly usage counter |
| requests_total | INTEGER | All-time usage |

### `usage_logs` Table
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary key |
| api_key_id | TEXT | Foreign key to api_keys |
| endpoint | TEXT | API endpoint called |
| style | TEXT | Style used (if applicable) |
| input_length | INTEGER | Input text length |
| response_time | INTEGER | Response time in ms |

## Rate Limits

- **Per-minute**: 100 requests (all tiers)
- **Per-month**: Based on tier (see pricing)

Rate limit headers included in responses:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

## Zalgo Options

The zalgo style supports intensity levels:

```json
{
  "text": "Hello",
  "style": "zalgo",
  "zalgoIntensity": "mini"    // mini, normal, or maxi
}
```

| Intensity | Effect |
|-----------|--------|
| `mini` | Subtle corruption |
| `normal` | Standard zalgo (default) |
| `maxi` | Maximum chaos |

## Examples

### JavaScript/Node.js

```javascript
const response = await fetch('https://glyphforge.dev/transform', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer gf_your_api_key'
  },
  body: JSON.stringify({
    text: 'Hello World',
    style: 'bold'
  })
});

const { data } = await response.json();
console.log(data.transformed); // 𝗛𝗲𝗹𝗹𝗼 𝗪𝗼𝗿𝗹𝗱
```

### Python

```python
import requests

response = requests.post(
    'https://glyphforge.dev/transform',
    headers={'Authorization': 'Bearer gf_your_api_key'},
    json={'text': 'Hello World', 'style': 'script'}
)

print(response.json()['data']['transformed'])  # 𝓗𝓮𝓵𝓵𝓸 𝓦𝓸𝓻𝓵𝓭
```

### cURL

```bash
curl -X POST https://glyphforge.dev/transform \
  -H "Authorization: Bearer gf_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello", "style": "vaporwave"}'
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

## License

[PolyForm Noncommercial 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0/) - Free for personal and non-commercial use. For commercial licensing, please contact the author. See [LICENSE](./LICENSE) for details.

## Support

- Documentation: [/docs endpoint](https://glyphforge.dev/docs)
- Issues: [GitHub Issues](https://github.com/PLR2388/GlyphForge/issues)

---

Built with care by GlyphForge
