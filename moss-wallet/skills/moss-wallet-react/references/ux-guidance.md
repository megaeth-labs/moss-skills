<!-- AUTO-GENERATED from wallet/react/ux-guidance.md by skills/scripts/build-skills.mjs. Do not edit here — edit the source doc and re-run the script. -->

# React UX Guidance

React-specific patterns for wallet UX. For general wallet UX rules (cancellation handling, error states, copy conventions), see [Best Practices](../best-practices.md).

## Separate Boot from Connection

Use `useStatus().initialised` to distinguish "the wallet SDK is still initialising" from "the wallet is initialised but no user is connected." A `Connect` button rendered before the provider has initialised can feel broken — the click does nothing useful.

```tsx
const { initialised, status } = useStatus();

if (!initialised) return <SkeletonButton />;
if (status === 'disconnected') return <ConnectButton />;
return <AccountButton />;
```

## Drive Mutations from Explicit User Action

Mutation hooks (`useConnect`, `useTransfer`, `useSignMessage`, etc.) should fire from button clicks or other intentional user actions — never on mount or in render. Use `isPending` for the in-flight state and `onSuccess` / `onError` callbacks for the outcome. Keep app context intact on cancellation so the user can retry without losing state.

## Gate Queries on Connected State

`useBalances` and `usePermissions` already check connection status internally and skip the fetch when disconnected. Apply the same gating logic to your own data — don't render balance or permission panels in a layout that implies data should exist before the user has connected.

## Mount the Provider Once, at a Stable Boundary

Mount `MegaProvider` at the durable shell of your app (root layout, top-level provider tree). Recreating it on route transitions causes the iframe to remount, the Penpal bridge to re-handshake, and React Query state to reset — all avoidable churn.

```tsx
// app/layout.tsx
import { MegaProvider } from '@megaeth-labs/wallet-sdk-react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <MegaProvider config={{ network: 'mainnet' }}>
          {children}
        </MegaProvider>
      </body>
    </html>
  );
}
```

If you need different configs on different routes, prefer config that changes via React state inside one provider over remounting the provider with a different config.

## Copy Conventions

For account onboarding, prefer "Creating your account" and "Restoring account" — see [Best Practices > Account recovery wording](../core-sdk/error-handling.md#account-recovery-wording) for the full guidance.
