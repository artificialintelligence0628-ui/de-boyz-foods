import 'dotenv/config';

const num = (v, d) => (v !== undefined && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : d);
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const hostOf = (u) => { try { return new URL(u).hostname; } catch { return 'localhost'; } };

export const config = {
  env: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: num(process.env.PORT, 4000),
  clientOrigin,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cloudinary: {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  },
  resendKey: process.env.RESEND_API_KEY,
  emailFrom: process.env.EMAIL_FROM || 'De-Boyz Foods <onboarding@resend.dev>',
  // Direct MTN MoMo Collections API ("Request to Pay").
  // MOMO_ENV: mock (local dev, no real prompt) | sandbox (MTN test) | production (live)
  momo: (() => {
    const env = process.env.MOMO_ENV || (process.env.NODE_ENV === 'production' ? 'sandbox' : 'mock');
    const live = env === 'production';
    return {
      env,
      baseUrl: process.env.MOMO_BASE_URL || (live ? 'https://proxy.momoapi.mtn.com' : 'https://sandbox.momodeveloper.mtn.com'),
      targetEnv: live ? process.env.MOMO_TARGET_ENV || 'mtnghana' : 'sandbox',
      currency: live ? 'GHS' : 'EUR', // MTN's sandbox only accepts EUR
      subscriptionKey: process.env.MOMO_SUBSCRIPTION_KEY,
      apiUser: process.env.MOMO_API_USER,
      apiKey: process.env.MOMO_API_KEY,
      callbackUrl: process.env.MOMO_CALLBACK_URL,
    };
  })(),
  // Telecel Cash + AirtelTigo Money go through Paystack's Charge API (MTN stays direct, above).
  // Leave PAYSTACK_SECRET_KEY empty and those two networks show as unavailable at checkout.
  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY,
    baseUrl: 'https://api.paystack.co',
    // Paystack requires an email on every charge; used when the customer didn't give one.
    fallbackEmail: process.env.PAYSTACK_FALLBACK_EMAIL || `payments@${hostOf(clientOrigin)}`,
  },
  store: {
    freeDeliveryThreshold: num(process.env.FREE_DELIVERY_THRESHOLD, 200),
    deliveryFee: num(process.env.DELIVERY_FEE, 15),
    defaultArea: process.env.DEFAULT_DELIVERY_AREA || 'Koforidua',
  },
};

if (config.isProd && config.momo.env === 'mock') {
  throw new Error('MOMO_ENV=mock cannot be used in production');
}
if (config.isProd && config.jwtSecret === 'dev-only-secret-change-me') {
  throw new Error('JWT_SECRET must be set in production');
}
