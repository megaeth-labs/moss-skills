<!-- AUTO-GENERATED from wallet/core-sdk/lifecycle.md by skills/scripts/build-skills.mjs. Do not edit here — edit the source doc and re-run the script. -->

# Connection Lifecycle

The lifecycle methods control how your app checks wallet state, prompts the user, disconnects, or brings the wallet UI forward.

## Status Shape

```ts
type ConnectionStatus = {
  status: 'connected' | 'disconnected' | 'cancelled';
  address?: `0x${string}`;
  network: 'mainnet' | 'testnet';
};
```

## Status()

Read the current wallet connection state.

```ts
const status = await mega.status();
```

Use it after initialisation, on route transitions, or when restoring app state after a refresh.

## Connect()

Prompt the user to connect MOSS and return the resulting connection state.

```ts
const result = await mega.connect();

if (result.status === 'connected') {
  console.log('Connected address:', result.address);
}
```

## Disconnect()

Terminate the current wallet session and return the resulting disconnected state.

```ts
const result = await mega.disconnect();
console.log(result.status);
```

## Open()

Bring the wallet UI forward without starting a specific signing or transaction flow.

```ts
await mega.open();
```

This is useful when your product includes an explicit “Open wallet” affordance for account management or session inspection.

## Recommended UX Pattern

1. Call `initialise()` once.
2. Read `status()` to render initial UI.
3. Trigger `connect()` from a deliberate user action.
4. Subscribe to `onStatusChange` for session-driven UI updates.
5. Use `disconnect()` only when the product clearly intends to terminate the session.

Treat `cancelled` as a normal user choice, not an error state. The cleanest partner integrations distinguish cancellation from transport or contract failures.
