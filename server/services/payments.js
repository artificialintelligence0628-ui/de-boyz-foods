// One entry point for "pay now". Picks the right provider for the customer's network:
//   MTN                    -> direct MTN MoMo Collections API (mtnmomo.js)
//   Telecel, AirtelTigo    -> Paystack Charge API (gateway.js)
import * as mtn from './mtnmomo.js';
import * as gateway from './gateway.js';
import { NETWORKS, NETWORK_IDS, toMsisdn } from './momo.js';
import { config } from '../config.js';

export const isAvailable = (network) => (network === 'mtn' ? true : gateway.isConfigured());

export const listNetworks = () =>
  NETWORK_IDS.map((id) => ({ id, label: NETWORKS[id].label, available: isAvailable(id) }));

// The currency the provider reports back (MTN's sandbox only deals in EUR).
export const currencyFor = (network) => (network === 'mtn' ? config.momo.currency : 'GHS');

// Sends the prompt. Resolves with { next: 'approve' | 'otp', message? }.
export async function start({ network, referenceId, order, phone }) {
  if (network === 'mtn') {
    await mtn.requestToPay({
      referenceId,
      amount: Number(order.total),
      msisdn: toMsisdn(phone),
      externalId: order.order_no,
      payerMessage: `De-Boyz Foods order ${order.order_no}`,
      payeeNote: order.order_no,
    });
    return { next: 'approve' };
  }
  return gateway.requestToPay({
    referenceId,
    amount: Number(order.total),
    phone,
    network,
    email: order.email || config.paystack.fallbackEmail,
  });
}

export function submitOtp({ network, referenceId, code }) {
  if (network === 'mtn') throw Object.assign(new Error('MTN payments do not use a code'), { status: 400 });
  return gateway.submitOtp({ referenceId, code });
}

export const getPayment = (network, referenceId) =>
  network === 'mtn' ? mtn.getPayment(referenceId) : gateway.getPayment(referenceId);
