<!-- AUTO-GENERATED from wallet/best-practices.md by skills/scripts/build-skills.mjs. Do not edit here — edit the source doc and re-run the script. -->

---
description: Patterns, pitfalls, and production-ready examples for building on MOSS.
---

# Best Practices

Patterns, pitfalls, and production-ready examples for shipping MOSS in production.

## UX Patterns

### 1. Initialise Early, Not on Click

The SDK creates an iframe and establishes a Penpal connection — this takes a moment. If you initialise on button click, users feel the delay. `initialise()` is idempotent (the SDK tracks an internal flag), so calling it at app boot and again later is safe.

```typescript
// DO this — initialise when your app loads
// app.ts or main.ts
import { mega } from '@megaeth-labs/wallet-sdk';

await mega.initialise({ network: 'mainnet' });

// DON'T do this — initialise on button click
connectButton.onclick = async () => {
  await mega.initialise({ network: 'mainnet' }); // Delay here
  await mega.connect();
};
```

### 2. Always Subscribe to Status Changes

Connection state can change outside your app, including direct actions from wallet UI. Subscribe once and keep your UI state in sync.

```typescript
mega.events.onStatusChange((status) => {
  if (status.status === 'disconnected') {
    // Clear user data, show connect button
  }

  if (status.status === 'connected') {
    console.log('Connected:', status.address);
  }
});
```

### 3. Handle Every Transaction Result

Transaction methods return a `status` field with three outcomes: `approved`, `cancelled`, `error`. Handle all three explicitly — `cancelled` is not an error, so don't show error toasts when users deliberately cancel.

```typescript
import { parseEther } from 'viem';

const result = await mega.transfer({
  type: 'native',
  to: '0x...',
  amount: parseEther('1').toString(),
});

switch (result.status) {
  case 'approved':
    showSuccess(result.receipt?.hash);
    break;
  case 'cancelled':
    resetUI(); // user rejected — no error
    break;
  case 'error':
    showError(result.error);
    break;
}
```

### 4. Design Permissions Narrowly

Session key permissions are powerful. Keep scope as tight as possible from day one: specific contract scope, low spend limits, short expiry. Avoid wildcard calls, high monthly spends, and long-lived grants. Expose revoke controls in your app — users can also revoke per-app from wallet settings.

```typescript
// Good — specific contract, daily spend limit, 24h expiry
await mega.grantPermissions({
  permissions: {
    expiry: Math.floor(Date.now() / 1000) + 86400,
    permissions: {
      calls: [{ to: '0xYourContractAddress', signature: 'mint(uint256)' }],
      spend: [{
        limit: BigInt('5000000000000000000'), // 5 ETH max per day
        period: 'day',
      }],
    },
  },
});
```

Key rules: keep expiry short (24h for active sessions, 7 days max for background agents), scope every `calls[]` entry with both `to` and `signature`, and use the smallest spend limit your flow can tolerate.

### 5. Silent Mode Requires Granted Permissions

`silent: true` skips approval UI for `callContract()`. It only works after valid permission grants cover the action. Without valid permissions, the wallet falls back to approval UI.

```typescript
// Step 1: Grant permissions (user approves once)
await mega.grantPermissions({
  permissions: {
    expiry: Math.floor(Date.now() / 1000) + 3600,
    permissions: {
      calls: [{ to: gameContractAddress, signature: 'makeMove(uint256)' }],
      spend: [{ limit: BigInt('100000000000000000'), period: 'hour' }],
    },
  },
});

// Step 2: Now transact silently — no popup
await mega.callContract({
  address: gameContractAddress,
  abi: gameAbi,
  functionName: 'makeMove',
  args: [moveId],
  silent: true,
});
```

### 6. Next.js and SSR

`initialise()` creates a DOM iframe, so it must run in the browser. Either gate it behind `useEffect` in a `'use client'` provider, or use the React SDK which handles the client lifecycle for you.

```typescript
'use client';

import { useEffect, useState } from 'react';
import { mega } from '@megaeth-labs/wallet-sdk';

export function WalletProvider({ children }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    mega.initialise({ network: 'mainnet' }).then(() => setReady(true));
  }, []);

  if (!ready) return <LoadingSkeleton />;
  return <>{children}</>;
}
```

Or use the React SDK:

```typescript
import { MegaProvider } from '@megaeth-labs/wallet-sdk-react';

export default function App() {
  return (
    <MegaProvider config={{ network: 'mainnet' }}>
      <YourApp />
    </MegaProvider>
  );
}
```

## Security Hardening

### 7. Sponsor Gas with a Paymaster

Sponsorship is configurable. Choose a mode and fee token that matches your product risk model. Start with `app-only` + `native`; move to `explicit` if you only want limited sponsorship windows.

| Mode | Who pays | Who controls logic | When to use |
| --- | --- | --- | --- |
| `app-only` (default) | Developer sponsor balance | Sponsor endpoint + app-initiated requests | Most production partner integrations. |
| `explicit` | Developer sponsor balance | Sponsor endpoint + per-request sponsorship intent | Sponsor only setup/first-run actions. |
| `everything` | Developer sponsor balance | Sponsor endpoint for all activity | Testing only; not recommended for production. |

Configure sponsorship during initialise:

```typescript
await mega.initialise({
  network: 'mainnet',
  sponsorUrl: 'https://your-paymaster-endpoint.com/sponsor',
  sponsorMode: 'app-only',
  sponsorToken: 'native',
});
```

{% hint style="warning" %}
Your `sponsorUrl` endpoint is called based on the selected sponsorship mode. Enforce rate limits, allowlists, and budget caps — never run an unrestricted sponsor policy.
{% endhint %}

Full implementation details: [Paymaster Guide →](paymaster-setup.md).

### 8. Server-Side Verification

Use `@megaeth-labs/wallet-server-verify` for backend signature verification and SIWE challenge validation.

```typescript
import {
  getMessageToSign,
  verifySignature,
  type MessageConfig,
} from '@megaeth-labs/wallet-server-verify';

const config: MessageConfig = {
  scheme: 'https',
  domain: 'yourapp.com',
  statement: 'Sign in to YourApp',
  uri: 'https://yourapp.com',
  chainId: 4326,
};

// 1. Generate a message for the client to sign
const messageToSign = getMessageToSign(config, '0x...');

// 2. Send messageToSign.message to the client
// 3. Client signs it with mega.signMessage()
// 4. Client sends signature back

// 5. Verify on your server
await verifySignature(config, {
  signature: '0x...',
  address: messageToSign.address,
  message: messageToSign.message,
  nonce: messageToSign.nonce,
  issuedAt: messageToSign.issuedAt,
});
```

| Error | What it means | Action |
| --- | --- | --- |
| `DIFFERENT_MESSAGE` | Signed payload does not match what your backend generated. | Reject request and issue a fresh challenge. |
| `INVALID_SIGNATURE` | Signature does not match payload. | Reject request and require re-sign. |

For agent-driven flows with delegated permissions, see [AI Agent Guide](ai-agent-guide.md). For full method-by-method reference, see [Methods Reference](methods.md).
