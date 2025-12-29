# GlyphForge Deployment Guide

Complete instructions for deploying GlyphForge to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development](#local-development)
3. [Environment Variables](#environment-variables)
4. [Deploy to Railway](#deploy-to-railway)
5. [Deploy to Fly.io](#deploy-to-flyio)
6. [Stripe Setup](#stripe-setup)
7. [Domain & SSL](#domain--ssl)
8. [MCP Server Distribution](#mcp-server-distribution)
9. [Monitoring](#monitoring)
10. [Scaling](#scaling)

---

## Prerequisites

- Node.js 20+
- npm or pnpm
- Git
- Stripe account (for payments)
- Railway or Fly.io account (for hosting)
- Domain name (optional but recommended)

---

## Local Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment

```bash
cp .env.example .env
```

Edit `.env` with your values (see [Environment Variables](#environment-variables)).

### 3. Run Development Server

```bash
# Run API server
npm run dev

# Run MCP server (separate terminal)
npm run dev:mcp
```

### 4. Test the API

```bash
# Get available styles
curl http://localhost:3000/styles

# Transform text (after registering for API key)
curl -X POST http://localhost:3000/transform \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"text": "Hello World", "style": "bold"}'
```

---

## Environment Variables

Create a `.env` file with these variables:

```env
# Server
PORT=3000
NODE_ENV=production

# Database
DATABASE_PATH=./glyphforge.db

# Stripe (required for payments)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_BUSINESS=price_...

# Upstash Redis (optional, for distributed rate limiting)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

---

## Deploy to Railway

Railway is the easiest option - no Docker required.

### 1. Create Railway Project

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init
```

### 2. Add Environment Variables

```bash
railway variables set PORT=3000
railway variables set NODE_ENV=production
railway variables set STRIPE_SECRET_KEY=sk_live_...
railway variables set STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3. Deploy

```bash
railway up
```

### 4. Get Your URL

```bash
railway open
```

Your API is now live at `https://your-project.up.railway.app`

### 5. Add Custom Domain (Optional)

1. Go to Railway dashboard → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed

---

## Deploy to Fly.io

Fly.io offers global edge deployment.

### 1. Install Fly CLI

```bash
curl -L https://fly.io/install.sh | sh
fly auth login
```

### 2. Create fly.toml

```toml
app = "glyphforge"
primary_region = "iad"

[build]
  builder = "heroku/buildpacks:20"

[env]
  PORT = "3000"
  NODE_ENV = "production"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 512
```

### 3. Create and Deploy

```bash
fly launch
fly secrets set STRIPE_SECRET_KEY=sk_live_...
fly secrets set STRIPE_WEBHOOK_SECRET=whsec_...
fly deploy
```

### 4. Add Persistent Storage (for SQLite)

```bash
fly volumes create glyphforge_data --size 1
```

Update `fly.toml`:

```toml
[mounts]
  source = "glyphforge_data"
  destination = "/data"

[env]
  DATABASE_PATH = "/data/glyphforge.db"
```

---

## Stripe Setup

### 1. Create Stripe Products

Go to [Stripe Dashboard](https://dashboard.stripe.com/products) → Products:

**Pro Plan:**
- Name: GlyphForge Pro
- Price: $9/month (recurring)
- Copy the Price ID (starts with `price_`)

**Business Plan:**
- Name: GlyphForge Business
- Price: $29/month (recurring)
- Copy the Price ID

### 2. Configure Webhooks

Go to Developers → Webhooks → Add Endpoint:

- URL: `https://your-domain.com/stripe/webhook`
- Events to listen:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`

Copy the Webhook Secret (starts with `whsec_`).

### 3. Set Environment Variables

```bash
# Railway
railway variables set STRIPE_SECRET_KEY=sk_live_...
railway variables set STRIPE_WEBHOOK_SECRET=whsec_...
railway variables set STRIPE_PRICE_PRO=price_...
railway variables set STRIPE_PRICE_BUSINESS=price_...

# Or Fly.io
fly secrets set STRIPE_SECRET_KEY=sk_live_...
# etc.
```

### 4. Test Payments

Use Stripe test mode first:
- Test card: `4242 4242 4242 4242`
- Any future expiry, any CVC

---

## Domain & SSL

### Custom Domain Setup

1. **Purchase domain** (Namecheap, Cloudflare, etc.)

2. **Add DNS records:**

   For Railway:
   ```
   CNAME  api  your-project.up.railway.app
   ```

   For Fly.io:
   ```
   CNAME  api  your-app.fly.dev
   ```

3. **Configure in hosting:**
   - Railway: Settings → Domains → Add Custom Domain
   - Fly.io: `fly certs add api.yourdomain.com`

4. **SSL is automatic** with both Railway and Fly.io

---

## MCP Server Distribution

### Option 1: NPM Package (Recommended)

Publish to npm for easy installation:

```bash
# Update package.json name if needed
npm publish
```

Users can then:

```bash
npx glyphforge-mcp
```

### Option 2: Claude Desktop Configuration

Users add to `claude_desktop_config.json`:

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

### Option 3: Remote MCP Server

For paid hosted MCP server, configure remote transport:

```json
{
  "mcpServers": {
    "glyphforge": {
      "url": "https://api.glyphforge.dev/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
```

---

## Monitoring

### Health Checks

The API exposes `/health` endpoint:

```bash
curl https://api.glyphforge.dev/health
# {"status":"ok","version":"1.0.0"}
```

### Recommended Monitoring Tools

1. **Uptime monitoring:** [Better Uptime](https://betteruptime.com/) (free tier)
2. **Error tracking:** [Sentry](https://sentry.io/) (free tier)
3. **Analytics:** Built into Stripe for revenue

### Log Monitoring

Railway and Fly.io both provide log streaming:

```bash
# Railway
railway logs

# Fly.io
fly logs
```

---

## Scaling

### Railway Scaling

Railway auto-scales based on traffic. For more control:

1. Go to Settings → Scaling
2. Adjust replicas and resources

### Fly.io Scaling

```bash
# Scale to 2 machines
fly scale count 2

# Upgrade machine size
fly scale vm shared-cpu-2x
```

### Database Scaling

For high traffic, migrate from SQLite to:

1. **Turso** (distributed SQLite) - drop-in replacement
2. **PlanetScale** (MySQL) - requires schema changes
3. **Neon** (PostgreSQL) - requires schema changes

---

## Cost Estimates

### Minimal Setup (Free Tier Users)

| Service | Cost |
|---------|------|
| Railway Hobby | $5/month |
| Domain | $10/year |
| **Total** | ~$6/month |

### Production Setup

| Service | Cost |
|---------|------|
| Railway Pro | $20/month |
| Upstash Redis | $0-10/month |
| Domain + DNS | $10/year |
| Stripe fees | 2.9% + $0.30/txn |
| **Total** | ~$25-35/month + Stripe fees |

### Break-even Analysis

At $9/month Pro tier:
- 3 paying customers = covers hosting costs
- 10 paying customers = $90/month revenue
- 50 paying customers = $450/month revenue

---

## Quick Start Checklist

- [ ] Clone repository
- [ ] Install dependencies (`npm install`)
- [ ] Create Stripe account and products
- [ ] Set up Railway or Fly.io
- [ ] Configure environment variables
- [ ] Deploy (`railway up` or `fly deploy`)
- [ ] Add custom domain (optional)
- [ ] Set up Stripe webhooks
- [ ] Publish MCP server to npm
- [ ] Set up monitoring

---

## Support

- GitHub Issues: [github.com/glyphforge/glyphforge](https://github.com/glyphforge/glyphforge)
- Email: support@glyphforge.dev

---

## License

MIT License - see LICENSE file for details.
