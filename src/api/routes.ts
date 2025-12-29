import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { transform, transformAll, getStylesInfo, STYLES, type StyleName, type ZalgoOptions } from '../transforms/index.js';
import { createApiKey, getApiKeyByKey, getApiKeyByEmail, createVerificationToken, verifyToken } from '../db/client.js';
import { TIER_LIMITS } from '../db/schema.js';
import { sendVerificationEmail, sendAccessEmail } from '../email/resend.js';

const api = new Hono();

// Schema validation
const transformSchema = z.object({
  text: z.string().min(1).max(10000),
  style: z.enum(Object.keys(STYLES) as [StyleName, ...StyleName[]]),
  zalgoIntensity: z.enum(['mini', 'normal', 'maxi']).optional(),
});

const batchSchema = z.object({
  items: z.array(z.object({
    text: z.string().min(1).max(10000),
    style: z.enum(Object.keys(STYLES) as [StyleName, ...StyleName[]]),
    zalgoIntensity: z.enum(['mini', 'normal', 'maxi']).optional(),
  })).min(1).max(100),
});

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
});

// Health check
api.get('/health', (c) => {
  return c.json({ status: 'ok', version: '1.0.0' });
});

// Shared page styles
const pageStyles = `
  * { box-sizing: border-box; }
  body {
    font-family: system-ui, -apple-system, sans-serif;
    max-width: 600px;
    margin: 0 auto;
    padding: 40px 20px;
    background: #0f172a;
    color: #e2e8f0;
    min-height: 100vh;
  }
  h1 { color: #f8fafc; margin-bottom: 8px; }
  h2 { color: #cbd5e1; font-size: 1.25rem; margin-top: 32px; }
  p { color: #94a3b8; line-height: 1.6; }
  a { color: #60a5fa; }
  .subtitle { color: #64748b; margin-bottom: 32px; }
  .card {
    background: #1e293b;
    border-radius: 12px;
    padding: 24px;
    margin: 20px 0;
    border: 1px solid #334155;
  }
  input {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid #334155;
    border-radius: 8px;
    background: #0f172a;
    color: #e2e8f0;
    font-size: 16px;
    margin-bottom: 16px;
  }
  input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
  }
  button, .btn {
    width: 100%;
    padding: 12px 24px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    text-decoration: none;
    display: inline-block;
    text-align: center;
  }
  button:hover, .btn:hover { background: #2563eb; }
  .btn-secondary {
    background: transparent;
    border: 1px solid #334155;
    color: #94a3b8;
  }
  .btn-secondary:hover { background: #1e293b; }
  .btn-pro { background: #8b5cf6; }
  .btn-pro:hover { background: #7c3aed; }
  .btn-business { background: #f59e0b; }
  .btn-business:hover { background: #d97706; }
  code {
    background: #0f172a;
    padding: 8px 12px;
    border-radius: 6px;
    font-family: monospace;
    display: block;
    margin: 8px 0;
    word-break: break-all;
    border: 1px solid #334155;
  }
  .api-key-display {
    background: #065f46;
    border-color: #10b981;
    color: #6ee7b7;
    font-size: 14px;
    padding: 16px;
    position: relative;
  }
  .copy-btn {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    width: auto;
    padding: 8px 16px;
    font-size: 14px;
  }
  .progress-bar {
    background: #334155;
    border-radius: 4px;
    height: 8px;
    margin: 8px 0 16px;
  }
  .progress-fill {
    background: #3b82f6;
    height: 100%;
    border-radius: 4px;
    transition: width 0.3s;
  }
  .tier-badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
  }
  .tier-free { background: #334155; color: #94a3b8; }
  .tier-pro { background: #7c3aed; color: white; }
  .tier-business { background: #f59e0b; color: black; }
  .hidden { display: none; }
  .error { color: #f87171; margin: 8px 0; }
  .success { color: #34d399; }
  .loading { opacity: 0.7; pointer-events: none; }
  label { display: block; color: #94a3b8; margin-bottom: 6px; font-size: 14px; }
  .link-btn { background: none; border: none; color: #60a5fa; padding: 0; cursor: pointer; font-size: inherit; }
  .link-btn:hover { text-decoration: underline; background: none; }
  hr { border: none; border-top: 1px solid #334155; margin: 24px 0; }
  .mcp-config { font-size: 12px; background: #0f172a; padding: 16px; border-radius: 8px; overflow-x: auto; white-space: pre; }
`;

// Registration page (HTML form)
api.get('/register', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Get API Key - GlyphForge</title>
  <style>${pageStyles}</style>
</head>
<body>
  <h1>Get Your Free API Key</h1>
  <p class="subtitle">Start transforming text with 30+ Unicode styles</p>

  <div class="card" id="registerCard">
    <form id="registerForm">
      <label for="name">Project Name</label>
      <input type="text" id="name" name="name" placeholder="My Awesome App" required>

      <label for="email">Email Address</label>
      <input type="email" id="email" name="email" placeholder="you@example.com" required>

      <button type="submit">Get Free API Key</button>
    </form>

    <p id="error" class="error hidden"></p>

    <hr>
    <p style="text-align: center; margin: 0;">
      Already registered? <button class="link-btn" onclick="showLookup()">Retrieve your API key</button>
    </p>
  </div>

  <div class="card hidden" id="lookupCard">
    <h2 style="margin-top: 0;">Retrieve API Key</h2>
    <form id="lookupForm">
      <label for="lookupEmail">Email Address</label>
      <input type="email" id="lookupEmail" name="email" placeholder="you@example.com" required>
      <button type="submit">Find My Key</button>
    </form>
    <p id="lookupError" class="error hidden"></p>
    <hr>
    <p style="text-align: center; margin: 0;">
      <button class="link-btn" onclick="showRegister()">Create new account</button>
    </p>
  </div>

  <div class="card hidden" id="checkEmailCard">
    <div style="text-align: center;">
      <div style="font-size: 48px; margin-bottom: 16px;">&#9993;</div>
      <h2 style="margin-top: 0; color: #34d399;">Check Your Email</h2>
      <p id="checkEmailMessage">We've sent a verification link to your email address.</p>
      <p>Click the link in the email to get your API key.</p>
      <hr>
      <p style="font-size: 14px; color: #64748b;">Didn't receive the email? Check your spam folder or <button class="link-btn" onclick="showRegister()">try again</button></p>
    </div>
  </div>

  <script>
    const registerCard = document.getElementById('registerCard');
    const lookupCard = document.getElementById('lookupCard');
    const checkEmailCard = document.getElementById('checkEmailCard');

    function showLookup() {
      registerCard.classList.add('hidden');
      checkEmailCard.classList.add('hidden');
      lookupCard.classList.remove('hidden');
    }

    function showRegister() {
      lookupCard.classList.add('hidden');
      checkEmailCard.classList.add('hidden');
      registerCard.classList.remove('hidden');
    }

    function showCheckEmail(message) {
      registerCard.classList.add('hidden');
      lookupCard.classList.add('hidden');
      checkEmailCard.classList.remove('hidden');
      if (message) {
        document.getElementById('checkEmailMessage').textContent = message;
      }
    }

    document.getElementById('registerForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const error = document.getElementById('error');
      error.classList.add('hidden');
      form.classList.add('loading');

      try {
        const res = await fetch('/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: document.getElementById('name').value,
            email: document.getElementById('email').value
          })
        });
        const data = await res.json();
        if (data.success && data.checkEmail) {
          showCheckEmail(data.message);
        } else if (!data.success) {
          error.textContent = data.error || data.message || 'Registration failed';
          error.classList.remove('hidden');
        }
      } catch (err) {
        error.textContent = 'Network error. Please try again.';
        error.classList.remove('hidden');
      }
      form.classList.remove('loading');
    });

    document.getElementById('lookupForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const error = document.getElementById('lookupError');
      error.classList.add('hidden');
      form.classList.add('loading');

      try {
        const res = await fetch('/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: document.getElementById('lookupEmail').value
          })
        });
        const data = await res.json();
        if (data.success && data.checkEmail) {
          showCheckEmail(data.message);
        } else if (!data.success) {
          error.textContent = data.message || 'No account found with that email';
          error.classList.remove('hidden');
        }
      } catch (err) {
        error.textContent = 'Network error. Please try again.';
        error.classList.remove('hidden');
      }
      form.classList.remove('loading');
    });

    // Check if already has key
    const savedKey = localStorage.getItem('glyphforge_api_key');
    if (savedKey) {
      window.location.href = '/dashboard';
    }
  </script>
</body>
</html>
  `);
});

// Dashboard page
api.get('/dashboard', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Dashboard - GlyphForge</title>
  <style>${pageStyles}</style>
</head>
<body>
  <div id="loading">
    <h1>GlyphForge Dashboard</h1>
    <p>Loading your account...</p>
  </div>

  <div id="noKey" class="hidden">
    <h1>GlyphForge Dashboard</h1>
    <p class="subtitle">Sign in to view your account</p>
    <div class="card" id="loginCard">
      <form id="lookupForm">
        <label for="email">Email Address</label>
        <input type="email" id="email" name="email" placeholder="you@example.com" required>
        <button type="submit">Send Access Link</button>
      </form>
      <p id="lookupError" class="error hidden"></p>
      <p id="lookupSuccess" class="success hidden"></p>
      <hr>
      <p style="text-align: center;">
        Don't have an account? <a href="/register">Get a free API key</a>
      </p>
    </div>
    <div class="card hidden" id="checkEmailCard">
      <div style="text-align: center;">
        <div style="font-size: 48px; margin-bottom: 16px;">&#9993;</div>
        <h2 style="margin-top: 0; color: #34d399;">Check Your Email</h2>
        <p>We've sent an access link to your email address.</p>
        <p>Click the link in the email to access your dashboard.</p>
        <hr>
        <p style="font-size: 14px; color: #64748b;">Didn't receive the email? <button class="link-btn" onclick="document.getElementById('checkEmailCard').classList.add('hidden'); document.getElementById('loginCard').classList.remove('hidden');">Try again</button></p>
      </div>
    </div>
  </div>

  <div id="dashboard" class="hidden">
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <div>
        <h1 style="margin-bottom: 4px;">Dashboard</h1>
        <span id="tierBadge" class="tier-badge"></span>
      </div>
      <button class="btn-secondary" style="width: auto;" onclick="logout()">Logout</button>
    </div>

    <div class="card">
      <h2 style="margin-top: 0;">Your API Key</h2>
      <code class="api-key-display" id="apiKeyDisplay">
        <span id="apiKeyText"></span>
        <button class="copy-btn" onclick="copyKey()">Copy</button>
      </code>
    </div>

    <div class="card">
      <h2 style="margin-top: 0;">Usage This Month</h2>
      <p style="margin: 0;"><strong id="usageCount">0</strong> / <span id="usageLimit">3,000</span> requests</p>
      <div class="progress-bar">
        <div class="progress-fill" id="usageBar" style="width: 0%"></div>
      </div>
      <p style="margin: 0; font-size: 14px; color: #64748b;">Total all-time: <span id="usageTotal">0</span> requests</p>
    </div>

    <div class="card" id="upgradeCard">
      <h2 style="margin-top: 0;">Upgrade Your Plan</h2>
      <div style="display: grid; gap: 12px;">
        <button class="btn-pro" onclick="upgrade('pro')">
          Upgrade to Pro - $9/month
          <span style="display: block; font-weight: normal; font-size: 14px; opacity: 0.8;">10,000 requests/month</span>
        </button>
        <button class="btn-business" onclick="upgrade('business')">
          Upgrade to Business - $29/month
          <span style="display: block; font-weight: normal; font-size: 14px; opacity: 0.8;">100,000 requests/month</span>
        </button>
      </div>
    </div>

    <div class="card" id="manageCard" class="hidden">
      <h2 style="margin-top: 0;">Manage Subscription</h2>
      <button class="btn-secondary" onclick="manageSubscription()">Open Billing Portal</button>
    </div>

    <div class="card">
      <h2 style="margin-top: 0;">MCP Configuration</h2>
      <p>Add this to your Claude Desktop config:</p>
      <pre class="mcp-config" id="mcpConfig"></pre>
      <button class="btn-secondary" style="margin-top: 12px;" onclick="copyMcpConfig()">Copy Configuration</button>
    </div>
  </div>

  <script>
    let currentApiKey = localStorage.getItem('glyphforge_api_key');

    function copyKey() {
      navigator.clipboard.writeText(currentApiKey);
      document.querySelector('.copy-btn').textContent = 'Copied!';
      setTimeout(() => document.querySelector('.copy-btn').textContent = 'Copy', 2000);
    }

    function copyMcpConfig() {
      const config = document.getElementById('mcpConfig').textContent;
      navigator.clipboard.writeText(config);
      event.target.textContent = 'Copied!';
      setTimeout(() => event.target.textContent = 'Copy Configuration', 2000);
    }

    function logout() {
      localStorage.removeItem('glyphforge_api_key');
      window.location.reload();
    }

    async function upgrade(plan) {
      try {
        const res = await fetch('/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: currentApiKey,
            plan: plan,
            successUrl: window.location.origin + '/success',
            cancelUrl: window.location.origin + '/dashboard'
          })
        });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          alert(data.error || 'Failed to create checkout session');
        }
      } catch (err) {
        alert('Network error. Please try again.');
      }
    }

    async function manageSubscription() {
      try {
        const res = await fetch('/stripe/portal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: currentApiKey,
            returnUrl: window.location.origin + '/dashboard'
          })
        });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          alert(data.error || 'Failed to open billing portal');
        }
      } catch (err) {
        alert('Network error. Please try again.');
      }
    }

    async function loadDashboard() {
      if (!currentApiKey) {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('noKey').classList.remove('hidden');
        return;
      }

      try {
        const res = await fetch('/dashboard/data?api_key=' + encodeURIComponent(currentApiKey));
        const data = await res.json();

        if (!data.success) {
          localStorage.removeItem('glyphforge_api_key');
          document.getElementById('loading').classList.add('hidden');
          document.getElementById('noKey').classList.remove('hidden');
          return;
        }

        // Populate dashboard
        document.getElementById('apiKeyText').textContent = currentApiKey;
        document.getElementById('usageCount').textContent = data.data.usage.thisMonth.toLocaleString();
        document.getElementById('usageLimit').textContent = data.data.usage.limit.toLocaleString();
        document.getElementById('usageTotal').textContent = data.data.usage.total.toLocaleString();

        const percentage = Math.min((data.data.usage.thisMonth / data.data.usage.limit) * 100, 100);
        document.getElementById('usageBar').style.width = percentage + '%';

        // Tier badge
        const tierBadge = document.getElementById('tierBadge');
        tierBadge.textContent = data.data.tier.toUpperCase();
        tierBadge.className = 'tier-badge tier-' + data.data.tier;

        // Show/hide upgrade vs manage buttons
        if (data.data.tier !== 'free') {
          document.getElementById('upgradeCard').classList.add('hidden');
          document.getElementById('manageCard').classList.remove('hidden');
        }

        // MCP config
        const mcpConfig = {
          mcpServers: {
            glyphforge: {
              command: "npx",
              args: [
                "mcp-remote",
                "https://glyphforge.dev/mcp?api_key=" + currentApiKey
              ]
            }
          }
        };
        document.getElementById('mcpConfig').textContent = JSON.stringify(mcpConfig, null, 2);

        document.getElementById('loading').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');

      } catch (err) {
        document.getElementById('loading').innerHTML = '<p class="error">Failed to load dashboard. Please try again.</p>';
      }
    }

    document.getElementById('lookupForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const error = document.getElementById('lookupError');
      error.classList.add('hidden');

      try {
        const res = await fetch('/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: document.getElementById('email').value })
        });
        const data = await res.json();
        if (data.success && data.checkEmail) {
          // Show check email card
          document.getElementById('loginCard').classList.add('hidden');
          document.getElementById('checkEmailCard').classList.remove('hidden');
        } else if (!data.success) {
          error.textContent = data.message || 'No account found with that email';
          error.classList.remove('hidden');
        }
      } catch (err) {
        error.textContent = 'Network error. Please try again.';
        error.classList.remove('hidden');
      }
    });

    loadDashboard();
  </script>
</body>
</html>
  `);
});

// Dashboard data API
api.get('/dashboard/data', async (c) => {
  const apiKeyValue = c.req.query('api_key');

  if (!apiKeyValue) {
    return c.json({ success: false, error: 'API key required' }, 400);
  }

  const apiKey = await getApiKeyByKey(apiKeyValue);

  if (!apiKey) {
    return c.json({ success: false, error: 'Invalid API key' }, 401);
  }

  const limit = TIER_LIMITS[apiKey.tier as keyof typeof TIER_LIMITS];

  return c.json({
    success: true,
    data: {
      tier: apiKey.tier,
      email: apiKey.email,
      name: apiKey.name,
      usage: {
        thisMonth: apiKey.requestsThisMonth,
        total: apiKey.requestsTotal,
        limit: limit,
      },
    },
  });
});

// Email lookup for returning users
api.post('/lookup', async (c) => {
  const body = await c.req.json<{ email: string }>();

  if (!body.email) {
    return c.json({ success: false, message: 'Email is required' }, 400);
  }

  const apiKey = await getApiKeyByEmail(body.email);

  if (!apiKey) {
    return c.json({ success: false, message: 'No account found with that email' }, 404);
  }

  // Generate new verification token and send access email
  const token = await createVerificationToken(apiKey.id);
  const emailResult = await sendAccessEmail(body.email, token);

  if (!emailResult.success) {
    return c.json({
      success: false,
      error: 'Failed to send email',
      message: emailResult.error,
    }, 500);
  }

  return c.json({
    success: true,
    message: 'Access link sent. Please check your inbox.',
    checkEmail: true,
  });
});

// Checkout redirect page
api.get('/checkout', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Upgrade - GlyphForge</title>
  <style>${pageStyles}</style>
</head>
<body>
  <div id="loading">
    <h1>Redirecting to checkout...</h1>
    <p>Please wait while we prepare your upgrade.</p>
  </div>

  <div id="needKey" class="hidden">
    <h1>Upgrade Your Plan</h1>
    <p class="subtitle">You need to be logged in to upgrade</p>
    <div class="card">
      <p>To upgrade your plan, you need to access your dashboard first.</p>
      <a href="/dashboard" class="btn" style="display: inline-block; margin-top: 16px;">Go to Dashboard</a>
      <hr>
      <p style="text-align: center;">
        Don't have an account? <a href="/register">Get a free API key</a>
      </p>
    </div>
  </div>

  <script>
    const plan = new URLSearchParams(window.location.search).get('plan') || 'pro';
    const savedKey = localStorage.getItem('glyphforge_api_key');

    async function checkout(apiKey) {
      try {
        const res = await fetch('/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: apiKey,
            plan: plan,
            successUrl: window.location.origin + '/success',
            cancelUrl: window.location.origin + '/dashboard'
          })
        });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          document.getElementById('loading').classList.add('hidden');
          document.getElementById('needKey').classList.remove('hidden');
        }
      } catch (err) {
        document.getElementById('loading').innerHTML = '<p class="error">Network error. Please try again.</p>';
      }
    }

    if (savedKey) {
      checkout(savedKey);
    } else {
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('needKey').classList.remove('hidden');
    }
  </script>
</body>
</html>
  `);
});

// Email verification endpoint
api.get('/verify', async (c) => {
  const token = c.req.query('token');

  if (!token) {
    return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Invalid Link - GlyphForge</title>
  <style>${pageStyles}</style>
</head>
<body>
  <div class="card">
    <h1 style="color: #f87171;">Invalid Link</h1>
    <p>This verification link is missing or invalid.</p>
    <a href="/register" class="btn" style="display: inline-block; margin-top: 16px;">Go to Registration</a>
  </div>
</body>
</html>
    `);
  }

  const result = await verifyToken(token);

  if (!result.success) {
    return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Link Expired - GlyphForge</title>
  <style>${pageStyles}</style>
</head>
<body>
  <div class="card">
    <h1 style="color: #f87171;">Link Expired</h1>
    <p>${result.error || 'This verification link has expired or is invalid.'}</p>
    <p>Please request a new link:</p>
    <a href="/register" class="btn" style="display: inline-block; margin-top: 16px;">Get New Link</a>
  </div>
</body>
</html>
    `);
  }

  // Success - show API key
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Email Verified - GlyphForge</title>
  <style>${pageStyles}</style>
</head>
<body>
  <h1 style="color: #34d399;">Email Verified!</h1>
  <p class="subtitle">Your account is now active</p>

  <div class="card">
    <h2 style="margin-top: 0;">Your API Key</h2>
    <p>Save this key - you'll need it for API requests and MCP configuration.</p>
    <code class="api-key-display" id="apiKeyDisplay">
      <span id="apiKeyText">${result.apiKey}</span>
      <button class="copy-btn" onclick="copyKey()">Copy</button>
    </code>
  </div>

  <div class="card">
    <h2 style="margin-top: 0;">What's Next?</h2>
    <p>1. Copy your API key above</p>
    <p>2. Use it to make API requests or configure MCP</p>
    <p>3. View your usage in the dashboard</p>
    <a href="/dashboard" class="btn" style="display: inline-block; margin-top: 16px;">Go to Dashboard</a>
  </div>

  <script>
    // Save to localStorage for dashboard
    localStorage.setItem('glyphforge_api_key', '${result.apiKey}');

    function copyKey() {
      navigator.clipboard.writeText('${result.apiKey}');
      document.querySelector('.copy-btn').textContent = 'Copied!';
      setTimeout(() => document.querySelector('.copy-btn').textContent = 'Copy', 2000);
    }
  </script>
</body>
</html>
  `);
});

// Payment success page
api.get('/success', (c) => {
  const sessionId = c.req.query('session_id');
  return c.html(`
<!DOCTYPE html>
<html>
<head>
  <title>Payment Successful - GlyphForge</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; background: #0f172a; color: #e2e8f0; }
    .success { color: #22c55e; font-size: 48px; }
    h1 { color: #f8fafc; }
    p { color: #94a3b8; line-height: 1.6; }
    code { background: #1e293b; padding: 2px 6px; border-radius: 4px; color: #e2e8f0; }
    a { color: #60a5fa; }
    .tier { font-weight: bold; text-transform: capitalize; }
    .tier-pro { color: #a78bfa; }
    .tier-business { color: #fbbf24; }
    .btn { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px; }
    .btn:hover { background: #2563eb; }
    hr { margin: 30px 0; border: none; border-top: 1px solid #334155; }
  </style>
</head>
<body>
  <div class="success">✓</div>
  <h1>Payment Successful!</h1>
  <p>Your GlyphForge subscription is now active.</p>
  <p id="tierInfo">Loading subscription details...</p>
  <hr>
  <a href="/dashboard" class="btn">Go to Dashboard</a>
  <script>
    const TIER_LIMITS = { free: 3000, pro: 10000, business: 100000, enterprise: 'Unlimited' };

    async function loadTierInfo() {
      const apiKey = localStorage.getItem('glyphforge_api_key');
      if (!apiKey) {
        document.getElementById('tierInfo').innerHTML =
          'Your subscription has been upgraded. <a href="/dashboard">Log in to see details</a>.';
        return;
      }

      try {
        const res = await fetch('/stripe/status?api_key=' + encodeURIComponent(apiKey));
        const data = await res.json();
        const tier = data.tier || 'pro';
        const limit = TIER_LIMITS[tier] || '10,000';
        const limitStr = typeof limit === 'number' ? limit.toLocaleString() : limit;

        document.getElementById('tierInfo').innerHTML =
          'Your API key has been upgraded to <span class="tier tier-' + tier + '">' +
          tier.charAt(0).toUpperCase() + tier.slice(1) + '</span> tier with <strong>' +
          limitStr + ' requests/month</strong>.';
      } catch (e) {
        document.getElementById('tierInfo').innerHTML =
          'Your subscription is now active. <a href="/dashboard">View your dashboard</a> for details.';
      }
    }

    loadTierInfo();
  </script>
</body>
</html>
  `);
});

// List available styles
api.get('/styles', (c) => {
  const styles = getStylesInfo();
  return c.json({
    count: styles.length,
    styles,
  });
});

// Transform single text
api.post('/transform', zValidator('json', transformSchema), async (c) => {
  const { text, style, zalgoIntensity } = c.req.valid('json');

  const options: ZalgoOptions = zalgoIntensity ? { intensity: zalgoIntensity } : {};
  const result = transform(text, style, options);

  return c.json({
    success: true,
    data: {
      original: text,
      style,
      transformed: result,
    },
  });
});

// Transform with GET (for simple requests)
api.get('/transform', async (c) => {
  const text = c.req.query('text');
  const style = c.req.query('style') as StyleName;
  const zalgoIntensity = c.req.query('intensity') as 'mini' | 'normal' | 'maxi' | undefined;

  if (!text) {
    return c.json({ error: 'Missing text parameter' }, 400);
  }

  if (!style || !Object.keys(STYLES).includes(style)) {
    return c.json({
      error: 'Invalid or missing style parameter',
      availableStyles: Object.keys(STYLES),
    }, 400);
  }

  const options: ZalgoOptions = zalgoIntensity ? { intensity: zalgoIntensity } : {};
  const result = transform(text, style, options);

  return c.json({
    success: true,
    data: {
      original: text,
      style,
      transformed: result,
    },
  });
});

// Transform to all styles
api.post('/transform/all', async (c) => {
  const body = await c.req.json<{ text: string }>();

  if (!body.text || typeof body.text !== 'string') {
    return c.json({ error: 'Missing text in request body' }, 400);
  }

  if (body.text.length > 1000) {
    return c.json({ error: 'Text too long for transform/all. Max 1000 characters.' }, 400);
  }

  const results = transformAll(body.text);

  return c.json({
    success: true,
    data: {
      original: body.text,
      transformations: results,
    },
  });
});

// Batch transform
api.post('/batch', zValidator('json', batchSchema), async (c) => {
  const { items } = c.req.valid('json');

  const results = items.map((item, index) => {
    try {
      const options: ZalgoOptions = item.zalgoIntensity ? { intensity: item.zalgoIntensity } : {};
      return {
        index,
        original: item.text,
        style: item.style,
        transformed: transform(item.text, item.style, options),
        success: true,
      };
    } catch (error) {
      return {
        index,
        original: item.text,
        style: item.style,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  });

  return c.json({
    success: true,
    data: {
      totalItems: items.length,
      successful: results.filter(r => r.success).length,
      results,
    },
  });
});

// Register for API key (free tier)
api.post('/register', zValidator('json', registerSchema), async (c) => {
  const { name, email } = c.req.valid('json');

  try {
    // Check if email already exists
    const existing = await getApiKeyByEmail(email);
    if (existing) {
      // If already verified, tell them to use lookup
      if (existing.emailVerified) {
        return c.json({
          success: false,
          error: 'Email already registered',
          message: 'This email is already registered. Use "Retrieve API Key" to access your account.',
        }, 400);
      }
      // If not verified, resend verification email
      const token = await createVerificationToken(existing.id);
      await sendVerificationEmail(email, token, existing.name);
      return c.json({
        success: true,
        message: 'Verification email sent. Please check your inbox.',
        checkEmail: true,
      });
    }

    // Create new account
    const { id } = await createApiKey({ name, email, tier: 'free' });

    // Generate verification token and send email
    const token = await createVerificationToken(id);
    const emailResult = await sendVerificationEmail(email, token, name);

    if (!emailResult.success) {
      return c.json({
        success: false,
        error: 'Failed to send verification email',
        message: emailResult.error,
      }, 500);
    }

    return c.json({
      success: true,
      message: 'Verification email sent. Please check your inbox to get your API key.',
      checkEmail: true,
    });
  } catch (error) {
    return c.json({
      error: 'Failed to create account',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// API documentation
api.get('/docs', (c) => {
  return c.json({
    name: 'GlyphForge API',
    version: '1.0.0',
    description: 'Unicode text transformation API with 30+ styles',
    baseUrl: 'https://api.glyphforge.dev',
    authentication: {
      type: 'Bearer token or query parameter',
      header: 'Authorization: Bearer <your-api-key>',
      query: '?api_key=<your-api-key>',
    },
    endpoints: [
      {
        method: 'GET',
        path: '/styles',
        description: 'List all available transformation styles',
        auth: false,
      },
      {
        method: 'POST',
        path: '/transform',
        description: 'Transform text to a specific style',
        auth: true,
        body: {
          text: 'string (required)',
          style: 'string (required) - one of the available styles',
          zalgoIntensity: 'string (optional) - mini, normal, or maxi',
        },
      },
      {
        method: 'GET',
        path: '/transform',
        description: 'Transform text via query parameters',
        auth: true,
        query: {
          text: 'string (required)',
          style: 'string (required)',
          intensity: 'string (optional) - for zalgo style',
        },
      },
      {
        method: 'POST',
        path: '/transform/all',
        description: 'Transform text to all styles at once',
        auth: true,
        body: {
          text: 'string (required, max 1000 chars)',
        },
      },
      {
        method: 'POST',
        path: '/batch',
        description: 'Batch transform multiple texts',
        auth: true,
        body: {
          items: 'array of { text, style, zalgoIntensity? } (max 100 items)',
        },
      },
      {
        method: 'POST',
        path: '/register',
        description: 'Register for a free API key',
        auth: false,
        body: {
          name: 'string (required)',
          email: 'string (required)',
        },
      },
    ],
    pricing: {
      free: { price: '$0/month', requests: '3,000/month (100/day)' },
      pro: { price: '$9/month', requests: '10,000/month' },
      business: { price: '$29/month', requests: '100,000/month' },
      enterprise: { price: 'Contact us', requests: 'Unlimited' },
    },
    support: 'support@glyphforge.dev',
  });
});

export { api };
