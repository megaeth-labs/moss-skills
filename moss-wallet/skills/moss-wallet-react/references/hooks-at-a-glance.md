<!-- AUTO-GENERATED from wallet/react/hooks.md by skills/scripts/build-skills.mjs. Do not edit here — edit the source doc and re-run the script. -->

# React Hooks at a Glance

A scannable tour of every hook in `@megaeth-labs/wallet-sdk-react`, grouped by purpose. For full signatures, options, and per-hook examples, see [React SDK Reference](overview.md). Each hook maps to a core SDK method — the corresponding method page is the source of truth for parameters and return types.

Mutation hooks wrap actions (`mutate`, `mutateAsync`). Query hooks (`useBalances`, `usePermissions`) gate themselves on connected status.

## Status

```tsx
const status = useStatus();
console.log(status.initialised, status.status, status.address);
```

## Connection

```tsx
const connect = useConnect();
const disconnect = useDisconnect();

connect.mutate();
disconnect.mutate();
```

→ [`mega.connect()`](../methods/connect.md), [`mega.disconnect()`](../methods/disconnect.md)

## Signing

```tsx
const signMessage = useSignMessage();
const signData = useSignData();
const authenticate = useAuthenticate();

signMessage.mutate('Sign in to Example App');
signData.mutate({ data: { /* EIP-712 payload */ } });
authenticate.mutate();
```

→ [`mega.signMessage()`](../methods/sign-message.md), [`mega.signData()`](../methods/sign-data.md), [`mega.authenticate()`](../methods/authenticate.md)

## Transactions

```tsx
const transfer = useTransfer();
const send = useSend();
const swap = useSwap();
const deposit = useDeposit();

transfer.mutate({
  amount: '1000000000000000000',
  to: '0xabc123abc123abc123abc123abc123abc123abcd',
  type: 'native',
});
send.mutate({ token: 'native', destination: '0xabc...' });
swap.mutate({ fromToken: 'native', toToken: '0xfeed...' });
deposit.mutate();
```

→ [`mega.transfer()`](../methods/transfer.md), [`mega.send()`](../methods/send.md), [`mega.swap()`](../methods/swap.md), [`mega.deposit()`](../methods/deposit.md)

## Contracts

```tsx
const callContract = useCallContract();
const getFromContract = useGetFromContract();

callContract.mutate({
  address: '0xfeed...',
  abi: erc20Abi,
  functionName: 'approve',
  args: ['0xspender...', '1000000'],
});

getFromContract.mutate({
  address: '0xfeed...',
  abi: erc20Abi,
  functionName: 'symbol',
  args: [],
});
```

→ [`mega.callContract()`](../methods/call-contract.md), [`mega.getFromContract()`](../methods/get-from-contract.md)

## Smart Approvals

```tsx
const grantPermissions = useGrantPermissions();
const revokePermissions = useRevokePermissions();
const permissions = usePermissions();

grantPermissions.mutate({
  permissions: {
    expiry: Math.floor(Date.now() / 1000) + 600,
    permissions: {
      calls: [{ to: '0xTokenContract', signature: 'approve(address,uint256)' }],
      spend: [{ limit: 1000000000000000n, period: 'day' }],
    },
  },
});

revokePermissions.mutate();
console.log(permissions.data);
```

→ [`mega.grantPermissions()`](../methods/grant-permissions.md), [`mega.revokePermissions()`](../methods/revoke-permissions.md), [`mega.getPermissions()`](../methods/get-permissions.md)

## Balances

```tsx
const balances = useBalances(['0x0000000000000000000000000000000000000000']);
console.log(balances.data);
```

→ [`mega.balances()`](../methods/balances.md)

## Notes

- `useBalances` and `usePermissions` only fetch when the wallet status is `connected`. No manual gating needed.
- Users can revoke per-app permissions from wallet/account settings — not only via `revokePermissions.mutate()`.
- Don't make session-style permissions a frontend-only trust model. For high-risk actions, pair with backend verification. See [Best Practices](../best-practices.md).
