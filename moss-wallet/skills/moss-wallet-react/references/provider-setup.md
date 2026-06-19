<!-- AUTO-GENERATED from wallet/react/provider-setup.md by skills/scripts/build-skills.mjs. Do not edit here — edit the source doc and re-run the script. -->

# Set up MegaProvider

The React SDK exposes a single provider component that initialises MOSS and injects a React Query client for wallet hooks. **Initialisation runs once per page load** — a module-level guard prevents re-initialisation on re-renders or remount. The `QueryClient` is also a module-level singleton, shared across all `MegaProvider` instances on the page.

## Basic Usage

```tsx
import { MegaProvider } from '@megaeth-labs/wallet-sdk-react';

export function AppShell() {
  return (
    <MegaProvider config={{ network: 'mainnet', logging: 'error' }}>
      <App />
    </MegaProvider>
  );
}
```

## Observed Provider Behavior

- Stores `initialised` and `status` in React state
- Registers `mega.events.onStatusChange(setStatus)`
- Calls `mega.initialise(config)` once inside `useEffect`
- Wraps children in a `QueryClientProvider`

## Status Shape in App Code

```tsx
const { status, address, network, initialised } = useStatus();

if (!initialised) return <p>Loading wallet…</p>;
if (status === 'connected') return <p>Connected account: {address} on {network}</p>;
return <p>No connected account</p>;
```

Use this status model to drive account access UI and loading states.

## Placement Guidance

- Put `MegaProvider` high enough that all wallet-aware routes can access hooks.
- Avoid mounting and unmounting it repeatedly during normal navigation.
- Because initialisation runs once per page load, **changing `config` after the first render does not re-initialise** the wallet — set the right network/logging config from the start.
- If your app already owns a global React Query client strategy, test provider nesting carefully — the package's internal `QueryClient` is a module-level singleton.
