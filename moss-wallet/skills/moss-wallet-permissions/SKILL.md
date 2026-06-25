---
name: moss-wallet-permissions
description: "Designs and implements MOSS Smart Approvals — session-key permission grants for delegated and silent execution on MegaETH. Use when an integration needs mega.grantPermissions(), mega.getPermissions(), mega.revokePermissions(), or callContract({ silent: true }), or when building AI-agent loops, game automation, recurring spends, or checkout flows that run without per-action prompts. Encodes the canonical { to, signature } call matcher plus scoped spend limits with a period, short expiry windows, least-privilege defaults, and a revocation plan. Explains that silent: true only works against a matching grant and otherwise falls back to wallet UI."
---

# MOSS Smart Approvals (Permissions)

Smart Approvals are scoped session grants. The user approves a policy **once**, then your app runs matching actions silently — no per-action wallet prompt — until the grant expires, the spend cap is hit, or it is revoked. This is the same single pattern behind AI agents, game automation, recurring spends, and checkout.

## Golden rules

1. **Shortest practical expiry.** 24h max for active foreground sessions; 7 days max for background agents. `expiry` is Unix **seconds** (`Math.floor(Date.now()/1000) + ttl`), not ms.
2. **Every `calls[]` entry needs BOTH `to` and `signature`.** A `to`-only or `signature`-only entry is not the documented matcher and will not reliably match. Signature is the canonical form, e.g. `'rebalance()'`, `'approve(address,uint256)'`.
3. **Smallest viable `spend.limit`.** It is a **`bigint` in wei** (e.g. `200000000000000000n` = 0.2 ETH), never a decimal string. Always pair it with a `period`. Omit `token` for native; set `token: '0x...'` to cap a specific ERC-20.
4. **No preemptive grants.** Grant exactly what the next run needs, when it needs it. Never ask for broad scope "just in case."
5. **`silent: true` only works after a matching grant.** With no unexpired `{ to, signature }` grant covering the call, it **errors** — unless you set `silentUIApproveFallback: true`, which falls back to the wallet UI and sets `silentHasUsedFallback` on the result.
6. **Always ship a revoke path.** Expose `mega.revokePermissions()` in your UI **and** keep a server-side denylist switch you control. `revokePermissions()` revokes **ALL** grants for the app.
7. **`externalAddress` is advanced.** Binds a grant to a delegated external account; only use it with extra review. Default grants omit it.
8. **`cancelled` is neutral.** SDK methods do not throw on user cancel — they resolve with `status: 'cancelled'`. Branch on `result.status`; never show an error toast for `cancelled`.

## Install

```bash
npm i @megaeth-labs/wallet-sdk
```

Call `mega.initialise({ network })` once at boot, then `mega.connect()` before any grant. (See `moss-wallet-sdk`.)

## The exact grant payload (double-nested)

The `permissions` key nests a second `permissions` inside it. Outer level carries `expiry`; inner level carries `calls` + `spend`. Get this nesting right.

```ts
import { mega } from '@megaeth-labs/wallet-sdk';

const ttl = 60 * 60 * 6; // 6h background-agent session

const res = await mega.grantPermissions({
  permissions: {
    expiry: Math.floor(Date.now() / 1000) + ttl, // Unix SECONDS
    permissions: {
      calls: [
        { to: '0xYourVaultContract', signature: 'rebalance()' }, // BOTH fields
      ],
      spend: [
        { limit: 200000000000000000n, period: 'day' }, // bigint wei, native
      ],
    },
  },
});

if (res.status === 'cancelled') {
  // User declined the policy. Do not retry silently; surface a neutral prompt.
  return;
}
// res.status === 'approved' → you may now run matching calls silently.
```

## Silent execution against the grant

```ts
const tx = await mega.callContract({
  address: '0xYourVaultContract',
  abi: vaultAbi,
  functionName: 'rebalance',
  args: [],
  silent: true,
  // Optional: fall back to wallet UI instead of erroring if no grant matches.
  silentUIApproveFallback: true,
});

if (tx.status === 'approved') {
  if (tx.silentHasUsedFallback) {
    // Grant was missing/expired; the wallet prompted the user this time.
    // Re-grant before the next run to stay silent.
  }
  // tx.receipt.hash available
} else if (tx.status === 'cancelled') {
  // Neutral — user dismissed. No error toast.
} else {
  // tx.status === 'error' — inspect tx.error; consider revoking on repeated failure.
}
```

## The grant → execute → revoke loop

The canonical agent lifecycle. Check for an existing grant, grant only if absent, execute silently, revoke when the job is done or on failure.

```ts
import { mega } from '@megaeth-labs/wallet-sdk';

async function runAgentJob(vault: `0x${string}`, vaultAbi: unknown) {
  // 1. Reuse an existing grant when possible — don't re-prompt every run.
  const current = await mega.getPermissions();
  if (!current?.permissions) {
    const granted = await mega.grantPermissions({
      permissions: {
        expiry: Math.floor(Date.now() / 1000) + 60 * 60 * 6,
        permissions: {
          calls: [{ to: vault, signature: 'rebalance()' }],
          spend: [{ limit: 200000000000000000n, period: 'day' }],
        },
      },
    });
    if (granted.status !== 'approved') return; // declined → stop
  }

  // 2. Execute silently within the granted scope.
  const tx = await mega.callContract({
    address: vault,
    abi: vaultAbi,
    functionName: 'rebalance',
    args: [],
    silent: true,
  });

  // 3. Revoke on terminal failure (or when the job is finished).
  if (tx.status === 'error') {
    await mega.revokePermissions(); // revokes ALL app grants
  }
  return tx;
}
```

> AI agents, game automation, recurring spends, and checkout flows are **the same pattern** — only the `calls[]` scope, `spend` cap, and `period` change. See `references/agent-patterns.md` for the five worked patterns.

## Capability / method map

| Need | API |
| --- | --- |
| Grant a scoped session policy | `mega.grantPermissions({ permissions, externalAddress?, sponsor? })` |
| Read the active grant (or for an address) | `mega.getPermissions(address?)` |
| Revoke **all** app grants | `mega.revokePermissions()` |
| Run a permitted call without a prompt | `mega.callContract({ ..., silent: true })` |
| Avoid hard error when no grant matches | add `silentUIApproveFallback: true` |
| Build the grant payload offline | `scripts/build-permission-policy.mjs` |

`grantPermissions` resolves to `{ status: 'approved' | 'cancelled' }`. `getPermissions` resolves to `{ permissions?: {...} | null } | undefined`. `revokePermissions` resolves to `void`.

## References

- See [permission-model-types.md](references/permission-model-types.md) for the full `Permission` type and the doubly-nested payload shape.
- See [smart-approvals.md](references/smart-approvals.md) for the conceptual model, managing/reading grants, and troubleshooting (expired, exhausted, wrong scope).
- See [agent-patterns.md](references/agent-patterns.md) for the five worked patterns (cross-app DeFi, game automation, personal finance, agent-owned wallet, autonomous trading) and tradeoffs vs raw EOA / custom escrow.

## Scripts

- `scripts/build-permission-policy.mjs` — **executable** Node ESM helper. Builds and validates the exact `grantPermissions` payload from a JSON config (calls, spend, ttlSeconds). RUN it to generate/check a payload:

  ```bash
  node scripts/build-permission-policy.mjs ./policy.json
  ```

  It is also importable: `import { buildPermissionPolicy } from './scripts/build-permission-policy.mjs'`. Note: it serialises `spend.limit` as a **string** for JSON output — convert back to `bigint` at the real `grantPermissions` call site.

## When to switch skills / Related skills

- Connecting / initialising / general `callContract` and `transfer` → `moss-wallet-sdk`.
- React hooks (`useGrantPermissions`, `usePermissions`, `useRevokePermissions`, `useCallContract`) → `moss-wallet-react`.
- Delegated session keys from the terminal (`mega moss create-key`, `execute`, `revoke`) → `moss-wallet-cli`.
- Gas sponsorship pairing (`sponsor`, `sponsorMode`) → `moss-wallet-paymaster`.
- Backend signature/JWT verification → `moss-wallet-server-verify`.

## Old patterns

<details>
<summary>Stale assumptions to avoid</summary>

- **`to`-only call grants** — not the documented matcher. Every `calls[]` entry needs both `to` and `signature`.
- **`feeToken` on a grant** — deprecated and ignored; the gas token comes from the granted session permissions. Omit it.
- **Decimal-string `spend.limit`** (e.g. `'0.2'`) — wrong. `limit` is a `bigint` in wei.
- **`expiry` in milliseconds** — wrong. It is Unix **seconds**.
- **Treating `silent: true` as always silent** — it errors with no matching grant unless `silentUIApproveFallback: true` is set (which then prompts and sets `silentHasUsedFallback`).
- **Treating `cancelled` as an error** — methods resolve (not throw) with `status: 'cancelled'`; it is neutral.
- **Per-grant revoke** — `revokePermissions()` is all-or-nothing for the app; there is no single-grant revoke method.
- **Multi-listener `onStatusChange`** — `mega.events.onStatusChange` registers a single handler, not a bus.

</details>
