<!-- AUTO-GENERATED from wallet/deposit-flows.md by skills/scripts/build-skills.mjs. Do not edit here — edit the source doc and re-run the script. -->

# Deposit Flows (Unifold)

The built-in MOSS deposit flow is the recommended funding path for partner apps: one SDK call, consistent UX inside the wallet surface, no custom funding UI to maintain. Users can also pay gas with ETH or enabled stablecoins (currently USDm and USDT0), so there's no required ETH balance to onboard.

## Minimal Implementation

Ensure the wallet is connected, then call `mega.deposit()` to open the built-in funding UI.

```typescript
import { mega } from '@megaeth-labs/wallet-sdk';

await mega.initialise({ network: 'mainnet' });

const state = await mega.status();
if (state.status !== 'connected') {
  await mega.connect();
}

await mega.deposit();
```

## React Implementation

```tsx
import { useDeposit } from '@megaeth-labs/wallet-sdk-react';

export function DepositButton() {
  const { mutate: deposit, isPending } = useDeposit();

  return (
    <button onClick={() => deposit()} disabled={isPending}>
      {isPending ? 'Opening...' : 'Add funds'}
    </button>
  );
}
```

## When to Bring Your Own Flow

Only choose a custom funding flow if you have strict product or compliance requirements that can't be met by the built-in deposit UI. Account for the extra cost: wallet context handoff, error states, retries, and long-term UX maintenance.

## Related

- [Quickstart](quickstart.md) — fit `mega.deposit()` into your first integration.
- [`mega.deposit()`](methods/deposit.md) — exact method signature and behavior.
- [Paymaster Guide](paymaster-setup.md) — configure sponsor mode and sponsorship policy alongside deposits.
