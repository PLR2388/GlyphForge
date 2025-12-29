import Stripe from 'stripe';
import { Hono } from 'hono';
import { updateApiKeyTier, getApiKeyByKey } from '../db/client.js';
import type { Tier } from '../db/schema.js';

// Initialize Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

// Price IDs from Stripe Dashboard
export const PRICE_IDS = {
  pro: process.env.STRIPE_PRICE_PRO || 'price_pro_monthly',
  business: process.env.STRIPE_PRICE_BUSINESS || 'price_business_monthly',
} as const;

// Stripe routes
export const stripeRoutes = new Hono();

// Create checkout session
stripeRoutes.post('/checkout', async (c) => {
  if (!stripe) {
    return c.json({ error: 'Stripe not configured' }, 500);
  }

  const body = await c.req.json<{
    apiKey: string;
    plan: 'pro' | 'business';
    successUrl?: string;
    cancelUrl?: string;
  }>();

  const { apiKey, plan, successUrl, cancelUrl } = body;

  if (!apiKey || !plan) {
    return c.json({ error: 'Missing apiKey or plan' }, 400);
  }

  if (!['pro', 'business'].includes(plan)) {
    return c.json({ error: 'Invalid plan. Choose pro or business' }, 400);
  }

  // Verify API key exists
  const apiKeyRecord = await getApiKeyByKey(apiKey);
  if (!apiKeyRecord) {
    return c.json({ error: 'Invalid API key' }, 400);
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: PRICE_IDS[plan],
          quantity: 1,
        },
      ],
      success_url: successUrl || `${process.env.APP_URL || 'https://glyphforge.dev'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.APP_URL || 'https://glyphforge.dev'}/`,
      client_reference_id: apiKeyRecord.id,
      customer_email: apiKeyRecord.email,
      metadata: {
        apiKeyId: apiKeyRecord.id,
        plan,
      },
    });

    return c.json({
      success: true,
      url: session.url,
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return c.json({
      error: 'Failed to create checkout session',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// Create customer portal session
stripeRoutes.post('/portal', async (c) => {
  if (!stripe) {
    return c.json({ error: 'Stripe not configured' }, 500);
  }

  const body = await c.req.json<{ apiKey: string; returnUrl?: string }>();
  const { apiKey, returnUrl } = body;

  if (!apiKey) {
    return c.json({ error: 'Missing apiKey' }, 400);
  }

  const apiKeyRecord = await getApiKeyByKey(apiKey);
  if (!apiKeyRecord || !apiKeyRecord.stripeCustomerId) {
    return c.json({ error: 'No subscription found for this API key' }, 400);
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: apiKeyRecord.stripeCustomerId,
      return_url: returnUrl || 'https://glyphforge.dev/dashboard',
    });

    return c.json({
      success: true,
      url: session.url,
      portalUrl: session.url,
    });
  } catch (error) {
    console.error('Stripe portal error:', error);
    return c.json({
      error: 'Failed to create portal session',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// Webhook handler
stripeRoutes.post('/webhook', async (c) => {
  if (!stripe || !stripeWebhookSecret) {
    return c.json({ error: 'Stripe webhooks not configured' }, 500);
  }

  const signature = c.req.header('stripe-signature');
  if (!signature) {
    return c.json({ error: 'Missing stripe-signature header' }, 400);
  }

  const rawBody = await c.req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, stripeWebhookSecret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return c.json({ error: 'Invalid signature' }, 400);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const apiKeyId = session.metadata?.apiKeyId;
        const plan = session.metadata?.plan as Tier;

        if (apiKeyId && plan) {
          await updateApiKeyTier(apiKeyId, plan, {
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
          });
          console.log(`Upgraded ${apiKeyId} to ${plan}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        // Handle subscription updates (plan changes, etc.)
        console.log('Subscription updated:', subscription.id);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        // Downgrade to free tier
        const customerId = subscription.customer as string;

        // Find API key by customer ID and downgrade
        // This would need a DB query by stripeCustomerId
        console.log('Subscription cancelled:', subscription.id, 'customer:', customerId);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Payment failed for invoice:', invoice.id);
        // Could send notification email here
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    return c.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return c.json({ error: 'Webhook processing failed' }, 500);
  }
});

// Get subscription status
stripeRoutes.get('/status', async (c) => {
  const apiKey = c.req.query('api_key') || c.req.header('Authorization')?.replace('Bearer ', '');

  if (!apiKey) {
    return c.json({ error: 'API key required' }, 400);
  }

  const apiKeyRecord = await getApiKeyByKey(apiKey);
  if (!apiKeyRecord) {
    return c.json({ error: 'Invalid API key' }, 400);
  }

  return c.json({
    tier: apiKeyRecord.tier,
    usage: {
      thisMonth: apiKeyRecord.requestsThisMonth,
      total: apiKeyRecord.requestsTotal,
    },
    subscription: apiKeyRecord.stripeSubscriptionId ? {
      active: true,
      customerId: apiKeyRecord.stripeCustomerId,
    } : null,
  });
});
