<!-- AUTO-GENERATED from wallet/react/overview.md by skills/scripts/build-skills.mjs. Do not edit here — edit the source doc and re-run the script. -->

---
description: Full reference for @megaeth-labs/wallet-sdk-react — provider setup and every hook documented.
---

# React SDK Reference

Every core SDK method exposed as a React hook. Built on TanStack Query — mutations for actions, queries for reads. For installation, see [Installation](installation.md). For a scannable index of every hook, see [Hooks at a Glance](hooks.md).

## Mental Model

- `MegaProvider` initialises the underlying web SDK once and keeps account status in React state.
- Hooks wrap the same core `mega` object using React Query mutations and queries.
- Use hooks for account UX, permissions, and session grants in React apps.

## Setup — MegaProvider

```tsx
import { MegaProvider } from '@megaeth-labs/wallet-sdk-react';

function App() {
  return (
    <MegaProvider config={{ network: 'testnet' }}>
      <AppContent />
    </MegaProvider>
  );
}
```

MegaProvider handles initialisation and status tracking internally. It includes its own `QueryClientProvider`, so you do not need to add one.

## Export Surface

| Export | Kind | Notes |
| --- | --- | --- |
| `MegaProvider` | Provider | Initialises SDK and provides wallet status + QueryClient context. |
| `useStatus` | Hook | Returns status, address, network, and initialised flag. |
| `useConnect` | Hook | Wraps `mega.connect()`. |
| `useDisconnect` | Hook | Wraps `mega.disconnect()`. |
| `useGrantPermissions` | Hook | Wraps `mega.grantPermissions()`. |
| `useRevokePermissions` | Hook | Wraps `mega.revokePermissions()`. |
| `useSignMessage` | Hook | Wraps `mega.signMessage()`. |
| `useAuthenticate` | Hook | Wraps `mega.authenticate()`. |
| `useTransfer` | Hook | Wraps `mega.transfer()`. |
| `useSend` | Hook | Wraps `mega.send()`. |
| `useSwap` | Hook | Wraps `mega.swap()`. |
| `useCallContract` | Hook | Wraps `mega.callContract()`. |
| `useGetFromContract` | Hook | Wraps `mega.getFromContract()`. |
| `useDeposit` | Hook | Wraps `mega.deposit()`. |
| `useBalances` | Hook | Wraps `mega.balances()`. |
| `usePermissions` | Hook | Wraps `mega.getPermissions()`. |
| `useSignData` | Hook | Wraps `mega.signData()`. |
| `mega` | Re-export | Core SDK escape hatch from `@megaeth-labs/wallet-sdk`. |

## Quick Reference

| Hook | Type | Wraps | Input |
| --- | --- | --- | --- |
| `useStatus` | Context | — | — |
| `useConnect` | Mutation | `mega.connect` | — |
| `useDisconnect` | Mutation | `mega.disconnect` | — |
| `useTransfer` | Mutation | `mega.transfer` | `TransferRequest` |
| `useSend` | Mutation | `mega.send` | `SendRequest` |
| `useSwap` | Mutation | `mega.swap` | `SwapRequest` |
| `useCallContract` | Mutation | `mega.callContract` | `CallContractRequest \| CallContractRequest[]` |
| `useGetFromContract` | Mutation | `mega.getFromContract` | `GetFromContractRequest` |
| `useSignMessage` | Mutation | `mega.signMessage` | `string` |
| `useAuthenticate` | Mutation | `mega.authenticate` | — |
| `useSignData` | Mutation | `mega.signData` | `SignDataRequest` |
| `useGrantPermissions` | Mutation | `mega.grantPermissions` | `GrantPermissionsRequest` |
| `useRevokePermissions` | Mutation | `mega.revokePermissions` | — |
| `useDeposit` | Mutation | `mega.deposit` | — |
| `useBalances` | Query | `mega.balances` | `tokens?: string[]` |
| `usePermissions` | Query | `mega.getPermissions` | `address?: string` |
| `mega` | Core export | re-export from `@megaeth-labs/wallet-sdk` | — |

## Connect + Transfer in React

```tsx
import { useStatus, useConnect, useTransfer } from '@megaeth-labs/wallet-sdk-react';
import { parseEther } from 'viem';

export function WalletDemo() {
  const { status, address, initialised } = useStatus();
  const { mutateAsync: connect, isPending: isConnecting } = useConnect();
  const { mutateAsync: transfer, isPending: isTransferring } = useTransfer();

  if (!initialised) return <p>Loading wallet...</p>;

  if (status === 'disconnected') {
    return (
      <button onClick={() => connect()} disabled={isConnecting}>
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </button>
    );
  }

  const handleTransfer = async () => {
    const result = await transfer({
      type: 'native',
      to: '0xRecipientAddress',
      amount: parseEther('0.1').toString(),
    });

    if (result.status === 'approved') {
      alert('Sent! Hash: ' + result.receipt.hash);
    }
  };

  return (
    <div>
      <p>Connected: {address}</p>
      <button onClick={handleTransfer} disabled={isTransferring}>
        {isTransferring ? 'Sending...' : 'Send 0.1 ETH'}
      </button>
    </div>
  );
}
```

## Hook Details

### `useStatus(): { status, address?, network, initialised }`

Reads provider state directly — not a query or mutation. Returns the full `ConnectionStatus` spread plus `initialised`. Use for gating UI on connection state and rendering address-aware components.

```tsx
const { status, address, network, initialised } = useStatus();

if (!initialised) return <Spinner />;
if (status === 'disconnected') return <ConnectCTA />;

return <span>{address} ({network})</span>;
```

### `useConnect(): UseMutationResult<ConnectionStatus, Error, void>`

Wraps [`mega.connect()`](../methods/connect.md). Prefer `mutateAsync()` in async UI handlers so you can `await` the result flow.

```tsx
const { mutateAsync: connect } = useConnect();
await connect();

// With options:
const connectHook = useConnect({
  onSuccess: (data) => console.log(data.status),
  onError: (error) => console.error(error),
});
```

### `useDisconnect(): UseMutationResult<ConnectionStatus, Error, void>`

Wraps [`mega.disconnect()`](../methods/disconnect.md). Disconnect updates provider status via the SDK status event flow — no manual state sync needed.

```tsx
const { mutateAsync: disconnect } = useDisconnect();
await disconnect();

const disconnectHook = useDisconnect({
  onSuccess: () => clearSessionUI(),
});
```

### `useTransfer(): UseMutationResult<TransactionResult, Error, TransferRequest>`

Wraps [`mega.transfer()`](../methods/transfer.md). Handle `approved`, `cancelled`, and `error` states explicitly — see [Transaction Result](../methods/transfer.md#response).

```tsx
const { mutateAsync: transfer } = useTransfer();

await transfer({
  type: 'native',
  to: '0xRecipientAddress',
  amount: '100000000000000000',
});

const transferHook = useTransfer({
  onSuccess: (result) => {
    if (result.status === 'approved') toast.success('Transfer sent');
  },
  onError: (error) => toast.error(error.message),
});
```

### `useSend(): UseMutationResult<TransactionResult, Error, SendRequest>`

Wraps [`mega.send()`](../methods/send.md) — wallet-native send flow with minimal input (token + destination) and wallet-managed UX.

```tsx
const { mutateAsync: send } = useSend();
await send({
  token: 'native',
  destination: '0xRecipientAddress',
});
```

### `useSwap(): UseMutationResult<TransactionResult, Error, SwapRequest>`

Wraps [`mega.swap()`](../methods/swap.md) — wallet-managed swap flow. Treat `cancelled` as neutral user intent.

```tsx
const { mutateAsync: swap } = useSwap();
await swap({
  fromToken: 'native',
  toToken: '0xTokenAddress',
});
```

### `useCallContract(): UseMutationResult<TransactionResult, Error, CallContractRequest | CallContractRequest[]>`

Wraps [`mega.callContract()`](../methods/call-contract.md). Accepts single or batch input.

```tsx
const { mutateAsync: callContract } = useCallContract();

await callContract({
  address: contractAddress,
  abi,
  functionName: 'mint',
  args: [1n],
  value: 0n,
});

// Batch:
await callContract([
  {
    address: tokenAddress,
    abi: tokenAbi,
    functionName: 'approve',
    args: [spenderAddress, 1_000_000n],
  },
  {
    address: routerAddress,
    abi: routerAbi,
    functionName: 'swapExactTokensForTokens',
    args: [1_000_000n, 990_000n, path, walletAddress, deadline],
    value: 0n,
  },
]);
```

{% hint style="warning" %}
Use `silent: true` only after a matching delegated permission grant exists for the exact `{ to, signature }` pair. Without one, silent calls fail with `status: 'error'`.
{% endhint %}

### `useGetFromContract(): UseMutationResult<unknown, Error, GetFromContractRequest>`

Wraps [`mega.getFromContract()`](../methods/get-from-contract.md). Modeled as a mutation in this package — call `mutateAsync()` for each read; results don't auto-cache.

```tsx
const { mutateAsync: read } = useGetFromContract();
const result = await read({
  address: tokenAddress,
  abi,
  functionName: 'balanceOf',
  args: [walletAddress],
});
```

### `useSignMessage(): UseMutationResult<SignMessageResponse, Error, string>`

Wraps [`mega.signMessage()`](../methods/sign-message.md). Treat user cancellation as a neutral state, not an app error.

```tsx
const { mutateAsync: signMessage } = useSignMessage();
const result = await signMessage('Sign in to MyApp');

const signHook = useSignMessage({
  onSuccess: (result) => {
    if (result.status === 'success') submitSignature(result.signature);
  },
});
```

### `useAuthenticate(): UseMutationResult<AuthenticateResponse, Error, void>`

Wraps [`mega.authenticate()`](../methods/authenticate.md) — MOSS-led auth challenge, returns a JWT for backend verification.

```tsx
const { mutateAsync: authenticate } = useAuthenticate();
const result = await authenticate();

const authHook = useAuthenticate({
  onSuccess: async (result) => {
    if (result.status === 'success' && result.jwt) {
      await fetch('/api/auth/moss', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jwt: result.jwt }),
      });
    }
  },
});
```

### `useSignData(): UseMutationResult<SignDataResponse, Error, SignDataRequest>`

Wraps [`mega.signData()`](../methods/sign-data.md) — typed signing flows such as permits and structured approvals.

```tsx
const { mutateAsync: signData } = useSignData();
await signData(typedDataRequest);

const signDataHook = useSignData({
  onError: (error) => reportSigningError(error),
});
```

### `useGrantPermissions(): UseMutationResult<GrantPermissionsResponse, Error, GrantPermissionsRequest>`

Wraps [`mega.grantPermissions()`](../methods/grant-permissions.md).

```tsx
const { mutateAsync: grant } = useGrantPermissions();

await grant({
  permissions: {
    expiry: Math.floor(Date.now() / 1000) + 3600,
    permissions: {
      calls: [{ to: contractAddress, signature: 'approve(address,uint256)' }],
      spend: [{ limit: 100000000000000000n, period: 'hour' }],
    },
  },
});
```

{% hint style="warning" %}
Keep scope narrow: short expiry, specific contracts, low spend limits. See [Best Practices](../best-practices.md) for production permission patterns.
{% endhint %}

### `useRevokePermissions(): UseMutationResult<void, Error, void>`

Wraps [`mega.revokePermissions()`](../methods/revoke-permissions.md). Expose a clear revoke path in your product UI — users can also revoke app-specific permissions from wallet/account settings.

```tsx
const { mutateAsync: revoke } = useRevokePermissions();
await revoke();

const revokeHook = useRevokePermissions({
  onSuccess: () => refreshPermissionState(),
});
```

### `useDeposit(): UseMutationResult<void, Error, void>`

Wraps [`mega.deposit()`](../methods/deposit.md) — opens wallet funding UI, not a direct contract write.

```tsx
const { mutateAsync: deposit } = useDeposit();
await deposit();
```

### `useBalances(tokens?: string[], options?): UseQueryResult<OwnedTokenResponse[]>`

Wraps [`mega.balances()`](../methods/balances.md). Only fetches when the wallet is connected — the `enabled` gate is handled internally.

```tsx
import { useBalances } from '@megaeth-labs/wallet-sdk-react';

function Portfolio() {
  const { data: tokens, isLoading, error } = useBalances();

  // Or filter specific tokens:
  const { data: ethOnly } = useBalances(['0xEthContractAddress']);

  // With TanStack Query options:
  const { data } = useBalances(undefined, {
    refetchInterval: 10000, // Poll every 10 seconds
  });
}
```

The internal query key is `['balances']` — not parameterized on the `tokens` argument. If you call `useBalances` multiple times with different token lists in the same session, they share cache. Call `refetch()` or pass a different `queryKey` via the options arg if you need separate cache entries per token list.

### `usePermissions(address?: string, options?): UseQueryResult<GetPermissionsResponse | undefined>`

Wraps [`mega.getPermissions()`](../methods/get-permissions.md). Only fetches when the wallet is connected. The `address` arg switches modes: omit it for **your session's own grants**, pass an address for a **specific delegate's grants**.

```tsx
// Your session's own grants
const { data: mine, refetch } = usePermissions();

// A specific delegate's grants
const { data: delegated } = usePermissions('0xDelegatedAddress');

// With TanStack Query options
const { data } = usePermissions(undefined, {
  staleTime: 15000,
  refetchOnWindowFocus: false,
});
```

## Mutation vs Query

Mutation hooks (`useConnect`, `useTransfer`, and others) return TanStack mutation state: `{ mutate, mutateAsync, isPending, isError, error, data }`. Use `mutateAsync()` to trigger actions and await results. Query hooks (`useBalances`, `usePermissions`) fetch automatically and return query state: `{ data, isLoading, error, refetch }`.

## React Wrapper vs Core SDK

Use the React wrapper in React apps when you want stateful hooks, Query ergonomics, and provider-driven account status. Use the raw SDK in framework-agnostic or non-React environments, or when you need direct control over the core API surface.

For account onboarding copy in React UI, prefer "Creating your account" and "Restoring account".

## Core SDK Export

The React package re-exports `mega` from the core SDK for escape hatches:

```tsx
export { mega } from '@megaeth-labs/wallet-sdk';
```
