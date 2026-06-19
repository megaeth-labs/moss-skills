<!-- AUTO-GENERATED from wallet/methods.md + wallet/methods/*.md by skills/scripts/build-skills.mjs. Do not edit here — edit the source doc and re-run the script. -->

# Method Reference

Complete reference for `@megaeth-labs/wallet-sdk` — 19 methods covering connection, signing, transactions, contract calls, Smart Approvals, balances, and deposits. Zero framework dependencies; works in any browser environment.

The SDK embeds `https://account.megaeth.com` in a hidden iframe, communicates via Penpal, and exposes one object: `mega`.

```bash
npm install @megaeth-labs/wallet-sdk
```

Typical lifecycle: `initialise → connect → [transfer / callContract / signMessage / grantPermissions / send / swap] → disconnect`.

## Setup & Connection

| Method | Purpose |
| --- | --- |
| [`mega.initialise(config)`](methods/initialise.md) | Create the wallet iframe and bridge, wait for ready. |
| [`mega.connect()`](methods/connect.md) | Prompt the user to authenticate; resolves with connection status. |
| [`mega.disconnect()`](methods/disconnect.md) | Terminate the active wallet session. |
| [`mega.status()`](methods/status.md) | Read current connection state without prompting. |
| [`mega.open()`](methods/open.md) | Show the wallet UI overlay without an explicit action. |
| [`mega.events.onStatusChange(cb)`](methods/on-status-change.md) | Subscribe to connection state changes. |

## Transactions

| Method | Purpose |
| --- | --- |
| [`mega.transfer(request)`](methods/transfer.md) | Send native or ERC-20/721/1155 transfers. |
| [`mega.callContract(request)`](methods/call-contract.md) | Execute contract write functions, single or batch. |
| [`mega.getFromContract(request)`](methods/get-from-contract.md) | Read contract state. |

## Signing

| Method | Purpose |
| --- | --- |
| [`mega.signMessage(message)`](methods/sign-message.md) | Sign an arbitrary text payload. |
| [`mega.signData(request)`](methods/sign-data.md) | Sign structured (EIP-712) data. |
| [`mega.authenticate()`](methods/authenticate.md) | Request a MOSS-issued JWT for backend session exchange. |

## Smart Approvals (Policy Engine)

| Method | Purpose |
| --- | --- |
| [`mega.grantPermissions(request)`](methods/grant-permissions.md) | Grant scoped delegated permissions for silent execution. |
| [`mega.revokePermissions()`](methods/revoke-permissions.md) | Revoke all active delegated permissions. |
| [`mega.getPermissions(address?)`](methods/get-permissions.md) | Read active permission grants. |

For the conceptual model, see [Smart Approvals (Policy Engine)](core-sdk/permissions.md).

## Wallet

| Method | Purpose |
| --- | --- |
| [`mega.deposit()`](methods/deposit.md) | Open the built-in deposit/funding UI. |
| [`mega.balances(request)`](methods/balances.md) | Fetch wallet token balances. |
| [`mega.send(request)`](methods/send.md) | Open the wallet-managed send flow. |
| [`mega.swap(request)`](methods/swap.md) | Open the wallet-managed swap flow. |

## Shared Types

```typescript
type ConnectionStatus = {
  status: 'connected' | 'disconnected' | 'cancelled';
  address?: `0x${string}`;
  network: 'mainnet' | 'testnet';
};

type TransactionResult = {
  status: 'approved' | 'cancelled' | 'error';
  receipt?: {
    hash: `0x${string}`;
    blockHash: string;
    blockNumber: number;
    chainId: number;
    gasUsed: number;
    logs: { address: `0x${string}`; data: `0x${string}`; topics: string[] }[];
    status: string;
    transactionHash: `0x${string}`;
  };
  receipts?: TransactionResult['receipt'][];  // populated for batch callContract
  error?: string;
  silentHasUsedFallback?: boolean;  // true when silent fell back to UI approval
};
```

Per-method response shapes (e.g., `SignMessageResponse`, `OwnedTokenResponse`, `Permission`) live on their respective method pages.

## Cross-Cutting Guides

- [SDK installation](core-sdk/installation.md) — package install, import surface, what you get.
- [Connection lifecycle](core-sdk/lifecycle.md) — the recommended setup → connect → disconnect flow.
- [Smart Approvals deep-guide](core-sdk/permissions.md) — when to grant, how to scope, revocation patterns.
- [Security model](core-sdk/security.md) — iframe model, trust boundaries, what stays server-side.
- [Troubleshooting](core-sdk/error-handling.md) — common errors and triage steps.


---

<!-- wallet/methods/authenticate.md -->

# mega.authenticate()

Request an auth JWT from MOSS so your app can verify account identity without implementing a direct SIWE prompt flow. The user sees a single MOSS-led auth prompt; the resulting JWT goes to your backend for verification.

**Use this when** you want login/identity and want MOSS to own the challenge UX — your backend just verifies a JWT. If instead you need a raw signature over your own message (EIP-191, custom nonce, attestation), use [`signMessage()`](sign-message.md) and verify it yourself with [Server Verify](../server-verify.md). For full integration patterns, see [MOSS Authentication](../authentication.md).

## Signature

`mega.authenticate(): Promise<AuthenticateResponse>`

## Parameters

None.

## Example

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

## Response

```typescript
type AuthenticateResponse = {
  status: 'success' | 'cancelled' | 'error';
  error?: string;
  jwt?: string;
};
```

| Status | Action |
| --- | --- |
| `success` + `jwt` | Send to backend verification / session exchange. |
| `cancelled` | User dismissed the prompt. Show neutral retry UX. |
| `error` | Operational failure. Log + show retry guidance. Keep app state intact. |

## Notes

Don't trust client-only auth state. Validate the JWT server-side before issuing app sessions or granting access.


---

<!-- wallet/methods/balances.md -->

# mega.balances()

Fetch token balances for the connected wallet. Optionally filter to a specific set of token addresses.

## Signature

`mega.balances(request: BalancesRequest): Promise<OwnedTokenResponse[]>`

## Parameters

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `tokens` | `string[]` | optional | Filter to specific contract addresses. Omit to return all wallet tokens. |

## Example

```typescript
const balances = await mega.balances({
  tokens: ['0xTokenA', '0xTokenB'],
});

console.log(balances);
```

## Response

```typescript
type OwnedTokenResponse = {
  name: string;
  symbol: string;
  decimals: number;
  address: string;
  balance: string;          // raw integer string
  displayBalance: string;   // human-readable, decimals applied
  image?: string;
  usdPrice?: string;
  usdBalance?: string;
  marketCap?: string;
  volume?: string;
  holders?: number;
  percentChange?: number;
};
```

## Notes

- Use `displayBalance` for UI, `balance` for programmatic logic.
- Market data fields (`usdPrice`, `percentChange`, `marketCap`) are optional enrichment — not guaranteed for every token.
- Requires an active connection. If the wallet just initialised, run [`status()`](status.md) first to confirm `connected`.


---

<!-- wallet/methods/call-contract.md -->

# mega.callContract()

Execute any contract write function through the wallet. Supports single calls or a batch array. With `silent: true` and a matching [Smart Approvals](../core-sdk/permissions.md) grant, calls skip the approval UI and execute directly.

## Signature

`mega.callContract(request: CallContractRequest | CallContractRequest[]): Promise<TransactionResult>`

## Parameters

`CallContractRequest`:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `address` | `` `0x${string}` `` | required | Contract address. |
| `abi` | `any` | optional | Contract ABI fragment. Required unless `data` is pre-encoded. |
| `functionName` | `string` | optional | Function to call. Required unless `data` is pre-encoded. |
| `args` | `any[]` | optional | Function arguments. |
| `data` | `` `0x${string}` `` | optional | Pre-encoded calldata (alternative to abi/functionName/args). |
| `silent` | `boolean` | optional | Skip approval UI. Requires a matching session grant on `{ to, signature }`. |
| `silentUIApproveFallback` | `boolean` | optional | When `silent: true` but the matching permission has expired, fall back to UI approval instead of failing silently. |
| `value` | `bigint` / `string` | optional | Native value to send (wei). |
| `sponsor` | `boolean` | optional | Request sponsorship in `explicit` mode. |
| `maxGasAllowance` | `bigint` | optional | Override the default max gas allowance — use when sending large payloads that exceed defaults. |

For batch calls, pass an array. The wallet shows one approval for the whole batch.

## Examples

Single call:

```typescript
const tx = await mega.callContract({
  address: '0xTokenAddress',
  abi: tokenAbi,
  functionName: 'approve',
  args: ['0xSpenderAddress', 1_000_000n],
});
```

Silent execution after a permission grant:

```typescript
const tx = await mega.callContract({
  address: '0xTokenAddress',
  abi: tokenAbi,
  functionName: 'approve',
  args: ['0xSpenderAddress', 1_000_000n],
  silent: true,
});
```

Batch:

```typescript
const tx = await mega.callContract([
  {
    address: '0xTokenAddress',
    abi: tokenAbi,
    functionName: 'approve',
    args: ['0xRouterAddress', 1_000_000n],
  },
  {
    address: '0xRouterAddress',
    abi: routerAbi,
    functionName: 'swapExactTokensForTokens',
    args: [1_000_000n, 990_000n, path, '0xUserAddress', deadline],
    value: 0n,
  },
]);
```

## Response

Shared [`TransactionResult`](transfer.md#response) shape. For batch calls, `result.receipts` is populated instead of `result.receipt`.

## Notes

- `silent: true` only works after a successful [`grantPermissions()`](grant-permissions.md) covering the exact `{ to, signature }` pair. If the grant is missing or expired, the call resolves with `status: 'error'`.
- For read calls (no transaction), use [`getFromContract()`](get-from-contract.md).
- Types are intentionally broad — create typed wrappers in your app for contracts you call repeatedly.


---

<!-- wallet/methods/connect.md -->

# mega.connect()

Open the MOSS wallet UI and prompt the user to authenticate. Resolves with the resulting connection status. If the user dismisses the auth flow, the promise resolves with `status: 'cancelled'` rather than throwing.

## Signature

`mega.connect(): Promise<ConnectionStatus>`

## Parameters

None.

## Example

```typescript
const result = await mega.connect();

if (result.status === 'connected') {
  console.log('Connected', result.address);
} else if (result.status === 'cancelled') {
  console.log('User cancelled wallet authentication');
}
```

## Response

```typescript
type ConnectionStatus = {
  status: 'connected' | 'disconnected' | 'cancelled';
  address?: `0x${string}`;
  network: 'mainnet' | 'testnet';
};
```

## Notes

- Trigger from a deliberate user action (button click), not on page load.
- For account onboarding copy, prefer "Creating your account" / "Restoring account" — see [Best Practices](../best-practices.md).
- After connect, subscribe to [`events.onStatusChange`](on-status-change.md) so your UI tracks disconnects that happen outside your app.


---

<!-- wallet/methods/deposit.md -->

# mega.deposit()

Open the built-in wallet funding UI. The user adds funds inside the MOSS wallet surface — no custom funding flow to build or maintain.

For integration patterns, see [Deposit Flows (Unifold)](../deposit-flows.md).

## Signature

`mega.deposit(): Promise<void>`

## Parameters

None.

## Example

```typescript
const state = await mega.status();

if (state.status === 'connected') {
  await mega.deposit();
}
```

## Response

`Promise<void>` — resolves once the wallet deposit UI is opened. No structured success or transaction payload comes back through this method; observe wallet state through [`events.onStatusChange`](on-status-change.md) and refresh [`balances()`](balances.md) after the user completes funding.

## Notes

Requires a connected wallet. If status is `disconnected`, call [`connect()`](connect.md) first.


---

<!-- wallet/methods/disconnect.md -->

# mega.disconnect()

Terminate the active wallet session and return the resulting disconnected state.

## Signature

`mega.disconnect(): Promise<ConnectionStatus>`

## Parameters

None.

## Example

```typescript
const state = await mega.disconnect();

if (state.status === 'disconnected') {
  // Clear app-side wallet/session state.
}
```

## Response

```typescript
type ConnectionStatus = {
  status: 'connected' | 'disconnected' | 'cancelled';
  address?: `0x${string}`;
  network: 'mainnet' | 'testnet';
};
```

## Notes

Use `disconnect()` only when the product clearly intends to terminate the session — typically as part of an explicit "Sign out" affordance. The wallet may also be disconnected externally; subscribe to [`events.onStatusChange`](on-status-change.md) to stay in sync.


---

<!-- wallet/methods/get-from-contract.md -->

# mega.getFromContract()

Read contract state without creating a transaction. No wallet prompt, no gas — just a routed `eth_call`-style read.

## Signature

`mega.getFromContract<T>(request: GetFromContractRequest): Promise<T>`

## Parameters

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `address` | `` `0x${string}` `` | required | Contract address. |
| `abi` | `any` | required | Contract ABI fragment for the read function. |
| `functionName` | `string` | required | Function to read. |
| `args` | `any[]` | required | Function arguments (use `[]` for no args). |

## Example

```typescript
const balance = await mega.getFromContract<bigint>({
  address: '0xTokenAddress',
  abi: [{
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  }],
  functionName: 'balanceOf',
  args: ['0xWalletAddress'],
});
```

## Response

Decoded value of type `T` (the generic you pass).

## Notes

For write calls, use [`callContract()`](call-contract.md). For known wallet token balances, [`balances()`](balances.md) is faster than calling `balanceOf` per token.


---

<!-- wallet/methods/get-permissions.md -->

# mega.getPermissions()

Read active permission grants. Use this to check whether a grant is still valid before triggering [`callContract()`](call-contract.md) with `silent: true`.

The optional `address` argument switches between two modes:

- **No argument** — returns the grants for the **connected session's own subject** (the common case).
- **With an `address`** — returns the grants delegated to that **specific external address** (the `externalAddress` bound during [`grantPermissions()`](grant-permissions.md)).

## Signature

`mega.getPermissions(address?: string): Promise<GetPermissionsResponse | undefined>`

## Parameters

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `address` | `string` | optional | Omit for your session's own grants; pass an address for that delegate's grants. |

## Example

```typescript
const grants = await mega.getPermissions('0xDelegatedAddress');

if (!grants || !grants.permissions) {
  console.log('No active grants');
}
```

## Response

```typescript
type GetPermissionsResponse = {
  permissions?: {
    expiry: number;
    permissions: {
      calls: { signature: string; to: `0x${string}` }[];
      spend: {
        limit: bigint;
        period: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
        token?: `0x${string}`;
      }[];
    };
  } | null;
};
```

The outer response or inner `permissions` may be `null`/`undefined`. Always null-check both before reading.

## Notes

- Compare `permissions.expiry` against `Math.floor(Date.now() / 1000)` to know if the grant is still valid.
- Inspect `permissions.spend` against your app's tracked consumption to know how much budget is left.
- Re-grant via [`grantPermissions()`](grant-permissions.md) when expired or exhausted.


---

<!-- wallet/methods/grant-permissions.md -->

# mega.grantPermissions()

Grant scoped delegated permissions (spend caps + call rules + expiry) for session-style execution. After a grant, [`callContract()`](call-contract.md) with `silent: true` can execute matching actions without prompting. See [Smart Approvals (Policy Engine)](../core-sdk/permissions.md) for the conceptual deep-dive.

## Signature

`mega.grantPermissions(request: GrantPermissionsRequest): Promise<GrantPermissionsResponse>`

## Parameters

`GrantPermissionsRequest`:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `permissions` | `Permission` | required | The grant body — expiry, calls, spend caps. |
| `externalAddress` | `` `0x${string}` `` | optional | Bind the grant to a delegated external account (advanced). |
| `sponsor` | `boolean` | optional | Pair the grant with explicit sponsorship policy. |

`Permission`:

```typescript
interface Permission {
  id?: string;                     // Server-assigned grant identifier (set on grants returned from the wallet)
  expiry: number;                  // Unix timestamp
  /** @deprecated No longer used — the gas token is taken from the granted session permissions. */
  feeToken?: {
    limit: string;                 // DECIMAL string, e.g. '0.01' (ETH)
    symbol?: string;
  };
  permissions: {
    calls: { to: string; signature: string }[];  // Allowed contract+function pairs
    spend: {
      limit: bigint;               // Spend cap in WEI, e.g. 5000000000000000n
      period: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
      token?: `0x${string}`;
    }[];
  };
}
```

{% hint style="warning" %}
**`spend[].limit` is a `bigint` in wei**, e.g. `5000000000000000n` = 0.005 ETH. Don't pass a decimal string here.
{% endhint %}

{% hint style="info" %}
`feeToken` is **deprecated** and ignored — the gas token is taken from the granted session permissions. Omit it from new grants.
{% endhint %}

The `permissions` field is doubly nested by design: `request.permissions` (the `Permission` object) contains its own inner `permissions` (the `calls`/`spend` rules). The outer level also carries `expiry`. Mind the `permissions.permissions` nesting when building the object.

## Example

```typescript
const expiry = Math.floor(Date.now() / 1000) + 60 * 30;

await mega.grantPermissions({
  permissions: {
    expiry,
    permissions: {
      calls: [{ to: '0xContractAddress', signature: 'mint(uint256)' }],
      spend: [{
        limit: 1000000000000000n,
        period: 'day',
      }],
    },
  },
  externalAddress: '0xExternalDelegateAddress',
});
```

## Response

```typescript
type GrantPermissionsResponse = {
  status: 'approved' | 'cancelled';
};
```

## Canonical Call Matcher

Each `calls[]` entry should include both `to` (contract address) and `signature` (function signature, e.g., `'mint(uint256)'`). `to`-only or `signature`-only matching is not the documented integration model.

## Notes

- **Use least-privilege defaults:** narrow calls, low spend caps, short expiry (24h max for active sessions, 7 days for background agents).
- Expose a revoke control in your UI ([`revokePermissions()`](revoke-permissions.md)). Users can also revoke from wallet settings.
- See [Best Practices](../best-practices.md) for production permission patterns.


---

<!-- wallet/methods/initialise.md -->

# mega.initialise()

Create the wallet iframe, establish the Penpal bridge, and wait for the wallet host to signal readiness. Returns the initial connection status. Idempotent — call it once near app boot; calling it again is a no-op.

## Signature

`mega.initialise(config: Config): Promise<ConnectionStatus | undefined>`

## Parameters

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `network` | `'mainnet'` / `'testnet'` | required | Selects wallet network; passed to the hosted wallet URL. |
| `logging` | `'debug'` / `'info'` / `'warn'` / `'error'` | optional | SDK-side log verbosity. |
| `devMode` | `boolean` | optional | Switches wallet host from `account.megaeth.com` to `localhost:4000`. |
| `debug` | `boolean` | optional | Enables Penpal debug logging. |
| `sponsorUrl` | `string` | optional | Sponsorship approval endpoint URL. |
| `sponsorMode` | `'everything'` / `'app-only'` / `'explicit'` | optional | Sponsorship trigger mode. Default `app-only`. See [Paymaster Guide](../paymaster-setup.md). |
| `sponsorToken` | `'native'` / `'usdm'` | optional | Sponsor fee token. Default `native`. |

## Example

```typescript
import { mega } from '@megaeth-labs/wallet-sdk';

await mega.initialise({
  network: 'testnet',
  logging: 'info',
  debug: true,
  sponsorMode: 'app-only',
  sponsorToken: 'native',
});

const state = await mega.status();
console.log(state.status, state.address);
```

## Response

```typescript
type ConnectionStatus = {
  status: 'connected' | 'disconnected' | 'cancelled';
  address?: `0x${string}`;
  network: 'mainnet' | 'testnet';
};
```

The returned status reflects existing wallet state — initialisation guarantees bridge readiness, not user approval. Use [`connect()`](connect.md) to prompt the user.

## Notes

- Call once near app boot. Calling again returns early without re-creating the iframe.
- For SSR (Next.js): wrap in a `'use client'` boundary or use the React SDK's `MegaProvider`. The iframe requires DOM access.


---

<!-- wallet/methods/on-status-change.md -->

# mega.events.onStatusChange()

Subscribe to connection state transitions and keep your app's wallet state synced. Fires whenever the wallet status changes — including disconnects initiated from within the wallet UI itself.

## Signature

`mega.events.onStatusChange(callback: (status: ConnectionStatus) => void): void`

## Parameters

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `callback` | `(status: ConnectionStatus) => void` | required | Fires on every status transition. |

## Example

```typescript
mega.events.onStatusChange((status) => {
  console.log(status.status, status.address);

  if (status.status === 'disconnected') {
    // Disable transaction actions until reconnect.
  }
});
```

## Response

`void` — the subscription is registered immediately.

## Notes

- The callback is stored as a **single handler**, not a multi-listener event bus. Subscribe once and fan out through your app store if multiple components need the value.
- Subscribing replaces any previous handler — register early (e.g., immediately after [`mega.initialise()`](initialise.md)) before other code might want to overwrite it.


---

<!-- wallet/methods/open.md -->

# mega.open()

Bring the wallet UI overlay forward without executing a specific signing or transaction flow. Useful when your product offers an explicit "Open wallet" affordance for account management or session inspection.

## Signature

`mega.open(): Promise<void>`

## Parameters

None.

## Example

```typescript
const state = await mega.status();

if (state.status !== 'connected') {
  await mega.open();
}
```

## Response

`Promise<void>` — resolves once the wallet UI is shown.

## Notes

If the user isn't connected, `open()` is a natural prompt path that doesn't force a specific action. For an explicit auth prompt with a result, use [`connect()`](connect.md) instead.


---

<!-- wallet/methods/revoke-permissions.md -->

# mega.revokePermissions()

Immediately revoke all active delegated permissions from the app side. After revocation, [`callContract()`](call-contract.md) with `silent: true` will fall back to the wallet approval UI.

## Signature

`mega.revokePermissions(): Promise<void>`

## Parameters

None.

## Example

```typescript
await mega.revokePermissions();

// Also point users to wallet/account settings for per-app revocation controls.
```

## Response

`Promise<void>` — resolves once the revocation is recorded.

## Notes

App-triggered `revokePermissions()` is one revocation path. Users can also revoke permissions **per app** from wallet/account settings, independent of any app trigger. Don't describe revocation as global-only or all-or-nothing in your UI copy.

For reading current permissions before revoking, use [`getPermissions()`](get-permissions.md).


---

<!-- wallet/methods/send.md -->

# mega.send()

Open the wallet-managed send flow with a token selector and destination input. The wallet handles the full UX — amount entry, token selection, recipient confirmation, and execution.

For direct programmatic transfers from your app, use [`transfer()`](transfer.md) instead.

## Signature

`mega.send(request: SendRequest): Promise<TransactionResult>`

## Parameters

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `token` | `` `0x${string}` `` / `'native'` | optional | Pre-select a token. Omit to let the user choose. |
| `destination` | `` `0x${string}` `` | optional | Pre-fill the destination address. |

## Example

```typescript
const result = await mega.send({
  token: '0xTokenAddress',
  destination: '0xRecipientAddress',
});

if (result.status === 'approved') {
  console.log(result.receipt?.hash);
}
```

## Response

Shared [`TransactionResult`](transfer.md#response) shape.

## Notes

Requires an active connected wallet. Reconnect first if status is `disconnected`.


---

<!-- wallet/methods/sign-data.md -->

# mega.signData()

Sign structured data through the wallet approval surface — typically EIP-712 typed payloads for permits, structured approvals, or attestations. For plain string signing use [`signMessage()`](sign-message.md).

## Signature

`mega.signData(request: SignDataRequest): Promise<SignDataResponse>`

## Parameters

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `data` | `any` | required | Structured payload. For EIP-712, include `domain`, `types`, `primaryType`, and `message`. |

## Example

EIP-712 typed payload:

```typescript
const typed = await mega.signData({
  data: {
    domain: {
      name: 'MyApp',
      version: '1',
      chainId: 4326,
      verifyingContract: '0xContractAddress',
    },
    primaryType: 'Permit',
    types: {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
      ],
    },
    message: {
      owner: '0xOwnerAddress',
      spender: '0xSpenderAddress',
      value: '1000000',
    },
  },
});

if (typed.status === 'success') {
  console.log(typed.signature);
}
```

## Response

```typescript
type SignDataResponse = {
  status: 'success' | 'cancelled' | 'error';
  error?: string;
  signature?: string;
};
```

## Notes

- User rejection resolves with `cancelled` — treat as neutral.
- Reconnect disconnected wallets before signing.
- Verify signatures server-side before issuing app sessions — see [Server Verify](../server-verify.md).


---

<!-- wallet/methods/sign-message.md -->

# mega.signMessage()

Sign an arbitrary text payload (EIP-191) — for auth challenges, attestations, or action confirmation. The user sees the message in the wallet UI before signing. User rejection resolves with `status: 'cancelled'`, not a thrown error.

**Use this when** you control the message and want the raw signature back to verify yourself. If you just want login and would rather MOSS own the challenge and hand you a verifiable JWT, use [`authenticate()`](authenticate.md) instead. For structured (EIP-712) typed data, use [`signData()`](sign-data.md).

## Signature

`mega.signMessage(message: string): Promise<SignMessageResponse>`

## Parameters

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `message` | `string` | required | The string the user signs. Shown verbatim in the wallet UI. |

## Example

```typescript
const signed = await mega.signMessage('Sign in to MOSS');

if (signed.status === 'success') {
  console.log(signed.signature);
} else if (signed.status === 'cancelled') {
  console.log('User cancelled message signing');
} else {
  console.error(signed.error);
}
```

## Response

```typescript
type SignMessageResponse = {
  status: 'success' | 'cancelled' | 'error';
  error?: string;
  signature?: `0x${string}`;
};
```

## Notes

- Don't auto-trigger signing after page load. Always follow a user action with context on why.
- Verify the signature server-side before issuing app sessions — see [Server Verify](../server-verify.md).
- If the wallet is disconnected, call [`connect()`](connect.md) first.


---

<!-- wallet/methods/status.md -->

# mega.status()

Read the current connection state without prompting the user. Useful on app load, route transitions, or when restoring state after a refresh.

## Signature

`mega.status(): Promise<ConnectionStatus>`

## Parameters

None.

## Example

```typescript
const state = await mega.status();

if (state.status === 'connected') {
  console.log('Connected wallet:', state.address);
} else {
  console.log('Wallet is not connected');
}
```

## Response

```typescript
type ConnectionStatus = {
  status: 'connected' | 'disconnected' | 'cancelled';
  address?: `0x${string}`;
  network: 'mainnet' | 'testnet';
};
```

## Notes

`status()` is a read — it doesn't prompt the user. To prompt for connection, use [`connect()`](connect.md). For continuous tracking, use [`events.onStatusChange`](on-status-change.md) and avoid polling.


---

<!-- wallet/methods/swap.md -->

# mega.swap()

Open the wallet-managed swap flow for token exchange. The wallet handles routing UI, slippage, confirmation, and execution.

## Signature

`mega.swap(request: SwapRequest): Promise<TransactionResult>`

## Parameters

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `fromToken` | `` `0x${string}` `` / `'native'` | optional | Pre-select source token. |
| `toToken` | `` `0x${string}` `` / `'native'` | optional | Pre-select destination token. |

## Example

```typescript
const result = await mega.swap({
  fromToken: 'native',
  toToken: '0xTokenAddress',
});

if (result.status === 'error') {
  console.error(result.error);
}
```

## Response

Shared [`TransactionResult`](transfer.md#response) shape.

## Notes

Treat `cancelled` as user intent — avoid hard-failing app state. For programmatic contract calls (custom swap router, batch operations), use [`callContract()`](call-contract.md) instead.


---

<!-- wallet/methods/transfer.md -->

# mega.transfer()

Send native ETH, ERC-20, ERC-721, or ERC-1155 transfers from the connected wallet. Returns a `TransactionResult` with status, receipt, and optional error. The wallet always prompts for transfers — for silent delegated execution, use [`callContract()`](call-contract.md) with matching permissions.

## Signature

`mega.transfer(request: TransferRequest): Promise<TransactionResult>`

## Parameters

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `type` | `'native'` / `'erc20'` / `'erc721'` / `'erc1155'` | required | Asset type. |
| `to` | `` `0x${string}` `` | required | Recipient address. |
| `amount` | `string` | required | Wei (native) or smallest token unit. |
| `contractAddress` | `string` | optional | Required for ERC-20 / 721 / 1155. |
| `tokenId` | `number` | optional | Required for ERC-721 / 1155. |
| `sponsor` | `boolean` | optional | Request sponsorship in `explicit` mode — see [Paymaster Guide](../paymaster-setup.md). |

## Example

```typescript
import { parseEther } from 'viem';

const result = await mega.transfer({
  type: 'native',
  to: '0xRecipientAddress',
  amount: parseEther('0.1').toString(),
});

if (result.status === 'approved') {
  console.log(result.receipt?.hash);
} else if (result.status === 'cancelled') {
  console.log('User cancelled transfer');
} else {
  console.error(result.error);
}
```

## Response

```typescript
type TransactionResult = {
  status: 'approved' | 'cancelled' | 'error';
  receipt?: {
    hash: `0x${string}`;
    blockHash: string;
    blockNumber: number;
    chainId: number;
    gasUsed: number;
    logs: { address: `0x${string}`; data: `0x${string}`; topics: string[] }[];
    status: string;
    transactionHash: `0x${string}`;
  };
  receipts?: TransactionResult['receipt'][];  // populated for batch callContract
  error?: string;
  silentHasUsedFallback?: boolean;
};
```

| Status | Meaning | Action |
| --- | --- | --- |
| `approved` | Transaction confirmed | Use `result.receipt?.hash` |
| `cancelled` | User rejected in-wallet confirmation | Treat as neutral, reset UI |
| `error` | Operational failure (RPC, balance, contract) | Inspect `result.error`, show retry |

`silentHasUsedFallback` is set to `true` when `silent: true` was attempted on a `callContract()` call but fell back to UI approval — typically because the matching session permission had expired and `silentUIApproveFallback: true` triggered the fallback path.

## Notes

- Show amount, asset, and destination before opening the wallet.
- If the wallet is disconnected, prompt [`connect()`](connect.md) first.
