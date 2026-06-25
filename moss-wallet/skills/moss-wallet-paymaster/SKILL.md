---
name: moss-wallet-paymaster
description: "Configures MOSS gas sponsorship and the partner paymaster endpoint on MegaETH. Use when sponsoring gas for users: set sponsorUrl, sponsorMode (app-only default, explicit, or everything), and sponsorToken (native or usdm) in mega.initialise() or MegaProvider, and build the backend sponsor endpoint that validates the request, enforces contract allowlists, budget caps, and rate limits, then signs or rejects. Use explicit mode with per-call sponsor: true for onboarding-only sponsorship. Encodes the rule that sponsorship policy stays server-side and everything mode is testing-only."
---

# MOSS Wallet Paymaster (Gas Sponsorship)

Sponsor gas for your users on MegaETH. The client picks *what* to sponsor (`sponsorMode` + per-call `sponsor`); your backend at `sponsorUrl` decides *whether* to sponsor each request and signs the approval. Without sponsorship, users already pay gas in ETH, USDm, or USDT0 out of the box — you only need a paymaster when you want to pay for them.

## Golden rules

1. **Start with `sponsorMode: 'app-only'` + `sponsorToken: 'native'`.** These are the defaults and the right baseline for most production integrations. `app-only` sponsors app-initiated requests; wallet-UI swaps/sends stay user-paid.
2. **`sponsorMode: 'everything'` is testing-only — never ship it.** It sponsors *anything* the user does, including wallet-UI swaps/transfers, and will drain your sponsor balance.
3. **All sponsorship policy lives server-side at `sponsorUrl`.** Never put allowlists, budgets, or approval logic in the client — it is public. The endpoint MUST enforce, for every request: a **contract allowlist**, a **budget cap** (daily/monthly, global + per-account), and a **rate limit** (per-user + per-IP).
4. **Use `sponsorMode: 'explicit'` for onboarding-only sponsorship.** In explicit mode nothing is sponsored unless the specific call sets `sponsor: true`. Ideal for paying for first-time setup without subsidizing every later action.
5. **Funding a wallet is not sponsoring gas.** Adding ETH/stablecoins to a user's wallet is `mega.deposit()` (built-in Unifold UI) — a separate concern. Don't conflate it with the paymaster. See `references/deposit-flows.md`.

## Install

```bash
npm i @megaeth-labs/wallet-sdk
# React apps:
npm i @megaeth-labs/wallet-sdk-react
# Backend sponsor endpoint (Express example uses no MOSS package):
npm i express
```

## Client config — core SDK

Set sponsorship once at boot. Defaults are backward-compatible: passing only `sponsorUrl` keeps `app-only` + `native`.

```typescript
import { mega } from '@megaeth-labs/wallet-sdk';

await mega.initialise({
  network: 'mainnet',
  sponsorUrl: 'https://your-server.com/sponsor', // your backend endpoint
  sponsorMode: 'app-only', // default; 'explicit' | 'everything'(testing-only)
  sponsorToken: 'native',  // default; or 'usdm'
});
```

## Client config — React (MegaProvider)

Same config shape. The provider owns its own QueryClient — do not nest another `QueryClientProvider` under it.

```tsx
'use client';
import { MegaProvider } from '@megaeth-labs/wallet-sdk-react';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <MegaProvider
      config={{
        network: 'mainnet',
        sponsorUrl: 'https://your-server.com/sponsor',
        sponsorMode: 'app-only',
        sponsorToken: 'native',
      }}
    >
      {children}
    </MegaProvider>
  );
}
```

## Explicit mode — onboarding-only sponsorship

In `sponsorMode: 'explicit'`, only calls marked `sponsor: true` hit your endpoint; everything else is user-paid. Both `transfer` and `callContract` accept `sponsor`.

```typescript
await mega.initialise({
  network: 'mainnet',
  sponsorUrl: 'https://your-server.com/sponsor',
  sponsorMode: 'explicit',
  sponsorToken: 'native',
});

// Sponsored — requests approval from your sponsorUrl endpoint
const minted = await mega.callContract({
  address: '0xContractAddress',
  abi: contractAbi,
  functionName: 'mint',
  args: [1n],
  sponsor: true,
});

// Methods resolve (never throw) on cancel — branch on status.
if (minted.status === 'approved') {
  // success: minted.receipt.transactionHash
} else if (minted.status === 'cancelled') {
  // user backed out — NEUTRAL, do not show an error
} else {
  // minted.status === 'error' — minted.error
}

// Not sponsored — user pays gas
await mega.transfer({ type: 'native', to: '0xRecipient', amount: '1000000000000000' });
```

## Backend sponsor endpoint

The endpoint receives the proposed operation, validates it against your policy, and either returns the sponsorship approval payload or rejects with a structured JSON error + correct status code. Required checks, in order: contract allowlist (403) → rate limit (429) → budget cap (403) → sign/approve.

Read and adapt `scripts/sponsor-endpoint-snippet.ts` — it is a copy-ready Express skeleton with the three policy gates stubbed and commented. Wire the stubs to your real store (Redis/DB) and your paymaster signing.

## Capability map

| Need | API / field |
| --- | --- |
| Turn on sponsorship | `sponsorUrl` in `mega.initialise()` / `MegaProvider` config |
| Default safe sponsorship | `sponsorMode: 'app-only'`, `sponsorToken: 'native'` |
| Sponsor only flagged calls | `sponsorMode: 'explicit'` + per-call `sponsor: true` |
| Sponsor a contract call | `mega.callContract({ ..., sponsor: true })` |
| Sponsor a transfer | `mega.transfer({ ..., sponsor: true })` |
| Sponsor a permission grant | `mega.grantPermissions({ permissions, sponsor: true })` |
| Pay sponsor fees in stablecoin | `sponsorToken: 'usdm'` |
| Approve/reject a request | your backend at `sponsorUrl` (see script) |
| Fund a wallet (NOT sponsorship) | `mega.deposit()` — see deposit-flows.md |

## References

- See `references/paymaster-setup.md` for the full sponsorship-mode matrix, provider support (Porto self-hosted, Alchemy, MegaETH managed), the transaction flow, and the risk table.
- See `references/deposit-flows.md` for `mega.deposit()` (Unifold) — funding the wallet, which is separate from sponsoring gas.

## Scripts

- `scripts/sponsor-endpoint-snippet.ts` — **READ / adapt**, not executed here. A TypeScript Express skeleton for your `sponsorUrl` endpoint with the allowlist, rate-limit, and budget gates stubbed. Copy it into your backend and replace the TODO stubs with real storage and paymaster signing.

## When to switch skills / Related skills

- Verifying user sign-in or SIWE/JWT on your backend → `moss-wallet-server-verify`.
- Session keys / `silent` calls / spend & call grants → `moss-wallet-permissions`.
- General SDK setup, connect/transfer/callContract → `moss-wallet-sdk`.
- React provider + hooks details → `moss-wallet-react`.
- Hardening the sponsor endpoint and broader prod checks → `moss-wallet-security-review`.

## Old patterns

<details>
<summary>Stale assumptions to avoid</summary>

- Do NOT build a custom funding UI to "give users gas" — use `mega.deposit()`. Sponsorship and funding are different concerns.
- Do NOT put allowlists, budgets, or approval logic client-side — the client is public; policy must live behind `sponsorUrl`.
- Do NOT default to or ship `sponsorMode: 'everything'`; it is for local testing only.
- Do NOT assume users need an ETH balance — gas is payable in ETH, USDm, or USDT0 by default, so sponsorship is optional.
- Do NOT treat `status: 'cancelled'` as an error — methods resolve (never throw) on user cancel; only `status: 'error'` is a failure.
- `sponsorToken` only accepts `'native'` or `'usdm'` (not arbitrary tokens).

</details>
