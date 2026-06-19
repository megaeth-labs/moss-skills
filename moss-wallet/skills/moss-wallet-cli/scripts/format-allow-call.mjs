#!/usr/bin/env node
// format-allow-call.mjs — build a valid `mega moss create-key --allow-call` value.
//
// Usage (CLI):   node format-allow-call.mjs <contract> "<signature>"
//   node format-allow-call.mjs 0xfafddbb3fc7688494971a79cc65dca3ef82079e7 "transfer(address,uint256)"
//   node format-allow-call.mjs 0xRouter "swapExactTokensForTokens(uint256,uint256,address[],address,uint256)"
//
// Usage (import):
//   import { formatAllowCall } from './format-allow-call.mjs';
//   formatAllowCall('0xfafd...', 'transfer(address,uint256)') // -> "0xfafd...:transfer(address,uint256)"
//
// Output is the exact <contract>:<signature> string to pass to --allow-call.
// A write key needs BOTH a matching --spend-limit and an explicit --allow-call scope
// for the contract calls it makes. Native ETH moves go through `mega moss transfer`
// and do not need an --allow-call scope.

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
// A function name followed by a parenthesised (possibly empty) type list, e.g. transfer(address,uint256)
const SIGNATURE_RE = /^[A-Za-z_$][A-Za-z0-9_$]*\([^()]*\)$/;

/**
 * @param {string} contract    0x-prefixed 40-hex contract address
 * @param {string} signature   function signature, e.g. "transfer(address,uint256)"
 * @returns {string}           "<contract>:<signature>"
 */
export function formatAllowCall(contract, signature) {
  if (typeof contract !== 'string' || !ADDRESS_RE.test(contract)) {
    throw new Error(`Invalid contract "${contract}". Expected a 0x-prefixed 40-hex address.`);
  }

  const sig = typeof signature === 'string' ? signature.trim() : '';
  if (!SIGNATURE_RE.test(sig)) {
    throw new Error(
      `Invalid signature "${signature}". Expected name(typeList), e.g. "transfer(address,uint256)".`,
    );
  }

  return `${contract}:${sig}`;
}

// Run directly: node format-allow-call.mjs <contract> "<signature>"
if (import.meta.url === `file://${process.argv[1]}`) {
  const [contract, signature] = process.argv.slice(2);
  if (!contract || !signature) {
    console.error('Usage: node format-allow-call.mjs <contract> "<signature>"');
    process.exit(1);
  }
  try {
    console.log(formatAllowCall(contract, signature));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
