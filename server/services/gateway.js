// Telecel Cash and AirtelTigo Money collections, through Paystack's Charge API.
// MTN has its own direct integration (mtnmomo.js). Telecel and AirtelTigo don't offer an
// open, self-serve collections API like MTN's, so these two go through a gateway.
import { config } from '../config.js';
import { NETWORKS } from './momo.js';

const g = config.paystack;
const mock = config.momo.env === 'mock';
const PROVIDER = { telecel: 'vod', airteltigo: 'tgo' }; // Paystack's Ghana provider codes
const mockCharges = new Map(); // dev-only: referenceId -> { at, amount, needsCode, code }

const gatewayError = (message, status = 502) => Object.assign(new Error(message), { status, gateway: true });

export const isConfigured = () => mock || !!g.secretKey;

function assertConfigured() {
  if (!isConfigured()) throw Object.assign(new Error('Online payment is not set up yet'), { status: 503 });
}

async function call(path, body) {
  const res = await fetch(`${g.baseUrl}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${g.secretKey}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

// Paystack answers with a status. Map it to what the customer has to do next:
//   'approve' = a prompt is on their phone,  'otp' = they must enter a voucher code first
// (Telecel: dial *110# to generate a voucher code).
function nextStep(data = {}) {
  if (data.status === 'send_otp') return { next: 'otp', message: String(data.display_text || '').slice(0, 200) };
  return { next: 'approve' };
}

// Starts the charge. Resolves with { next, message? }.
export async function requestToPay({ referenceId, amount, phone, network, email }) {
  assertConfigured();
  if (mock) {
    const needsCode = network === 'telecel'; // dev simulation: Telecel asks for a voucher code
    mockCharges.set(referenceId, { at: Date.now(), amount: String(amount), needsCode, code: false });
    return needsCode
      ? { next: 'otp', message: 'Dial *110# to generate a voucher code, then enter it below.' }
      : { next: 'approve' };
  }
  const { res, json } = await call('/charge', {
    email,
    amount: Math.round(Number(amount) * 100), // pesewas
    currency: 'GHS',
    reference: referenceId,
    mobile_money: { phone, provider: PROVIDER[network] },
  });
  if (!res.ok || json.status === false || !json.data) {
    console.error('Paystack charge error', res.status, json);
    throw gatewayError(`${NETWORKS[network].label} could not start the payment. Try again.`, res.status === 400 || res.status === 422 ? 400 : 502);
  }
  if (json.data.status === 'failed') {
    console.error('Paystack charge failed', json.data);
    throw gatewayError('That number could not be charged. Check it and try again.', 400);
  }
  return nextStep(json.data);
}

// Submits the voucher code (Telecel). Resolves with { next }.
export async function submitOtp({ referenceId, code }) {
  assertConfigured();
  const wrong = () => gatewayError("That code didn't work. Check it and try again.", 400);
  if (mock) {
    const p = mockCharges.get(referenceId);
    if (!p) throw gatewayError('Unknown reference', 404);
    if (!/^\d{4,8}$/.test(code)) throw wrong();
    p.code = true;
    p.at = Date.now();
    return { next: 'approve' };
  }
  const { res, json } = await call('/charge/submit_otp', { otp: code, reference: referenceId });
  if (!res.ok || json.status === false || !json.data || ['failed', 'send_otp'].includes(json.data.status)) {
    console.error('Paystack submit_otp error', res.status, json);
    throw wrong();
  }
  return { next: 'approve' };
}

// Returns { status: 'PENDING' | 'SUCCESSFUL' | 'FAILED', amount, currency } (same shape as MTN's).
export async function getPayment(referenceId) {
  assertConfigured();
  if (mock) {
    const p = mockCharges.get(referenceId);
    if (!p) throw gatewayError('Unknown reference', 404);
    if (p.needsCode && !p.code) return { status: 'PENDING', amount: p.amount, currency: 'GHS' };
    return { status: Date.now() - p.at > 8000 ? 'SUCCESSFUL' : 'PENDING', amount: p.amount, currency: 'GHS' };
  }
  const { res, json } = await call(`/transaction/verify/${encodeURIComponent(referenceId)}`);
  // Right after the prompt is sent Paystack may not know the transaction yet; callers treat this as "still pending".
  if (!res.ok || !json.data) throw gatewayError('Could not check the payment yet', res.status === 404 ? 404 : 502);
  const s = json.data.status;
  return {
    status: s === 'success' ? 'SUCCESSFUL' : s === 'failed' || s === 'reversed' ? 'FAILED' : 'PENDING',
    amount: Number(json.data.amount) / 100,
    currency: json.data.currency,
  };
}
