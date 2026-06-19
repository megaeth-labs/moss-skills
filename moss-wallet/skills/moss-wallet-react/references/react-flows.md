<!-- AUTO-GENERATED from wallet/react/flows.md by skills/scripts/build-skills.mjs. Do not edit here — edit the source doc and re-run the script. -->

---
description: Build realistic connect, sign, transfer, and contract flows with the MOSS React SDK.
---

# Compose Wallet Flows

{% hint style="info" %}
Treat these as product-flow patterns, not just code snippets. The goal is predictable user intent, clear approvals, and minimal delegated authority by default.
{% endhint %}

## Connect and Gate UI

```tsx
function WalletButton() {
  const status = useStatus();
  const connect = useConnect();

  if (!status.initialised) return <button disabled>Loading wallet...</button>;

  return (
    <button onClick={() => connect.mutate()}>
      {status.status === 'connected' ? status.address : 'Connect MOSS'}
    </button>
  );
}
```

Use this first step to gate account access. In connected-wallet UX copy, prefer:
- Creating your account
- Restoring account

## Sign After Connect

```tsx
function SignInButton() {
  const signMessage = useSignMessage();

  return (
    <button onClick={() => signMessage.mutate('Sign in to Example App')}>
      Sign in with MOSS
    </button>
  );
}
```

## MOSS Auth Token Flow

```tsx
function AuthButton() {
  const authenticate = useAuthenticate();

  return (
    <button
      onClick={() =>
        authenticate.mutate(undefined, {
          onSuccess: async (result) => {
            if (result.status === 'success' && result.jwt) {
              await fetch('/api/auth/moss', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ jwt: result.jwt }),
              });
            }
          },
        })
      }
    >
      Authenticate with MOSS
    </button>
  );
}
```

## Transfer with Post-Success Refresh

```tsx
function SendButton() {
  const transfer = useTransfer({
    onSuccess: (result) => {
      if (result.status === 'approved') {
        console.log('Receipt hash:', result.receipt?.hash);
      }
    },
  });

  return (
    <button
      onClick={() =>
        transfer.mutate({
          amount: '1000000000000000000',
          to: '0xabc123abc123abc123abc123abc123abc123abcd',
          type: 'native',
        })
      }
    >
      Send 1 ETH
    </button>
  );
}
```

## Wallet-Native Send/Swap Entry

```tsx
function WalletActions() {
  const send = useSend();
  const swap = useSwap();

  return (
    <>
      <button onClick={() => send.mutate({ token: 'native', destination: '0xabc123abc123abc123abc123abc123abc123abcd' })}>
        Send from wallet flow
      </button>
      <button onClick={() => swap.mutate({ fromToken: 'native', toToken: '0xfeedfeedfeedfeedfeedfeedfeedfeedfeedfeed' })}>
        Swap from wallet flow
      </button>
    </>
  );
}
```

## Read Contract Data in a Flow

```tsx
function TokenSymbolButton() {
  const getFromContract = useGetFromContract();

  return (
    <button
      onClick={() =>
        getFromContract.mutate({
          address: '0xfeedfeedfeedfeedfeedfeedfeedfeedfeedfeed',
          abi: erc20Abi,
          functionName: 'symbol',
          args: [],
        })
      }
    >
      Load token symbol
    </button>
  );
}
```

## Permissions-First Automation

When a flow needs follow-up actions without repeated prompts, grant the narrowest possible app permissions first and only then introduce silent behavior for session grants.

```tsx
function ApproveWithGuardrails() {
  const grantPermissions = useGrantPermissions();

  return (
    <button
      onClick={() =>
        grantPermissions.mutate({
          permissions: {
            expiry: Math.floor(Date.now() / 1000) + 10 * 60,
            permissions: {
              calls: [{ to: "0xTokenContractAddress", signature: "approve(address,uint256)" }],
              spend: [{ limit: 1000000000000000n, period: "day" }],
            },
          },
        })
      }
    >
      Enable guarded automation
    </button>
  );
}
```
