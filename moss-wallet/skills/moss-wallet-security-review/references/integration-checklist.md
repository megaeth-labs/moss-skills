<!-- AUTO-GENERATED from wallet/integration-checklist.md by skills/scripts/build-skills.mjs. Do not edit here — edit the source doc and re-run the script. -->

# Plan Your Integration

Integration checklist, UX patterns, and rollout guidance for product teams shipping MOSS in production. Optimized for product, engineering, and security leads working together before implementation kickoff.

## What This Checklist Covers

| Area | What to decide |
| --- | --- |
| UX flows | Connect/auth, signing prompts, background actions, cancellation handling, fallback states. |
| Data + permissions model | Session key scope, spend limits, contract allowlists, expiry windows, revocation defaults. |
| Timeline + rollout | Sandbox tests, pilot cohort, success criteria, rollback plan, release gates. |
| Gas strategy | Default user-paid gas in ETH or enabled stablecoins; optional partner sponsorship via `sponsorUrl` + `sponsorMode` + `sponsorToken`. |
| Security + compliance | Threat model, backend verification, key handling, logging controls, audit artifacts. |

## Gas Abstraction Options

Gas is abstracted through the relay and smart account infrastructure. Users can pay gas with ETH or enabled stablecoins (currently USDm and USDT0). Recommended default: `sponsorMode: 'app-only'` and `sponsorToken: 'native'`. Use `explicit` when you only want to sponsor selected app actions.

| Mode | Who pays | Who controls logic |
| --- | --- | --- |
| User-paid gas (default) | User (ETH or enabled stablecoins) | MegaETH relay |
| Partner sponsorship (`app-only` default) | Developer | Sponsor endpoint + mode controls |
| Partner sponsorship (`explicit` / `everything`) | Developer | Per-request or broad sponsorship policy |

## Integration Checklist

### 1. UX and Product Flows

- [ ] Define first-run journey: connect, sign, first transaction.
- [ ] Define cancellation behavior for all wallet prompts.
- [ ] Define silent/background operation boundaries and user consent language.
- [ ] Define fallback UX for disconnected state and RPC/network errors.

### 2. Permissions and Data Model

- [ ] Choose strict `grantPermissions` defaults (every `calls[]` entry includes both `to` and `signature`, low spend caps, short expiry).
- [ ] Decide session duration and automatic revocation policy.
- [ ] Define required on-chain contracts and method allowlists.
- [ ] Decide what wallet state is persisted client-side vs server-side.

### 3. Gas + Funding Strategy

- [ ] Choose primary path: user-paid token gas or partner sponsorship (`app-only`, `explicit`, `everything`).
- [ ] Define sponsorship budget ceilings and alert thresholds.
- [ ] If using external paymaster, define rate limits and contract policy checks.
- [ ] Confirm user messaging for "who pays gas" across all key flows.

### 4. Security and Compliance

- [ ] Use server-side ownership verification for auth/account linking.
- [ ] Confirm no private keys/session secrets are persisted in frontend storage.
- [ ] Validate logging policy excludes sensitive payloads.
- [ ] Create incident runbook for permission abuse or sponsorship drain attempts.

### 5. Launch Plan

- [ ] Stage in test environment, then run limited pilot rollout.
- [ ] Define launch KPIs (conversion, success rate, median completion time).
- [ ] Add monitoring for auth, transaction outcomes, and sponsorship spend.
- [ ] Prepare rollback criteria and decision owner.

## Related

- [Quickstart](quickstart.md) — install through first transaction.
- [Paymaster Setup](paymaster-setup.md) — implementation guide for built-in and external sponsorship paths.
- [Best Practices](best-practices.md) — security patterns and permission defaults for production.

For scoping conversations: [integrations@megaeth.com](mailto:integrations@megaeth.com?subject=MOSS%20Integration%20Scoping%20Call).
