---
name: moss-wallet-react
description: Integrates MOSS into React 19 apps with @megaeth-labs/wallet-sdk-react (TanStack Query 5). Use when wiring MegaProvider and hooks — useStatus, useConnect, useTransfer, useSend, useSwap, useCallContract, useGetFromContract, useSignMessage, useAuthenticate, useGrantPermissions, useRevokePermissions, useDeposit, useBalances, usePermissions — or when an app already uses wagmi/viem and wants the @megaeth-labs/wallet-wagmi-connector instead. Covers mutation vs query hook semantics (mutateAsync, isPending), the shared balances query key, SSR/Next.js client-only initialisation, and gating UI on the initialised flag.
license: MIT
compatibility: Claude Code, Codex, Cursor, Gemini, Copilot. Targets @megaeth-labs/wallet-sdk-react v0.1.x (React 19, TanStack Query 5).
metadata:
  package: "@megaeth-labs/wallet-sdk-react"
  network-mainnet-chainid: "4326"
  network-testnet-chainid: "6343"
---

# MOSS Wallet — React SDK

`@megaeth-labs/wallet-sdk-react` wraps the MOSS hosted wallet as React 19 hooks on TanStack Query 5. Wrap your app once in `<MegaProvider>`, then read status and drive actions through hooks. The app never holds keys — confirmations happen in the hosted wallet at `account.megaeth.com`.

## Golden rules

1. Wrap the app **once** in `<MegaProvider config={...}>` at a stable boundary (root layout / top provider). It owns its own `QueryClient` — do **NOT** nest another `QueryClientProvider` under it.
2. Gate every wallet-aware UI on `useStatus().initialised`. `initialised: false` means the SDK is still booting; a `Connect` button shown before then does nothing useful.
3. Use `mutateAsync` in async handlers and branch on the **returned `result.status`**. Mutation hooks do **not** throw on user cancel.
4. `result.status` is `'approved' | 'cancelled' | 'error'` (signing/auth use `'success' | 'cancelled' | 'error'`). Treat `cancelled` as neutral — never show an error toast for it.
5. Config sets network once. Changing `config` after first render does **not** re-initialise — pick the right `network`/`sponsorMode` from the start.
6. Provider and hooks are client-only. In Next.js / SSR, put `'use client'` on the file that mounts `MegaProvider` and any component using hooks.
7. Fire mutations from explicit user actions (clicks) — never on mount or in render. Use `isPending` for in-flight state.
8. `useBalances` / `usePermissions` self-gate on connected status — no manual `enabled` needed. Their query keys are **not** parameterized on args (see References).

## Install

Peers are React 19 and TanStack Query 5 — install them alongside.

```bash
npm i @megaeth-labs/wallet-sdk-react react@^19 react-dom@^19 @tanstack/react-query@^5
```

Passkey account creation needs a secure context: `http://localhost` is fine, HTTPS with a trusted cert is fine; `https://localhost` self-signed and `http://` LAN IPs are refused by Chromium.

## Provider setup

Mount once. Config shape matches `mega.initialise` (`network`, optional `logging`, `sponsorUrl`, `sponsorMode` default `'app-only'`, `sponsorToken` default `'native'`).

```tsx
// app/layout.tsx  (Next.js App Router — keep 'use client' on a wrapper if this file is a Server Component)
'use client';
import { MegaProvider } from '@megaeth-labs/wallet-sdk-react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <MegaProvider config={{ network: 'mainnet', logging: 'error' }}>
          {children}
        </MegaProvider>
      </body>
    </html>
  );
}
```

## Connect button — gate on `initialised`

```tsx
'use client';
import { useStatus, useConnect, useDisconnect } from '@megaeth-labs/wallet-sdk-react';

export function ConnectButton() {
  const { status, address, initialised } = useStatus();
  const { mutateAsync: connect, isPending: connecting } = useConnect();
  const { mutateAsync: disconnect } = useDisconnect();

  if (!initialised) return <button disabled>Loading wallet…</button>;

  if (status === 'connected') {
    return <button onClick={() => disconnect()}>{address}</button>;
  }

  return (
    <button onClick={() => connect()} disabled={connecting}>
      {connecting ? 'Connecting…' : 'Connect MOSS'}
    </button>
  );
}
```

## Transfer — branch on `result.status`

`amount` is a string: wei for native, smallest unit for tokens. Cancellation is neutral.

```tsx
'use client';
import { useTransfer } from '@megaeth-labs/wallet-sdk-react';
import { parseEther } from 'viem';

export function SendButton() {
  const { mutateAsync: transfer, isPending } = useTransfer();

  const onSend = async () => {
    const result = await transfer({
      type: 'native',
      to: '0xRecipientAddress',
      amount: parseEther('0.1').toString(),
    });

    if (result.status === 'approved') {
      toast.success(`Sent — ${result.receipt?.hash}`);
    } else if (result.status === 'error') {
      toast.error(result.error ?? 'Transfer failed');
    }
    // 'cancelled' → do nothing; keep app state so the user can retry
  };

  return (
    <button onClick={onSend} disabled={isPending}>
      {isPending ? 'Sending…' : 'Send 0.1 ETH'}
    </button>
  );
}
```

## Read balances — query hook

`useBalances` only fetches when connected. Pass an optional token-address filter and TanStack Query options.

```tsx
'use client';
import { useBalances } from '@megaeth-labs/wallet-sdk-react';

export function Portfolio() {
  const { data: tokens, isLoading, error, refetch } = useBalances(undefined, {
    refetchInterval: 10_000,
  });

  if (isLoading) return <p>Loading balances…</p>;
  if (error) return <p>Could not load balances</p>;

  return (
    <ul>
      {tokens?.map((t) => (
        <li key={t.address}>{t.symbol}: {t.displayBalance}</li>
      ))}
    </ul>
  );
}
```

The internal balances query key is `['balances']` and is **not** keyed on the `tokens` argument — multiple `useBalances` calls in a session share one cache entry. Call `refetch()` or pass a custom `queryKey` in options if you need separate entries per token list.

## Hook map

Every hook wraps a core `mega.*` method. Mutation hooks expose `{ mutate, mutateAsync, isPending, isError, error, data }`; query hooks expose `{ data, isLoading, error, refetch }`.

| Need | Hook | Kind | Wraps |
| --- | --- | --- | --- |
| Boot + connection state | `useStatus()` → `{ status, address?, network, initialised }` | context | — |
| Connect / disconnect | `useConnect` / `useDisconnect` | mutation | `mega.connect` / `mega.disconnect` |
| Send a token you specify | `useTransfer` | mutation | `mega.transfer` |
| Wallet-managed send (token picker UI) | `useSend` | mutation | `mega.send` |
| Wallet-managed swap (routing UI) | `useSwap` | mutation | `mega.swap` |
| Write to a contract (single or batch) | `useCallContract` | mutation | `mega.callContract` |
| Read a contract (no gas) | `useGetFromContract` | mutation | `mega.getFromContract` |
| Sign a string | `useSignMessage` | mutation | `mega.signMessage` |
| Sign EIP-712 typed data | `useSignData` | mutation | `mega.signData` |
| Get a backend-verifiable JWT | `useAuthenticate` | mutation | `mega.authenticate` |
| Grant session permissions | `useGrantPermissions` | mutation | `mega.grantPermissions` |
| Revoke ALL grants | `useRevokePermissions` | mutation | `mega.revokePermissions` |
| Open the built-in funding UI | `useDeposit` | mutation | `mega.deposit` |
| Read owned token balances | `useBalances(tokens?, options?)` | query | `mega.balances` |
| Read granted permissions | `usePermissions(address?, options?)` | query | `mega.getPermissions` |
| Escape hatch to core API | `mega` (re-export) | — | `@megaeth-labs/wallet-sdk` |

Notes: `useDeposit` opens the built-in Unifold funding UI — do not build a custom funding flow. `usePermissions()` with no arg reads your session's own grants; pass an address to read a specific delegate's grants. For `useCallContract`, pass an array to batch atomically.

## wagmi instead?

If the app already uses wagmi/viem, use `@megaeth-labs/wallet-wagmi-connector` (connector id `'mossWallet'`) rather than the hooks wrapper. Here you **do** supply your own `QueryClientProvider`.

```bash
npm i @megaeth-labs/wallet-wagmi-connector wagmi viem @tanstack/react-query
```

```ts
import { createConfig, http } from 'wagmi';
import { megaeth } from 'viem/chains';
import { megaWallet } from '@megaeth-labs/wallet-wagmi-connector';

export const config = createConfig({
  chains: [megaeth],
  connectors: [megaWallet({ network: 'mainnet', sponsorMode: 'app-only', sponsorToken: 'native' })],
  transports: { [megaeth.id]: http() },
});
```

Connect with wagmi's own hooks, selecting the connector by id:

```tsx
import { useAccount, useConnect, useDisconnect } from 'wagmi';

export function WagmiConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const connector = connectors.find((c) => c.id === 'mossWallet');

  if (isConnected) return <button onClick={() => disconnect()}>{address}</button>;
  return (
    <button disabled={!connector} onClick={() => connector && connect({ connector })}>
      Connect MOSS Wallet
    </button>
  );
}
```

Connector is fixed-network per instance (no programmatic chain switching); keep one MOSS connector per page. Wallet-specific methods (`wallet_balances`, `wallet_transfer`, …) are reachable via `provider.request()`. See [wagmi-connector.md](references/wagmi-connector.md).

## References

- [react-reference.md](references/react-reference.md) — full per-hook signatures, options, and examples.
- [hooks-at-a-glance.md](references/hooks-at-a-glance.md) — scannable index of every hook grouped by purpose.
- [provider-setup.md](references/provider-setup.md) — MegaProvider internals, the module-level init guard, and placement guidance.
- [react-flows.md](references/react-flows.md) — connect / sign / transfer / contract / permissions flow patterns.
- [ux-guidance.md](references/ux-guidance.md) — boot-vs-connection, cancellation handling, copy conventions.
- [wagmi-connector.md](references/wagmi-connector.md) — full wagmi connector setup and custom wallet methods.

## Scripts

This skill bundles no scripts — copy the snippets above and adapt.

## When to switch skills / Related skills

- **moss-wallet-sdk** — framework-agnostic core `mega.*` API, full method/param details, non-React apps.
- **moss-wallet-permissions** — designing the `grantPermissions` payload, silent calls, and Smart Approvals.
- **moss-wallet-server-verify** — backend verification of `signMessage` / `authenticate` (`@megaeth-labs/wallet-server-verify`).
- **moss-wallet-paymaster** — gas sponsorship (`sponsorMode`, `sponsorUrl`, `sponsorToken`).
- **moss-wallet-privy-migration** — migrating assets from a Privy EOA into MOSS.
- **moss-wallet-cli** — the `mega moss` CLI for delegated session keys.

## Old patterns

<details>
<summary>Stale assumptions to avoid</summary>

- **Adding a second `QueryClientProvider`** under `MegaProvider` — it already provides one. Only add your own when using the wagmi connector path instead.
- **Wrapping mutation calls in try/catch to detect cancellation** — they resolve with `status: 'cancelled'`, they don't throw. Branch on `result.status`.
- **Treating `cancelled` as an error** — it is neutral user intent; no error toast.
- **Re-mounting `MegaProvider` on route changes / passing new config to re-init** — init runs once per page load; remounting churns the iframe/Penpal bridge and resets Query cache.
- **Calling `useBalances` with different token lists expecting separate caches** — the query key is `['balances']`, not parameterized; they share one entry.
- **Rendering a `Connect` button before `initialised` is true** — gate on `useStatus().initialised`.
- **"seed phrase"** — MOSS uses the wording **"Recovery Code"**.
- **`mega.deposit` as a contract write** — it opens the built-in funding UI; don't build a custom funding flow.

</details>
