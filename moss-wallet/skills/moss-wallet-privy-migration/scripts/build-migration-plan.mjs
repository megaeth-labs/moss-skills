#!/usr/bin/env node
// build-migration-plan.mjs — build an ORDERED Privy→MOSS asset migration plan.
//
// This is an ASSET migration, not a key migration. This helper NEVER reads,
// requests, derives, or touches private keys or seed phrases. It only orders
// balances into transfers; the Privy SDK signs & broadcasts them, and MOSS
// (mega.connect()) supplies the destination address.
//
// Ordering rule (critical): allowlisted ERC-20s FIRST, then ERC-721/1155 NFTs,
// then the NATIVE token LAST with amount = (nativeBalance - gasReserve). Native
// is SKIPPED if balance <= gasReserve. Non-allowlisted ERC-20/NFT entries are
// SKIPPED (kept in output with status 'skipped', never executed).
//
// Usage (as a module):
//   import { buildMigrationPlan } from './build-migration-plan.mjs';
//   const plan = buildMigrationPlan({ balances, allowlist, from, to, chainId, gasReserve });
//
// Usage (CLI):
//   node build-migration-plan.mjs ./migration-config.json
//   where the JSON file matches the buildMigrationPlan() argument object.
//
// Config shape:
//   {
//     "from": "0x<privy EOA>",
//     "to": "0x<MOSS destination from mega.connect()>",
//     "chainId": 4326,
//     "gasReserve": "200000000000000",            // wei, string or number/bigint
//     "allowlist": ["0xTokenA", "0xTokenB"],       // ERC-20/NFT contract addresses (case-insensitive)
//     "balances": [
//       { "type": "erc20",  "contractAddress": "0xTokenA", "amount": "1500000", "symbol": "USDC" },
//       { "type": "erc721", "contractAddress": "0xNftC",   "tokenId": "42" },
//       { "type": "native", "amount": "5000000000000000000", "symbol": "ETH" }
//     ]
//   }

const HEX_ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const TRANSFER_TYPES = new Set(['native', 'erc20', 'erc721', 'erc1155']);

function toBigInt(value, field) {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`${field} must be a non-negative integer (got ${value})`);
    }
    return BigInt(value);
  }
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    return BigInt(value.trim());
  }
  throw new Error(`${field} must be an integer amount in smallest units (got ${JSON.stringify(value)})`);
}

function normalizeAddress(addr) {
  return typeof addr === 'string' ? addr.toLowerCase() : addr;
}

/**
 * Build an ordered MigrationTransfer[] (each starts at status 'planned',
 * or 'skipped' when excluded). Ordering: ERC-20 → NFT → native (last).
 *
 * @param {object} cfg
 * @param {Array}  cfg.balances    - [{ type, contractAddress?, tokenId?, amount, symbol? }]
 * @param {string[]} cfg.allowlist - allowlisted ERC-20/NFT contract addresses
 * @param {string} cfg.from        - Privy EOA address (0x...)
 * @param {string} cfg.to          - MOSS destination address (0x...)
 * @param {number} cfg.chainId     - target chain id (e.g. 4326 mainnet, 6343 testnet)
 * @param {string|number|bigint} cfg.gasReserve - native units to leave behind for gas
 * @returns {Array} ordered MigrationTransfer[]
 */
export function buildMigrationPlan({ balances, allowlist, from, to, chainId, gasReserve } = {}) {
  // ---- validate inputs (throw on violation) ----
  if (!Array.isArray(balances)) throw new Error('balances must be an array');
  if (!HEX_ADDRESS.test(String(to ?? ''))) {
    throw new Error('to (MOSS destination) must be a 0x-prefixed 40-hex address — get it from mega.connect()');
  }
  if (!HEX_ADDRESS.test(String(from ?? ''))) {
    throw new Error('from (Privy EOA) must be a 0x-prefixed 40-hex address');
  }
  if (!Number.isInteger(chainId) || chainId <= 0) {
    throw new Error('chainId must be a positive integer (e.g. 4326 mainnet, 6343 testnet)');
  }
  if (gasReserve === undefined || gasReserve === null) {
    throw new Error('gasReserve is required — leave native headroom so later transfers can pay gas');
  }
  const reserve = toBigInt(gasReserve, 'gasReserve');
  const allow = new Set((allowlist ?? []).map(normalizeAddress));

  // Defense in depth: this helper must never see key material.
  for (const b of balances) {
    for (const k of Object.keys(b)) {
      if (/privatekey|private_key|seed|mnemonic|secret/i.test(k)) {
        throw new Error(`balances entry must not contain key material (found field "${k}") — this is an asset migration, not a key migration`);
      }
    }
  }

  const erc20 = [];
  const nfts = [];
  let nativeEntry = null;

  for (const b of balances) {
    if (!b || !TRANSFER_TYPES.has(b.type)) {
      throw new Error(`balance entry has invalid type: ${JSON.stringify(b?.type)} (allowed: native, erc20, erc721, erc1155)`);
    }

    if (b.type === 'native') {
      if (nativeEntry) throw new Error('only one native balance entry is allowed');
      nativeEntry = b;
      continue;
    }

    if (!HEX_ADDRESS.test(String(b.contractAddress ?? ''))) {
      throw new Error(`${b.type} entry requires a valid contractAddress (got ${JSON.stringify(b.contractAddress)})`);
    }

    const base = {
      chainId,
      type: b.type,
      from,
      to,
      contractAddress: b.contractAddress,
    };
    if (b.tokenId !== undefined) base.tokenId = String(b.tokenId);

    // Non-allowlisted → kept but skipped (never executed).
    if (!allow.has(normalizeAddress(b.contractAddress))) {
      (b.type === 'erc20' ? erc20 : nfts).push({ ...base, amount: b.amount !== undefined ? String(b.amount) : undefined, status: 'skipped' });
      continue;
    }

    if (b.type === 'erc20') {
      const amt = toBigInt(b.amount, `erc20 ${b.symbol ?? b.contractAddress} amount`);
      erc20.push({ ...base, amount: amt.toString(), status: amt > 0n ? 'planned' : 'skipped' });
    } else {
      // ERC-721 / ERC-1155
      const out = { ...base, status: 'planned' };
      if (b.type === 'erc1155') out.amount = toBigInt(b.amount ?? 1, 'erc1155 amount').toString();
      nfts.push(out);
    }
  }

  // ---- assemble in required order: ERC-20 → NFT → native LAST ----
  const plan = [...erc20, ...nfts];

  if (nativeEntry) {
    const nativeBalance = toBigInt(nativeEntry.amount, 'native amount');
    const transferable = nativeBalance - reserve;
    plan.push({
      chainId,
      type: 'native',
      from,
      to,
      amount: transferable > 0n ? transferable.toString() : '0',
      status: transferable > 0n ? 'planned' : 'skipped', // skip if balance <= gasReserve
    });
  }

  return plan;
}

// ---- CLI entrypoint ----
const isMain = (() => {
  try {
    return process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
  } catch {
    return false;
  }
})();

if (isMain) {
  const path = process.argv[2];
  if (!path) {
    console.error('Usage: node build-migration-plan.mjs <config.json>');
    process.exit(1);
  }
  const { readFileSync } = await import('node:fs');
  let cfg;
  try {
    cfg = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    console.error(`Failed to read/parse ${path}: ${err.message}`);
    process.exit(1);
  }
  try {
    const plan = buildMigrationPlan(cfg);
    console.log(JSON.stringify(plan, null, 2));
  } catch (err) {
    console.error(`Plan error: ${err.message}`);
    process.exit(1);
  }
}
