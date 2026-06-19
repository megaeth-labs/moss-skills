#!/usr/bin/env node
// build-permission-policy.mjs
//
// Build and validate the EXACT mega.grantPermissions() payload for MOSS Smart
// Approvals (session-key grants on MegaETH).
//
// Two ways to use it:
//
//   1) Import it in your code:
//        import { buildPermissionPolicy } from './build-permission-policy.mjs';
//        const payload = buildPermissionPolicy({ calls, spend, ttlSeconds });
//        await mega.grantPermissions(payload);
//      `payload.permissions.permissions.spend[].limit` stays a bigint, ready
//      to pass straight into the SDK.
//
//   2) Run it from the CLI to generate / sanity-check a payload from JSON:
//        node build-permission-policy.mjs ./policy.json
//        cat policy.json | node build-permission-policy.mjs
//      Input JSON shape:
//        { "ttlSeconds": 21600,
//          "calls": [{ "to": "0x...", "signature": "rebalance()" }],
//          "spend": [{ "limit": "200000000000000000", "period": "day",
//                      "token": "0x..." }] }   // token optional; omit for native
//      It prints the payload as JSON with spend.limit serialised as a STRING
//      (JSON cannot hold bigint). At the real grantPermissions() call site you
//      MUST convert each spend.limit back to a bigint, e.g. BigInt(limit).

const VALID_PERIODS = new Set([
  'minute',
  'hour',
  'day',
  'week',
  'month',
  'year',
]);

function isHexAddress(value) {
  return typeof value === 'string' && /^0x[0-9a-fA-F]+$/.test(value) && value.length > 2;
}

/**
 * Build the exact mega.grantPermissions() payload, validating every field.
 *
 * @param {object} input
 * @param {{ to: string, signature: string }[]} input.calls
 * @param {{ limit: bigint|number|string, period: string, token?: string }[]} input.spend
 * @param {number} input.ttlSeconds  Seconds from now until the grant expires.
 * @returns {{ permissions: { expiry: number, permissions: {
 *   calls: { to: string, signature: string }[],
 *   spend: { limit: bigint, period: string, token?: string }[] } } }}
 */
export function buildPermissionPolicy({ calls, spend, ttlSeconds } = {}) {
  // ---- ttlSeconds ----
  if (typeof ttlSeconds !== 'number' || !Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
    throw new Error('ttlSeconds must be a positive, finite number (seconds from now).');
  }

  // ---- calls ----
  if (!Array.isArray(calls)) {
    throw new Error('calls must be an array (use [] only if you grant spend-only).');
  }
  const normalizedCalls = calls.map((call, i) => {
    if (!call || typeof call !== 'object') {
      throw new Error(`calls[${i}] must be an object with { to, signature }.`);
    }
    if (!isHexAddress(call.to)) {
      throw new Error(`calls[${i}].to must be a non-empty 0x-prefixed address.`);
    }
    if (typeof call.signature !== 'string' || call.signature.trim() === '') {
      throw new Error(
        `calls[${i}].signature must be a non-empty function signature string ` +
          `(e.g. 'rebalance()'). Every call needs BOTH to AND signature — never to-only.`,
      );
    }
    return { to: call.to, signature: call.signature };
  });

  // ---- spend ----
  if (!Array.isArray(spend)) {
    throw new Error('spend must be an array (use [] only if you grant calls-only).');
  }
  const normalizedSpend = spend.map((entry, i) => {
    if (!entry || typeof entry !== 'object') {
      throw new Error(`spend[${i}] must be an object with { limit, period }.`);
    }
    let limit;
    try {
      limit = BigInt(entry.limit);
    } catch {
      throw new Error(
        `spend[${i}].limit must be coercible to BigInt (wei). ` +
          `Got: ${JSON.stringify(entry.limit)}.`,
      );
    }
    if (limit < 0n) {
      throw new Error(`spend[${i}].limit must not be negative.`);
    }
    if (!VALID_PERIODS.has(entry.period)) {
      throw new Error(
        `spend[${i}].period must be one of ${[...VALID_PERIODS].join(', ')}. ` +
          `Got: ${JSON.stringify(entry.period)}.`,
      );
    }
    const out = { limit, period: entry.period };
    if (entry.token !== undefined) {
      if (!isHexAddress(entry.token)) {
        throw new Error(
          `spend[${i}].token, when set, must be a 0x-prefixed token address ` +
            `(omit it entirely for the native token).`,
        );
      }
      out.token = entry.token;
    }
    return out;
  });

  if (normalizedCalls.length === 0 && normalizedSpend.length === 0) {
    throw new Error('Grant is empty: provide at least one call or one spend entry.');
  }

  return {
    permissions: {
      expiry: Math.floor(Date.now() / 1000) + ttlSeconds,
      permissions: {
        calls: normalizedCalls,
        spend: normalizedSpend,
      },
    },
  };
}

// ---- CLI entrypoint ----------------------------------------------------------

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

function serialise(payload) {
  // JSON cannot represent bigint — emit spend.limit as a string and remind the
  // caller to convert it back to a bigint at the real grantPermissions() site.
  return JSON.stringify(
    payload,
    (_key, value) => (typeof value === 'bigint' ? value.toString() : value),
    2,
  );
}

async function main() {
  const argPath = process.argv[2];
  let raw;
  try {
    if (argPath) {
      const { readFile } = await import('node:fs/promises');
      raw = await readFile(argPath, 'utf8');
    } else {
      raw = await readStdin();
    }
  } catch (err) {
    console.error(`Failed to read input: ${err.message}`);
    process.exit(1);
  }

  if (!raw || raw.trim() === '') {
    console.error(
      'Usage: node build-permission-policy.mjs <config.json>  (or pipe JSON via stdin)',
    );
    process.exit(1);
  }

  let config;
  try {
    config = JSON.parse(raw);
  } catch (err) {
    console.error(`Input is not valid JSON: ${err.message}`);
    process.exit(1);
  }

  let payload;
  try {
    payload = buildPermissionPolicy(config);
  } catch (err) {
    console.error(`Invalid policy: ${err.message}`);
    process.exit(1);
  }

  console.log(
    '// NOTE: spend[].limit is serialised as a STRING below (JSON has no bigint).',
  );
  console.log(
    '// At the real mega.grantPermissions() call site it MUST be a bigint, e.g. BigInt(limit).',
  );
  console.log(serialise(payload));
}

// Run only when invoked directly, not when imported.
import { fileURLToPath } from 'node:url';
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
