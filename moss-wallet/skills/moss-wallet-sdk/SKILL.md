---
name: moss-wallet-sdk
description: Builds MOSS embedded-wallet integrations on MegaETH with the @megaeth-labs/wallet-sdk core SDK (the `mega` object). Use when implementing or debugging wallet connect, disconnect, status, transfer, send, swap, callContract, getFromContract, signMessage, signData, balances, or deposit in any JS/TS app (vanilla, Vue, Svelte, Node). Covers mega.initialise() config (network, sponsorUrl), the secure-context/passkey requirement, and the three-way approved/cancelled/error result contract that methods return instead of throwing. Acts as the entry point that routes to the React, permissions, server-verify, paymaster, CLI, Privy-migration, and security-review skills for specialized work.
license: MIT
compatibility: Claude Code, Codex, Cursor, Gemini, Copilot. Targets @megaeth-labs/wallet-sdk v0.1.x.
metadata:
  package: "@megaeth-labs/wallet-sdk"
  network-mainnet-chainid: "4326"
  network-testnet-chainid: "6343"
  wallet-host: "https://account.megaeth.com"
---

# MOSS Wallet SDK (core)

The entry-point skill for the MOSS embedded wallet on MegaETH. The core package exports one object, `mega`, which talks to the hosted wallet at `https://account.megaeth.com` through a hidden iframe. The app never holds keys. Works in any browser JS/TS app — vanilla, Vue, Svelte, or Node-backed frontends. For React, permissions, server verification, paymaster, CLI, or migration work, route to a sibling skill (see [When to switch skills](#when-to-switch-skills)).

## Golden rules

1. **Initialise once at boot, in the browser only.** Call `mega.initialise(config)` early in app lifecycle, not on a button click. It is idempotent — a second call is a no-op. It creates a DOM iframe, so it must not run during SSR; gate behind a client boundary.
2. **Branch on `status`, never rely on throw.** Transaction and signing methods resolve with `status: 'approved' | 'cancelled' | 'error'` (or `'success'` for signing). They do **not** throw on user cancel. Always `switch` on the result.
3. **`cancelled` is neutral, never an error.** Reset the UI; do not show an error toast when the user dismisses a prompt.
4. **Subscribe to `mega.events.onStatusChange` once, right after initialise.** It is a single-handler slot, not a multi-listener bus — subscribing again replaces the previous handler. Fan out through your own store if multiple components need the value. The wallet can disconnect outside your app.
5. **Re-check `mega.status()` after reload.** Do not assume `connected` after a refresh; sessions may not be restored yet. Render initial UI from `status()`.
6. **Passkey creation needs a secure context.** `http://localhost` is fine; `https://` with a trusted cert is fine; `https://localhost` self-signed and `http://` LAN IPs are refused by Chromium. Verify with `scripts/check-secure-context.mjs` before debugging onboarding failures.
7. **Fund with `mega.deposit()`, not a custom UI.** It opens the built-in Unifold funding surface. Do not build your own funding flow.
8. **Say "Recovery Code"** (or "Account Recovery Code") in all UX — never "seed phrase", "backup phrase", or "recovery phrase". The MOSS Recovery Code is MOSS-specific and cannot be imported into external wallets.

## Install

```bash
npm install @megaeth-labs/wallet-sdk
```

No API keys, partner IDs, or env vars are required — the SDK talks to the hosted wallet directly.

## Minimal example: initialise → connect → transfer

```typescript
import { mega } from '@megaeth-labs/wallet-sdk';
import { parseEther } from 'viem';

// 1. Boot — once, in the browser.
await mega.initialise({ network: 'testnet', logging: 'info' });

// 2. Track state changes (single handler — register early).
mega.events.onStatusChange((s) => {
  if (s.status === 'disconnected') {
    // disable transaction actions, show connect button
  }
});

// 3. Connect from a deliberate user action (button click).
const conn = await mega.connect();
if (conn.status !== 'connected') return; // 'cancelled' is neutral

// 4. Transfer — always branch on result.status.
const result = await mega.transfer({
  type: 'native',
  to: '0xRecipientAddress',
  amount: parseEther('0.1').toString(), // wei string for native
});

switch (result.status) {
  case 'approved':
    console.log('hash:', result.receipt?.hash);
    break;
  case 'cancelled':
    resetUI(); // user rejected — no error toast
    break;
  case 'error':
    showError(result.error);
    break;
}
```

## Need → method map (the complete core surface)

| Need | API |
| --- | --- |
| Boot the wallet bridge | `mega.initialise(config)` |
| Prompt the user to connect | `mega.connect()` |
| End the session | `mega.disconnect()` |
| Read current state (no prompt) | `mega.status()` |
| Bring wallet UI forward | `mega.open()` |
| React to state changes | `mega.events.onStatusChange(cb)` |
| Send native / ERC-20 / 721 / 1155 | `mega.transfer(req)` |
| Write to a contract (single or batch) | `mega.callContract(req \| req[])` |
| Read contract state (no gas) | `mega.getFromContract<T>(req)` |
| Sign a plain string (EIP-191) | `mega.signMessage(message)` |
| Sign typed data (EIP-712) | `mega.signData({ data })` |
| Get a MOSS-issued auth JWT | `mega.authenticate()` |
| Grant scoped session permissions | `mega.grantPermissions(req)` |
| Revoke all grants | `mega.revokePermissions()` |
| Read active grants | `mega.getPermissions(address?)` |
| List token balances | `mega.balances({ tokens? })` |
| Open built-in funding UI | `mega.deposit()` |
| Wallet-managed send (token picker) | `mega.send({ token?, destination? })` |
| Wallet-managed swap (routing UI) | `mega.swap({ fromToken?, toToken? })` |

`amount` is always a string: wei for native, smallest unit for tokens. `mega.transfer`, `callContract`, `send`, and `swap` return `TransactionResult` (`approved`/`cancelled`/`error`); `signMessage`, `signData`, and `authenticate` return `success`/`cancelled`/`error`; `grantPermissions` returns `approved`/`cancelled`.

## Config (mega.initialise)

```typescript
await mega.initialise({
  network: 'mainnet',          // or 'testnet' — required
  logging: 'info',             // 'debug' | 'info' | 'warn' | 'error'
  sponsorUrl: 'https://...',   // your paymaster endpoint (optional)
  sponsorMode: 'app-only',     // 'everything' | 'app-only' | 'explicit' (default 'app-only')
  sponsorToken: 'native',      // 'native' | 'usdm' (default 'native')
});
```

Networks: mainnet chainId `4326`, testnet chainId `6343`. Gas is payable in ETH, USDm, or USDT0. Sponsorship config details live in the paymaster skill.

## References

- [quickstart.md](references/quickstart.md) — install → initialise → connect → deposit → transfer walkthrough.
- [methods-reference.md](references/methods-reference.md) — full signatures, params, and response shapes for all 19 `mega` methods.
- [best-practices.md](references/best-practices.md) — production UX/security patterns and the three-way result switch.
- [lifecycle.md](references/lifecycle.md) — recommended initialise → status → connect → onStatusChange → disconnect flow.
- [error-handling.md](references/error-handling.md) — fast triage checklist and common-issue table.
- [security-model.md](references/security-model.md) — iframe trust boundary, what stays server-side.

## Scripts

- `scripts/check-secure-context.mjs` — **RUN it.** Executable Node ESM helper that decides whether a URL/host is a valid WebAuthn secure context for passkey creation. Use it when wallet onboarding fails with TLS/WebAuthn errors.

  ```bash
  node scripts/check-secure-context.mjs http://localhost:5173
  node scripts/check-secure-context.mjs https://yourapp.com
  ```

  Exits `0` for OK/WARN, `1` for INVALID.

## When to switch skills

| If the task is about… | Switch to skill |
| --- | --- |
| React provider + hooks (`MegaProvider`, `useConnect`, `useStatus`, `useBalances`…) | `moss-wallet-react` |
| Smart Approvals — `grantPermissions` payload, `silent` calls, spend caps, scoping | `moss-wallet-permissions` |
| Backend signature/JWT verification (`@megaeth-labs/wallet-server-verify`) | `moss-wallet-server-verify` |
| Gas sponsorship — `sponsorUrl`, sponsor modes, paymaster endpoint | `moss-wallet-paymaster` |
| The `mega` CLI / session keys (`mega moss login`, `create-key`, `execute`…) | `moss-wallet-cli` |
| Migrating assets from a Privy EOA into a MOSS wallet | `moss-wallet-privy-migration` |
| Auditing an integration for trust-boundary / permission risks | `moss-wallet-security-review` |

This skill stays focused on the core `mega` surface and orientation. Hand off to the relevant sibling above for specialized work rather than re-deriving it here.

## Old patterns

<details>
<summary>Stale assumptions to avoid</summary>

- **"Methods throw on cancel."** They don't — they resolve with `cancelled`. Wrapping every call in try/catch to detect cancellation is wrong; branch on `status`.
- **"`onStatusChange` is an event emitter you can add multiple listeners to."** It is a single handler slot; a second subscribe overwrites the first.
- **"Initialise on the connect click."** Adds latency and breaks the idempotent boot pattern. Initialise at app boot.
- **"`https://localhost` with a self-signed cert works."** Chromium refuses it (Firefox happens to allow it, which hides the bug). Use `http://localhost` for local dev.
- **"Build a custom deposit/funding screen."** Use `mega.deposit()` (Unifold) instead.
- **"Call it a seed phrase / backup phrase."** MOSS uses a **Recovery Code**, not importable into external wallets.
- **"Pass `feeToken` in a permission grant."** Deprecated and ignored — the gas token comes from the granted session permissions.
- **"`spend[].limit` is a decimal string."** It is a `bigint` in wei (e.g. `5000000000000000n`).
- **"Poll `status()` on an interval to track connection."** Subscribe to `onStatusChange` instead.

</details>
