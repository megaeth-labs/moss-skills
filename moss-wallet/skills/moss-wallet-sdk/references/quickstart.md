<!-- AUTO-GENERATED from wallet/quickstart.md by skills/scripts/build-skills.mjs. Do not edit here — edit the source doc and re-run the script. -->

# Wallet Quickstart

Install the SDK, initialise the wallet bridge, and send a transaction. No API keys, partner IDs, or environment variables are required — the SDK talks to the hosted wallet directly. Package: `@megaeth-labs/wallet-sdk` · [npm ↗](https://www.npmjs.com/package/@megaeth-labs/wallet-sdk).

{% hint style="warning" %}
**Browser requirements.** MOSS account creation uses WebAuthn/passkeys, which require a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts). Outside one it fails — and on Chromium browsers the error is misleadingly worded as *"WebAuthn is not supported on sites with TLS certificate errors."*

- ✅ `http://localhost:PORT` (no `s`) — works in every browser; preferred for local dev
- ✅ `https://yourdomain.com` with a valid cert — production
- ❌ `https://localhost` with a self-signed cert — **all Chromium browsers** (Chrome, Brave, Edge, Arc, Opera, Vivaldi) refuse. Firefox happens to allow it, which can hide the problem from one teammate while it breaks for everyone else.
- ❌ `http://192.168.x.x` LAN IPs — not a secure context per W3C; refused universally
- For testing on a real phone, use a tunnel with a trusted cert (ngrok, cloudflared)
{% endhint %}

## Step 1 — Install

Current versions are on npm: [`@megaeth-labs/wallet-sdk`](https://www.npmjs.com/package/@megaeth-labs/wallet-sdk) and [`@megaeth-labs/wallet-sdk-react`](https://www.npmjs.com/package/@megaeth-labs/wallet-sdk-react). The commands below install the latest release.

```bash
# pick your package manager
npm install @megaeth-labs/wallet-sdk
pnpm add @megaeth-labs/wallet-sdk
yarn add @megaeth-labs/wallet-sdk
```

## Step 2 — Initialise

Call `mega.initialise()` once early in your app lifecycle. It loads the wallet iframe, connects via Penpal, waits for wallet readiness, and returns the initial connection state. Idempotent — calling it twice is safe.

```typescript
import { mega } from '@megaeth-labs/wallet-sdk';

await mega.initialise({
  network: 'testnet',
  logging: 'info',
  debug: true,
});
```

## Step 3 — Connect a Wallet

```typescript
const { status, address } = await mega.connect();

if (status === 'connected') {
  console.log('Wallet connected:', address);
}
```

The user sees the MOSS wallet UI for account onboarding ("Creating your account" or "Restoring account"). Once authenticated, the promise resolves with their address. For account recovery flows, use **Recovery Code** terminology — this is MOSS-specific and not an importable seed phrase.

## Step 4 — Authenticate User (Optional)

Use this when you want MOSS-led authentication instead of running a direct SIWE challenge in your app.

```typescript
const auth = await mega.authenticate();

if (auth.status === 'success' && auth.jwt) {
  await fetch('/api/auth/moss', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jwt: auth.jwt }),
  });
}
```

## Step 5 — Add Deposit Flow (Recommended)

The built-in MOSS deposit flow is faster to implement and maintain than a custom funding flow. Full guidance: [Deposit Flows (Unifold) →](deposit-flows.md).

```typescript
const state = await mega.status();

if (state.status !== 'connected') {
  await mega.connect();
}

await mega.deposit();
```

## Step 6 — Send a Transfer

```typescript
import { parseEther } from 'viem';

const result = await mega.transfer({
  type: 'native',
  to: '0xRecipientAddress',
  amount: parseEther('0.1').toString(),
});

if (result.status === 'approved') {
  console.log('Transaction hash:', result.receipt.hash);
}
```

## Gas Options

Users can pay gas with **ETH** or enabled stablecoins (currently **USDm** and **USDT0**). Apps that want to sponsor gas pass `sponsorUrl` plus `sponsorMode` (`everything` / `app-only` / `explicit`) and `sponsorToken` (`native` / `usdm`) during `mega.initialise()`. Defaults are `app-only` + `native`.

| Path | Who pays | Control level |
| --- | --- | --- |
| User-paid gas (default) | User (ETH or enabled stablecoins) | Relay-managed |
| Partner sponsorship (`app-only` default) | Developer | Configurable by mode + sponsor policy |
| Partner sponsorship (`explicit` / `everything`) | Developer | Tighter or broader sponsorship control |

Full sponsorship setup: [Paymaster Guide →](paymaster-setup.md).

## You're Live

From here, dig into the [Methods Reference](methods.md), [React Hooks](react/overview.md) for hook-based flows, or [Smart Approvals](core-sdk/permissions.md) to grant session permissions so approved actions run without repeated prompts.

## Which Package Do I Need?

| Package | Use case |
| --- | --- |
| `@megaeth-labs/wallet-sdk` | Any JS/TS app — vanilla, Vue, Svelte, Node |
| `@megaeth-labs/wallet-sdk-react` | React apps — hooks + context provider |
| `@megaeth-labs/wallet-server-verify` | Server-side auth — verify wallet ownership |
