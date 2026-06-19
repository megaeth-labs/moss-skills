<!-- AUTO-GENERATED from wallet/react/wagmi-connector.md by skills/scripts/build-skills.mjs. Do not edit here — edit the source doc and re-run the script. -->

# Use MOSS with Wagmi

Use `@megaeth-labs/wallet-wagmi-connector` when your app already uses wagmi/viem and you want MOSS as a connector instead of the React hooks wrapper.

## Install

```bash
pnpm add @megaeth-labs/wallet-wagmi-connector wagmi viem @tanstack/react-query
```

## Configure Connector

```ts
import { createConfig, http } from 'wagmi';
import { megaeth } from 'viem/chains';
import { megaWallet } from '@megaeth-labs/wallet-wagmi-connector';

export const config = createConfig({
  chains: [megaeth],
  connectors: [
    megaWallet({
      network: 'mainnet',
      sponsorMode: 'app-only',
      sponsorToken: 'native',
    }),
  ],
  transports: {
    [megaeth.id]: http(),
  },
});
```

## Wrap App

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { config } from './wagmi';

const queryClient = new QueryClient();

export function App({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
```

## Connect Example

```tsx
import { useAccount, useConnect, useDisconnect } from 'wagmi';

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const connector = connectors.find((c) => c.id === 'mossWallet');

  if (isConnected) {
    return <button onClick={() => disconnect()}>{address}</button>;
  }

  return (
    <button disabled={!connector} onClick={() => connector && connect({ connector })}>
      Connect MOSS Wallet
    </button>
  );
}
```

## Custom Wallet Methods

Beyond standard EIP-1193 methods, the provider supports wallet-specific methods via `provider.request()`:

```ts
const provider = await config.connectors[0].getProvider();

const balances = await provider.request({
  method: 'wallet_balances',
  params: [{ tokens: ['0x4200000000000000000000000000000000000006'] }],
});
```

Supported wallet methods include:
- `wallet_authenticate`
- `wallet_balances`
- `wallet_callContract`
- `wallet_deposit`
- `wallet_getFromContract`
- `wallet_getPermissions`
- `wallet_grantPermissions`
- `wallet_manageAccount`
- `wallet_open`
- `wallet_revokePermissions`
- `wallet_send`
- `wallet_signData`
- `wallet_swap`
- `wallet_transfer`

{% hint style="info" %}
Smart Approvals (Policy Engine) still use the same permission shape and guidance. See [Smart Approvals docs](../core-sdk/permissions.md) for canonical `{ to, signature }` matching.
{% endhint %}

## Notes

- Connector is fixed-network per instance. Programmatic chain switching is not supported.
- Keep one active MegaETH connector configuration per page load.
- `eth_sendTransaction` is mapped to core SDK `callContract` using `{ address, data, value }`.
- Unsupported `eth_sendTransaction` fields are rejected (not silently ignored).
