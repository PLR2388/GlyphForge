import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const BASE_URL = process.env.APP_URL || 'https://glyphforge.dev';
const FROM_EMAIL = process.env.FROM_EMAIL || 'GlyphForge <onboarding@resend.dev>';

const emailStyles = `
  body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 40px 20px; }
  .container { max-width: 480px; margin: 0 auto; background: #1e293b; border-radius: 12px; padding: 32px; border: 1px solid #334155; }
  h1 { color: #f8fafc; margin: 0 0 16px; font-size: 24px; }
  p { color: #94a3b8; line-height: 1.6; margin: 0 0 16px; }
  .button { display: inline-block; background: #3b82f6; color: white !important; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 500; margin: 16px 0; }
  .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #334155; font-size: 14px; color: #64748b; }
  .logo { font-size: 28px; margin-bottom: 24px; }
`;

export async function sendVerificationEmail(email: string, token: string, projectName: string): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.error('Resend not configured - RESEND_API_KEY missing');
    return { success: false, error: 'Email service not configured' };
  }

  const verifyUrl = `${BASE_URL}/verify?token=${token}`;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Verify your GlyphForge account',
      html: `
<!DOCTYPE html>
<html>
<head><style>${emailStyles}</style></head>
<body>
  <div class="container">
    <div class="logo">GlyphForge</div>
    <h1>Welcome to GlyphForge!</h1>
    <p>Thanks for signing up with <strong>${projectName}</strong>. Click the button below to verify your email and get your API key:</p>
    <a href="${verifyUrl}" class="button">Verify Email & Get API Key</a>
    <p>Or copy this link: ${verifyUrl}</p>
    <p>This link expires in 24 hours.</p>
    <div class="footer">
      <p>GlyphForge - Unicode Text Transformation API</p>
      <p>If you didn't create this account, you can ignore this email.</p>
    </div>
  </div>
</body>
</html>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send email' };
  }
}

export async function sendAccessEmail(email: string, token: string): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.error('Resend not configured - RESEND_API_KEY missing');
    return { success: false, error: 'Email service not configured' };
  }

  const verifyUrl = `${BASE_URL}/verify?token=${token}`;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Access your GlyphForge account',
      html: `
<!DOCTYPE html>
<html>
<head><style>${emailStyles}</style></head>
<body>
  <div class="container">
    <div class="logo">GlyphForge</div>
    <h1>Access Your Account</h1>
    <p>Click the button below to access your GlyphForge account and view your API key:</p>
    <a href="${verifyUrl}" class="button">Access My Account</a>
    <p>Or copy this link: ${verifyUrl}</p>
    <p>This link expires in 24 hours.</p>
    <div class="footer">
      <p>GlyphForge - Unicode Text Transformation API</p>
      <p>If you didn't request this, you can ignore this email.</p>
    </div>
  </div>
</body>
</html>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to send access email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send email' };
  }
}
