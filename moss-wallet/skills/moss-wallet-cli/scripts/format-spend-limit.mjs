#!/usr/bin/env node
// format-spend-limit.mjs — build a valid `mega moss create-key --spend-limit` value.
//
// Usage (CLI):   node format-spend-limit.mjs <amount> <period> [token]
//   node format-spend-limit.mjs 25 week 0xfafddbb3fc7688494971a79cc65dca3ef82079e7
//   node format-spend-limit.mjs 0.5 day            # native (sentinel auto-filled)
//   node format-spend-limit.mjs 100 month native   # "native" -> sentinel
//
// Usage (import):
//   import { formatSpendLimit } from './format-spend-limit.mjs';
//   formatSpendLimit('25', 'week', '0xfafd...') // -> "0xfafd...:25:week"
//
// Output is the exact <token>:<amount>:<period> string to pass to --spend-limit.
// Native ETH uses the zero-address sentinel.

export const NATIVE_SENTINEL = '0x0000000000000000000000000000000000000000';
const PERIODS = new Set(['minute', 'hour', 'day', 'week', 'month', 'year']);

/**
 * @param {number|string} amount   positive token amount (human units, e.g. "25")
 * @param {string} period          one of minute|hour|day|week|month|year
 * @param {string} [token]         token contract; omit or "native" for native ETH
 * @returns {string}               "<token>:<amount>:<period>"
 */
export function formatSpendLimit(amount, period, token) {
  if (!PERIODS.has(period)) {
    throw new Error(`Invalid period "${period}". Expected one of: ${[...PERIODS].join(', ')}.`);
  }

  const amountStr = String(amount).trim();
  const amountNum = Number(amountStr);
  if (amountStr === '' || !Number.isFinite(amountNum) || amountNum <= 0) {
    throw new Error(`Invalid amount "${amount}". Expected a positive number.`);
  }

  let tokenAddr;
  if (token === undefined || token === null || token === 'native' || token === '') {
    tokenAddr = NATIVE_SENTINEL;
  } else if (/^0x[0-9a-fA-F]{40}$/.test(token)) {
    tokenAddr = token;
  } else {
    throw new Error(`Invalid token "${token}". Expected a 0x-prefixed 40-hex address or "native".`);
  }

  return `${tokenAddr}:${amountStr}:${period}`;
}

// Run directly: node format-spend-limit.mjs <amount> <period> [token]
if (import.meta.url === `file://${process.argv[1]}`) {
  const [amount, period, token] = process.argv.slice(2);
  if (!amount || !period) {
    console.error('Usage: node format-spend-limit.mjs <amount> <period> [token]');
    process.exit(1);
  }
  try {
    console.log(formatSpendLimit(amount, period, token));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
