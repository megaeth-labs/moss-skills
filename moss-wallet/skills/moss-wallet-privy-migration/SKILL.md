---
name: moss-wallet-privy-migration
description: Builds a guided wizard that moves a user's assets from a Privy embedded wallet into a new MOSS account on MegaETH. Use when migrating users off Privy: create or connect the MOSS account with mega.initialise() + mega.connect() to get the destination address, then transfer assets from the Privy EOA (Privy signs and broadcasts). Encodes the critical ordering — ERC-20s first, NFTs next, native token last minus a gas reserve — plus an asset allowlist, per-transfer state tracking with resumable partial completion, and the hard rule never to export, request, or move private keys or seed phrases. This is an asset migration, not a key migration.
license: MIT
compatibility: Claude Code, Codex, Cursor, Gemini, Copilot. Targets @megaeth-labs/wallet-sdk v0.1.x + the Privy SDK.
metadata:
  package: "@megaeth-labs/wallet-sdk"
  network-mainnet-chainid: "4326"
  network-testnet-chainid: "6343"
  native-token-sentinel: "0x0000000000000000000000000000000000000000"
---

# Migrate Privy assets into a MOSS account

A guided wizard that moves a user's **assets** from their Privy embedded wallet (an EOA) to a freshly created MOSS account on MegaETH. The user experiences one flow: sign in → create MOSS account → review assets → move assets → done. MOSS only supplies the **destination address**; the Privy SDK signs and broadcasts every transfer from the Privy EOA.

This is an **asset migration, not a key migration**. The Privy wallet remains a distinct wallet — you move tokens out of it, you do not import it.

## Golden rules

1. **NEVER request, export, log, or move a private key or seed phrase.** No code path should ever touch key material. MOSS confirmations live in the hosted wallet; Privy keeps its own keys. Use the wording "Recovery Code", never "seed phrase".
2. **MOSS only provides the destination.** Get it with `mega.initialise()` then `mega.connect()` → `address`. MOSS plays no other role in the transfer.
3. **Privy signs and broadcasts each transfer** from the Privy EOA (e.g. Privy's `useSendTransaction`). The MOSS SDK never sends these transfers.
4. **Order matters: ERC-20 FIRST, NFTs (ERC-721/1155) next, native token LAST minus a gas reserve.** Sending the full native balance first leaves later transfers unable to pay gas. Skip native entirely if balance ≤ reserve.
5. **Allowlist assets.** v1 = native + a curated ERC-20 allowlist. Hide unknown/spam under "Not supported yet." Never auto-transfer non-allowlisted contracts.
6. **Confirm the MOSS destination and show a summary before executing.** Display the destination address and the full transfer plan; allow cancellation before the first signature.
7. **Track each transfer independently with `TransferStatus`; make it resumable.** Persist per-transfer state so a partially completed migration can resume. Standard Privy EOAs cannot batch, so "move everything" is several txs presented as one wizard.
8. **Do not mark the migration complete until destination receipts confirm.** A submitted tx is not a confirmed tx.

## Install

```bash
npm i @megaeth-labs/wallet-sdk
# Privy SDK is your existing dependency (e.g. @privy-io/react-auth). App Secret stays server-side only.
```

## Step 1 — Get the MOSS destination (the only MOSS-side step)

```typescript
import { mega } from '@megaeth-labs/wallet-sdk';

await mega.initialise({ network: 'mainnet' }); // call once at boot; idempotent; browser only

const res = await mega.connect();
// methods resolve on cancel — never throw; branch on status
if (res.status !== 'connected' || !res.address) {
  // 'cancelled' is NEUTRAL — user backed out, not an error toast
  return;
}
const mossDestination = res.address; // 0x... destination for every transfer
```

## Step 2 — Build the ordered plan

Read the Privy wallet's balances from your indexer/RPC, filter to the allowlist, and order them. Use the bundled helper rather than re-deriving the ordering by hand.

```bash
node scripts/build-migration-plan.mjs ./migration-config.json
```

The helper returns an ordered `MigrationTransfer[]` (ERC-20s → NFTs → native last, minus the gas reserve; native `skipped` if balance ≤ reserve; non-allowlisted entries `skipped`). See [build-migration-plan.mjs](scripts/build-migration-plan.mjs).

## Step 3 — Execute each transfer from the Privy EOA

Privy signs and broadcasts. MOSS is not involved here — `mossDestination` is just the `to`. Walk the plan in order and update state per transfer.

```typescript
// Pseudocode — wiring depends on your Privy setup (e.g. useSendTransaction from @privy-io/react-auth).
for (const t of plan) {
  if (t.status === 'skipped') continue;

  setStatus(t, 'awaiting_signature');
  try {
    // Privy signs + broadcasts from the Privy EOA. Native -> { to, value }; ERC-20/NFT -> encoded transfer calldata to contractAddress.
    const { hash } = await privySendTransaction(buildTx(t));   // YOUR Privy call
    setStatus(t, 'submitted', hash);

    const receipt = await waitForReceipt(hash);                // YOUR RPC wait
    setStatus(t, receipt.status ? 'confirmed' : 'failed', hash);
  } catch (err) {
    setStatus(t, 'failed');                                    // resumable: re-run picks up non-confirmed transfers
  }
}
// Mark migration complete ONLY when every non-skipped transfer is 'confirmed'.
```

### Transfer state machine

`planned → awaiting_signature → submitted → confirmed` (terminal). Branches: `→ failed` (retryable) and `→ skipped` (native ≤ reserve, or non-allowlisted asset — terminal, never executed). Resume = re-run the plan and act on any transfer not in `confirmed`/`skipped`.

```typescript
type TransferStatus =
  | 'planned' | 'awaiting_signature' | 'submitted' | 'confirmed' | 'failed' | 'skipped';

type MigrationTransfer = {
  chainId: number;
  type: 'native' | 'erc20' | 'erc721' | 'erc1155';
  from: string;             // Privy EOA
  to: string;               // MOSS destination
  contractAddress?: string;
  tokenId?: string;
  amount?: string;          // wei (native) / smallest unit (token)
  status: TransferStatus;
  txHash?: string;
};
```

## Capability map

| Need | API / source |
| --- | --- |
| Initialise MOSS SDK (once, at boot) | `mega.initialise({ network })` |
| Get the MOSS destination address | `mega.connect()` → `{ status, address }` |
| Re-check MOSS connection later | `mega.status()` |
| Build the ordered, allowlisted plan | `scripts/build-migration-plan.mjs` |
| Sign + broadcast each transfer | **Privy SDK** (e.g. `useSendTransaction`) — not MOSS |
| Read Privy balances | Your indexer/RPC (MOSS does not read the Privy wallet) |
| Native token sentinel | `0x0000000000000000000000000000000000000000` |

> Note: `mega.transfer(...)` / `mega.balances(...)` operate on the **MOSS** account, not the Privy wallet — they are not used to move assets out of Privy. The Privy SDK owns those transfers.

## References

- See [privy-migration.md](references/privy-migration.md) for the full wizard design, asset-class support table, responsibilities split, and security checklist.

## Scripts

- **RUN** [build-migration-plan.mjs](scripts/build-migration-plan.mjs) — executable Node ESM helper. Exports `buildMigrationPlan(...)` and prints a plan when run directly: `node scripts/build-migration-plan.mjs ./migration-config.json`. No external deps. Never touches keys.

## Related skills

- **moss-wallet-sdk** — core `mega` surface and the connect lifecycle for the destination account.
- **moss-wallet-react** — `<MegaProvider>` + hooks (`useStatus`, `useConnect`) for wiring the wizard UI.
- **moss-wallet-server-verify** — sign the migrated user into MOSS afterward (server-side message/signature verification).
- **moss-wallet-security-review** — pre-ship audit of the safety rules above.

<details>
<summary>Old patterns to avoid</summary>

- ❌ Asking the user to "export your private key / seed phrase" to import the Privy wallet. This is an asset migration; key material is never touched. Say "Recovery Code", never "seed phrase".
- ❌ Sending the native token first (or sending the full native balance). Native goes LAST, minus a gas reserve, or later transfers cannot pay gas.
- ❌ Auto-transferring every token found on the Privy address. Use an allowlist; hide unknown/spam.
- ❌ Treating a `'cancelled'` result from a MOSS method as an error. MOSS methods resolve (never throw) on cancel — it is neutral.
- ❌ Using `mega.transfer()` to move Privy assets. That sends from the MOSS account; Privy assets are signed and broadcast by the Privy SDK.
- ❌ Marking the migration "done" on submission. Wait for confirmed destination receipts; persist per-transfer state so it can resume.
- ❌ Expecting one batched "move everything" tx. Standard Privy EOAs cannot batch — it is several txs shown as one wizard.

</details>
