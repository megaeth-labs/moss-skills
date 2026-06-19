<!-- AUTO-GENERATED from wallet/paymaster-setup.md by skills/scripts/build-skills.mjs. Do not edit here — edit the source doc and re-run the script. -->

# Paymaster Guide

MOSS sponsorship is configurable per partner: choose a sponsor URL, sponsorship mode, and sponsor fee token. Default behavior is backward-compatible — if you already use `sponsorUrl`, the defaults stay `app-only` mode and `native` fee token.

For funding UX (users adding ETH/stablecoins to their wallet), use the built-in [Deposit Flows](deposit-flows.md) instead of building your own.

## Gas Abstraction at a Glance

| Path | Who pays | Who controls sponsorship |
| --- | --- | --- |
| User-paid token gas (default) | User | No sponsor endpoint needed |
| Partner sponsorship via sponsor config | Developer sponsor balance | Partner backend policy via `sponsorUrl` + mode |

## Out-Of-Box Gas Payment (Default)

Built in. No developer setup required. Users can pay gas with **ETH** or enabled stablecoins (currently **USDm** and **USDT0**) — no mandatory ETH balance. The MegaETH relay handles token-gas routing and execution.

## Sponsorship Modes

| Mode | Behavior | When to use |
| --- | --- | --- |
| `app-only` (default) | Sponsor app-initiated requests. Wallet UI swaps/transfers are paid by the user. | Most production partner integrations. |
| `explicit` | Sponsor only requests your app marks with `sponsor: true`. | Onboarding/setup sponsorship without paying for all downstream actions. |
| `everything` | Sponsor anything the user does, including wallet UI swaps/transfers. | Testing only. Not recommended for production. |

Sponsors can pay fees with `ETH` (default) or `USDm`.

## Provider Support

| Provider | Status | Notes |
| --- | --- | --- |
| [Porto-compatible self-hosted paymaster](https://porto.sh/sdk/guides/sponsoring) | Live | Use your own sponsor account + approval endpoint and pass it into MOSS via `sponsorUrl`. |
| [Alchemy Gas Manager](https://www.alchemy.com/docs/wallets/supported-chains) | Coming soon | Alchemy publicly notes MegaETH mainnet support is planned Day 1. |
| MegaETH managed paymaster | In progress | MegaETH's managed paymaster service will be available for partner teams. |

## Client Setup

Set sponsorship URL + mode + fee token during SDK initialisation. Existing sponsorship integrations keep working — they don't automatically sponsor wallet-internal swaps/sends.

```typescript
import { mega } from '@megaeth-labs/wallet-sdk';

await mega.initialise({
  network: 'mainnet',
  sponsorUrl: 'https://your-server.com/sponsor',
  sponsorMode: 'app-only', // default
  sponsorToken: 'native',  // default, or 'usdm'
});
```

For React apps, the same config goes into `MegaProvider`:

```tsx
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

## Server Setup

{% hint style="warning" %}
Keep paymaster decisions server-side. Never expose sponsorship policy logic in the client.
{% endhint %}

Your paymaster endpoint must do four things for every incoming sponsorship request:

1. Receive the proposed UserOperation payload from the wallet flow.
2. Validate against your rules (allowlisted contracts, budgets, rate limits).
3. Sign and return sponsorship data when approved.
4. Reject quickly with structured errors when rules fail.

```typescript
import express from 'express';

const app = express();
app.use(express.json());

function isAllowedContract(target?: string) {
  const allowlist = new Set([
    '0xYourPrimaryContract',
    '0xYourRewardsContract',
  ]);
  return !!target && allowlist.has(target);
}

app.post('/sponsor', async (req, res) => {
  const { userOperation, account, target } = req.body ?? {};

  if (!userOperation || !account) {
    return res.status(400).json({ error: 'INVALID_REQUEST' });
  }

  if (!isAllowedContract(target)) {
    return res.status(403).json({ error: 'CONTRACT_NOT_ALLOWED' });
  }

  const withinBudget = true; // replace with your quota + spend checks
  if (!withinBudget) {
    return res.status(429).json({ error: 'SPONSOR_BUDGET_EXCEEDED' });
  }

  // Replace with your paymaster signing implementation.
  return res.json({ paymasterAndData: '0xSignedPaymasterPayload' });
});
```

### Risks to Protect Against

| Risk | What to implement |
| --- | --- |
| Rate limiting | Per-user and per-IP limits with short windows and burst caps. |
| Budget caps | Daily/monthly sponsorship ceilings globally and per-account. |
| Contract allowlists | Only sponsor calls to approved contracts and methods. |
| Monitoring | Alert on error spikes, spend anomalies, and endpoint latency. |

## Explicit Mode

In `sponsorMode: 'explicit'`, sponsorship is only requested when the specific action includes `sponsor: true`. Other calls execute as user-paid.

```typescript
await mega.initialise({
  network: 'mainnet',
  sponsorUrl: 'https://your-server.com/sponsor',
  sponsorMode: 'explicit',
  sponsorToken: 'native',
});

// Sponsored — requests sponsorship from your endpoint
await mega.transfer({
  type: 'native',
  to: '0xRecipientAddress',
  amount: '10000000000000000',
  sponsor: true,
});

await mega.callContract({
  address: '0xContractAddress',
  abi: contractAbi,
  functionName: 'mint',
  args: [1n],
  sponsor: true,
});

// Not sponsored — user pays gas
await mega.transfer({
  type: 'native',
  to: '0xRecipientAddress',
  amount: '1000000000000000',
});
```

## Transaction Flow

**Default (user-paid):** user action → wallet approval → gas paid with ETH or enabled stablecoins → transaction submits.

**Sponsored:** user action → wallet/app requests sponsorship based on mode → sponsor endpoint approves gas → transaction submits with sponsor-paid fees.

## Related

- [Best Practices](best-practices.md) — security guidance for permissions, session keys, and production hardening.
- [Server Verify](server-verify.md) — verify SIWE signature payloads on your backend auth flows.
