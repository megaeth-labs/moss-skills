<!-- AUTO-GENERATED from wallet/privy-migration.md by skills/scripts/build-skills.mjs. Do not edit here — edit the source doc and re-run the script. -->

---
description: Build a guided wizard that moves a user's assets from an existing Privy embedded wallet into a new MOSS wallet.
---

# Migrating from Privy to MOSS

This guide describes a guided wizard that moves a user's assets from their existing Privy embedded wallet into a newly created MOSS wallet. The end user experiences it as one flow: **sign in → create MOSS account → review assets → move assets → done** — without needing to understand wallet infrastructure.

{% hint style="warning" %}
This is **not** a private-key migration. The Privy wallet stays a separate wallet; you move *assets* from the old Privy address to the user's new MOSS address. Never ask the user to export a private key or seed phrase.
{% endhint %}

## Responsibilities

- **MOSS** supplies the destination: create or connect a MOSS account and read its address.
- **Your app** does the rest: read the Privy wallet's balances, build a transfer plan, send the assets from the Privy wallet (Privy signs and broadcasts), and track each transaction.

End-to-end flow:

1. User signs in with your existing Privy auth → you have the Privy user, wallet id, and address.
2. User creates a MOSS account → you have the destination address.
3. Your backend scans the Privy wallet's balances and builds a transfer plan.
4. User reviews supported assets and confirms.
5. Your app sends the transfers from the Privy wallet to the MOSS address.
6. You track each transaction to completion and handle partial completion.

## Prerequisites

- Your existing Privy auth and embedded wallets (Privy **App ID** client-side; **App Secret** server-side only).
- The MOSS SDK, to create the destination account.
- An RPC or indexer for balance discovery, plus a supported-token allowlist.

## Get the MOSS destination address

This is the only MOSS-side step. Create or connect the account and read the address — MOSS plays no other role in the transfer.

```typescript
import { mega } from '@megaeth-labs/wallet-sdk';

await mega.initialise({ network: 'mainnet' });

const { status, address } = await mega.connect();
if (status !== 'connected' || !address) {
  throw new Error('MOSS account not connected');
}

const mossWalletAddress = address; // destination for the migration
```

See [`mega.connect()`](methods/connect.md) and [`mega.initialise()`](methods/initialise.md).

## Send assets from the Privy wallet

Use the **client-led** path: the user owns the Privy embedded wallet and approves each transfer in the browser with Privy's React SDK (`useSendTransaction`). If you already run Privy server wallets with policies, you can instead drive transfers server-side and track them via Privy webhooks — only worth it if that infrastructure is already in place.

{% hint style="warning" %}
**Transfer the native gas token last.** Move ERC-20s (and NFTs, if supported) first, then send the remaining native balance minus a gas reserve:

```
1. ERC-20 transfers
2. NFT transfers (if supported)
3. Native token last, minus a gas reserve
```

Sending the full native balance first leaves later transfers unable to pay gas.
{% endhint %}

Standard Privy embedded wallets are EOAs and can't batch, so "move everything" is usually several transactions. Present it as one wizard with a step/progress tracker even though it runs as multiple txs.

## Asset discovery

Keep v1 reliable: native token plus an allowlist of ERC-20s. Read balances from an indexer or RPC, and hide unknown or spam assets under "Not supported yet."

| Asset class | v1 |
| --- | --- |
| Native token | Yes — transferred last, with a gas reserve |
| Allowlisted ERC-20 | Yes |
| NFTs (ERC-721 / ERC-1155) | Defer to a later version |
| Unknown / spam | Never — allowlist only |

## Track migration state

Model each migration as a session with per-transfer status so you can resume and report partial completion. A minimal transfer shape:

```typescript
type TransferStatus =
  | 'planned'
  | 'awaiting_signature'
  | 'submitted'
  | 'confirmed'
  | 'failed'
  | 'skipped';

type MigrationTransfer = {
  chainId: number;
  type: 'native' | 'erc20' | 'erc721' | 'erc1155';
  from: string;            // Privy address
  to: string;              // MOSS address
  contractAddress?: string;
  amount?: string;
  status: TransferStatus;
  txHash?: string;
};
```

Do not mark the migration complete until destination receipts are confirmed.

## Security

- Never ask for a private key or seed phrase; never send Privy app secrets to the client.
- Confirm the MOSS destination address and show a transfer summary before executing.
- Use an asset allowlist, leave a gas reserve, track each transaction independently, and allow cancellation before execution begins.

## Related

- [`mega.connect()`](methods/connect.md) — create or connect the destination MOSS account.
- [MOSS Authentication](authentication.md) — sign the user into MOSS after migration.
- [Best Practices](best-practices.md) — production hardening for the MOSS side.

## Privy references

- [Embedded wallets overview](https://docs.privy.io/wallets/overview)
- [Send a transaction (React)](https://docs.privy.io/wallets/using-wallets/ethereum/send-a-transaction)
- [Transaction webhooks](https://docs.privy.io/wallets/gas-and-asset-management/assets/transaction-event-webhooks)
