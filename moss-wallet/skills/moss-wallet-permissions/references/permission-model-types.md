<!-- AUTO-GENERATED from wallet/methods/grant-permissions.md by skills/scripts/build-skills.mjs. Do not edit here — edit the source doc and re-run the script. -->

# mega.grantPermissions()

Grant scoped delegated permissions (spend caps + call rules + expiry) for session-style execution. After a grant, [`callContract()`](call-contract.md) with `silent: true` can execute matching actions without prompting. See [Smart Approvals (Policy Engine)](../core-sdk/permissions.md) for the conceptual deep-dive.

## Signature

`mega.grantPermissions(request: GrantPermissionsRequest): Promise<GrantPermissionsResponse>`

## Parameters

`GrantPermissionsRequest`:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `permissions` | `Permission` | required | The grant body — expiry, calls, spend caps. |
| `externalAddress` | `` `0x${string}` `` | optional | Bind the grant to a delegated external account (advanced). |
| `sponsor` | `boolean` | optional | Pair the grant with explicit sponsorship policy. |

`Permission`:

```typescript
interface Permission {
  id?: string;                     // Server-assigned grant identifier (set on grants returned from the wallet)
  expiry: number;                  // Unix timestamp
  /** @deprecated No longer used — the gas token is taken from the granted session permissions. */
  feeToken?: {
    limit: string;                 // DECIMAL string, e.g. '0.01' (ETH)
    symbol?: string;
  };
  permissions: {
    calls: { to: string; signature: string }[];  // Allowed contract+function pairs
    spend: {
      limit: bigint;               // Spend cap in WEI, e.g. 5000000000000000n
      period: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
      token?: `0x${string}`;
    }[];
  };
}
```

{% hint style="warning" %}
**`spend[].limit` is a `bigint` in wei**, e.g. `5000000000000000n` = 0.005 ETH. Don't pass a decimal string here.
{% endhint %}

{% hint style="info" %}
`feeToken` is **deprecated** and ignored — the gas token is taken from the granted session permissions. Omit it from new grants.
{% endhint %}

The `permissions` field is doubly nested by design: `request.permissions` (the `Permission` object) contains its own inner `permissions` (the `calls`/`spend` rules). The outer level also carries `expiry`. Mind the `permissions.permissions` nesting when building the object.

## Example

```typescript
const expiry = Math.floor(Date.now() / 1000) + 60 * 30;

await mega.grantPermissions({
  permissions: {
    expiry,
    permissions: {
      calls: [{ to: '0xContractAddress', signature: 'mint(uint256)' }],
      spend: [{
        limit: 1000000000000000n,
        period: 'day',
      }],
    },
  },
  externalAddress: '0xExternalDelegateAddress',
});
```

## Response

```typescript
type GrantPermissionsResponse = {
  status: 'approved' | 'cancelled';
};
```

## Canonical Call Matcher

Each `calls[]` entry should include both `to` (contract address) and `signature` (function signature, e.g., `'mint(uint256)'`). `to`-only or `signature`-only matching is not the documented integration model.

## Notes

- **Use least-privilege defaults:** narrow calls, low spend caps, short expiry (24h max for active sessions, 7 days for background agents).
- Expose a revoke control in your UI ([`revokePermissions()`](revoke-permissions.md)). Users can also revoke from wallet settings.
- See [Best Practices](../best-practices.md) for production permission patterns.
