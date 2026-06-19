<!-- AUTO-GENERATED from wallet/core-sdk/permissions.md by skills/scripts/build-skills.mjs. Do not edit here — edit the source doc and re-run the script. -->

# Smart Approvals (Policy Engine)

Smart Approvals is MOSS's name for permissions and session grants — the same feature the Policy Engine docs refer to. Session grants let your app perform approved actions without repeated prompts while keeping account access scoped.

Use app permissions when you want better UX for repeated actions: contract calls, recurring spends, or automated agent flows.

## Permission Model (SDK Source of Truth)

```ts
interface Permission {
  id?: string
  expiry: number
  /** @deprecated No longer used — the gas token is taken from the granted session permissions. */
  feeToken?: {
    limit: string
    symbol?: string
  }
  permissions: {
    calls: {
      signature: string
      to: string
    }[]
    spend: {
      limit: bigint
      period: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year'
      token?: `0x${string}`
    }[]
  }
}
```

```ts
grantPermissions({ permissions, externalAddress?, sponsor? })
getPermissions(address?)
revokePermissions()
```

- `calls[]` defines contract-call permissions using both `to` and `signature`.
- `spend[]` defines native/token spend caps over a period.
- `expiry` should be a short Unix timestamp window for least-privilege access.
- `sponsor?` can be used when pairing grants with explicit sponsorship policy.

Canonical matching for partner integrations is contract + function scope using `{ to, signature }`. Don't treat `to`-only grants as the default documented model — if your integration explores looser matching, treat it as advanced and implementation-specific.

## Granting Session Grants

### 1) Grant a Contract-Call Permission

```ts
const expiry = Math.floor(Date.now() / 1000) + 60 * 10;

await mega.grantPermissions({
  permissions: {
    expiry,
    permissions: {
      calls: [
        {
          to: '0xTokenContractAddress',
          signature: 'approve(address,uint256)',
        },
      ],
      spend: [],
    },
  },
});
```

### 2) Grant a Spend Limit

```ts
const expiry = Math.floor(Date.now() / 1000) + 60 * 60;

await mega.grantPermissions({
  permissions: {
    expiry,
    permissions: {
      calls: [],
      spend: [
        {
          limit: 5000000000000000n,
          period: 'day',
          // token omitted for native
        },
      ],
    },
  },
});
```

### 3) Grant Both Call + Spend in One Session

```ts
const expiry = Math.floor(Date.now() / 1000) + 60 * 30;

await mega.grantPermissions({
  permissions: {
    expiry,
    permissions: {
      calls: [
        {
          to: '0xRouterAddress',
          signature: 'swapExactTokensForTokens(uint256,uint256,address[],address,uint256)',
        },
      ],
      spend: [
        {
          limit: 10000000000000000n,
          period: 'day',
        },
      ],
    },
  },
  // Advanced: bind the grant to a delegated external account if needed.
  externalAddress: '0xExternalDelegateAddress',
});
```

### 4) Use Silent Execution After Permissions Are Granted

```ts
const result = await mega.callContract({
  address: '0xRouterAddress',
  abi: routerAbi,
  functionName: 'swapExactTokensForTokens',
  args: [amountIn, amountOutMin, path, recipient, deadline],
  silent: true,
});

if (result.status === 'cancelled') {
  // User dismissed wallet flow or request was not approved.
}
```

`silent: true` only works when a valid session grant exists for the exact action scope.

## Managing App Permissions

### Read Current Permissions

```ts
const current = await mega.getPermissions(); // active subject
const forAddress = await mega.getPermissions('0xDelegatedAddress'); // explicit subject
```

### Revoke Permissions from the App

```ts
await mega.revokePermissions();
```

### Revoke Permissions from Wallet Settings

Users can revoke permissions per app in wallet/account settings. App revocation is not global-only.

## Security Defaults (Recommended)

- Keep session grants narrow and feature-specific.
- Use the shortest practical expiry window.
- Use minimal spend limits and tighten by token where possible.
- Avoid broad preemptive grants “just in case”.
- Treat `externalAddress?` as an advanced integration field with extra review.

## Troubleshooting

### Silent Call Fails Because Session Permission is Absent

- Re-check that a grant exists for the exact `to` + `signature` pair.
- Verify `silent: true` is only used after a successful `grantPermissions` flow.

### Permission Expired

- Compare current Unix time with `permissions.expiry`.
- Re-request a fresh grant with a new expiry.

### Spend Limit Exhausted

- Inspect active `spend` entries and current consumption in your app flow.
- Request a new grant with an updated limit only when needed.

### Wrong Contract/function Permission

- Confirm the target address matches `calls[].to`.
- Confirm the called function signature matches `calls[].signature`.
- If either differs, request a grant for the exact action.
