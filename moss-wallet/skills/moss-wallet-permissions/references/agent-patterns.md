<!-- AUTO-GENERATED from wallet/ai-agent-guide.md by skills/scripts/build-skills.mjs. Do not edit here — edit the source doc and re-run the script. -->

---
description: Build agent-driven MOSS integrations with explicit permission policies, safe defaults, and production-ready execution patterns.
---

# AI Agent Flows for MOSS Wallet

Assumes familiarity with the [Quickstart](quickstart.md) and core SDK methods.

## MOSS Model

**Identity.** The user authenticates once through MOSS and your app receives a durable account context. Agents can act on behalf of that account only inside explicit policies.

**Wallet.** MOSS runs account orchestration in the hosted wallet runtime so your app never needs to manage private keys. Transactions and signatures are routed through the same audited surface.

**Permissions.** Session policies define exactly what an agent can do: contract scope, spend ceilings, and expiry windows. Silent execution is only allowed when actions match granted limits.

## The Agent Loop

User approves a policy once, then your automation executes repeatedly at software speed within those exact guardrails.

| Capability | How |
| --- | --- |
| Software-speed execution | `mega.callContract({ silent: true })` |
| No key management in app | `mega.initialise()` + hosted wallet runtime |
| Scoped spend controls | `mega.grantPermissions()` with `spend.limit` + `period` |
| Fast revocation path | `mega.revokePermissions()` and server-side denylist switches |

## Compile User Intent to Policy

Turn user intent into concrete constraints, then compile those constraints into the exact permission payload sent to MOSS.

1. **User input:** "Auto-rebalance my vault every 6 hours, max 0.2 ETH daily."
2. **Compiled policy:** contract allowlist + daily cap + explicit expiry + method scope.
3. **SDK call:** `mega.grantPermissions({ permissions })`.

## API Shape: Permissions-First Execution

Full method signatures, types, and return contracts: [Methods Reference](methods.md).

```typescript
await mega.grantPermissions({
  permissions: {
    expiry: Math.floor(Date.now() / 1000) + 3600,
    permissions: {
      calls: [{ to: '0xYourVaultContract', signature: 'rebalance()' }],
      spend: [{ limit: BigInt('200000000000000000'), period: 'day' }],
    },
  },
});

const tx = await mega.callContract({
  address: '0xYourVaultContract',
  abi: vaultAbi,
  functionName: 'rebalance',
  args: [],
  silent: true,
});
```

## Alternatives and Tradeoffs

Compared to hand-rolled custody patterns, MOSS keeps policy and execution in one consistent wallet integration surface.

### Raw EOA

**raw-eoa.ts**

```typescript
// App manages signer directly (high risk)
const signer = new Wallet(process.env.PRIVATE_KEY!);
await signer.sendTransaction({
  to: target,
  value: parseEther('0.1'),
});
```

### Custom Escrow

**escrow.ts**

```typescript
// Build + maintain custom policy rails
await escrow.authorize(agent, {
  maxSpendWei: '200000000000000000',
  contract: target,
  expiresAt: unixTs,
});

await escrow.execute(agent, payload);
```

### Human Wallet SDK (Manual)

**human-sdk.ts**

```typescript
// Every action prompts user approval
const tx = await mega.callContract({
  address: target,
  abi,
  functionName: 'execute',
  args,
  silent: false,
});
```

## Five Agent Patterns

### Cross-App DeFi

Route between lending and LP venues when thresholds are hit, while hard-capping spend and destination contracts.

**cross-app-defi.ts**

```typescript
await mega.callContract({
  address: '0xStrategyRouter',
  abi: routerAbi,
  functionName: 'rebalanceAcrossProtocols',
  args: [vaultId],
  silent: true,
});
```

### Game Automation

Run recurring in-game actions without popup loops, constrained to one game contract and short-lived session windows.

**game-automation.ts**

```typescript
await mega.callContract({
  address: gameContract,
  abi: gameAbi,
  functionName: 'claimDailyReward',
  args: [playerId],
  silent: true,
});
```

### Personal Finance

Execute periodic savings and bill flows from a policy-defined budget envelope.

**personal-finance.ts**

```typescript
// Transfers always prompt — for silent recurring execution, call the savings
// contract with callContract and a matching permission grant (see call-contract).
await mega.callContract({
  address: savingsVault,
  abi: vaultAbi,
  functionName: 'deposit',
  args: [],
  value: '10000000000000000', // 0.01 ETH
  silent: true,
});
```

### Agent-Owned Wallet

Assign an autonomous runtime to a dedicated account with strict contract scope and daily ceilings.

**agent-owned-wallet.ts**

```typescript
const perms = await mega.getPermissions(agentAccount);
if (!perms?.permissions) {
  await mega.grantPermissions({ permissions: bootstrapPolicy });
}
```

### Autonomous Trading

Allow strategy execution under bounded risk controls while retaining instant revoke controls.

**autonomous-trading.ts**

```typescript
const result = await mega.callContract({
  address: '0xExecutionEngine',
  abi: engineAbi,
  functionName: 'executeOrder',
  args: [order],
  silent: true,
});

if (result.status === 'error') await mega.revokePermissions();
```

Before shipping delegated permissions to production, review [Best Practices](best-practices.md) for permission scoping defaults, expiry windows, and revocation paths.
