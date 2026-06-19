<!-- AUTO-GENERATED from wallet/cli.md by skills/scripts/build-skills.mjs. Do not edit here — edit the source doc and re-run the script. -->

---
description: Command-line access to a MOSS account — scoped delegated keys, transfers, contract calls, and automation from the terminal.
---

# MOSS CLI

The MOSS CLI (`mega`) brings MOSS account access to the terminal: connect a passkey account, create scoped delegated keys, inspect live permissions, and submit reads or writes from a shell or automation workflow. Every write runs through a delegated key bounded by spend limits, allowed calls, and expiry — the same Smart Approvals session-key model the SDK uses.

Source: [`megaeth-labs/wallet-cli`](https://github.com/megaeth-labs/wallet-cli).

{% hint style="warning" %}
Early software. Use narrow, scoped keys, review wallet prompts, and never grant more spend or call authority than a workflow needs.
{% endhint %}

## Install

```bash
curl -fsSL https://account.megaeth.com/install | sh
```

The installer verifies the release checksum, installs the `mega` command, and installs the bundled agent skill. Pin a specific release with `sh -- --version v0.1.0`. To build from source (requires Node.js 22+ and pnpm):

```bash
git clone https://github.com/megaeth-labs/wallet-cli
cd wallet-cli
pnpm install
pnpm build
./scripts/install.sh
```

Update later with `mega moss update` (use `--check` to check without installing).

## Account and Key Model

The CLI is **not** a root wallet or passkey manager — your passkey stays in MegaETH Wallet. `mega moss login` opens `account.megaeth.com` and stores a local account profile; it does **not** create a write-capable key. The CLI only stores delegated session-key material after you approve it in the browser.

Delegated keys are bounded by:

- expiry
- token/native spend limits
- allowed contract calls
- account and relay enforcement

This is the same permission shape as [`mega.grantPermissions()`](methods/grant-permissions.md): `--allow-call` maps to the canonical `{ to, signature }` call matcher and `--spend-limit` to scoped spend caps. See [Smart Approvals (Policy Engine)](core-sdk/permissions.md) for the model.

## Commands

| Command | Purpose |
| --- | --- |
| `login` / `logout` | Connect this machine to your MOSS account / delete the local profile and key material. |
| `whoami` | Show the connected account and active delegated key. |
| `list` | List delegated keys (`--show-inactive` includes revoked keys). |
| `permissions <addr>` | Show approved scope and live on-chain spend remaining. |
| `switch <addr>` | Select the active delegated key. |
| `label <addr> "<name>"` | Label a key. |
| `create-key` | Create a scoped delegated key with spend limits and call permissions. |
| `revoke <addr>` | Revoke a delegated key on-chain (after browser confirmation). |
| `call` | Read-only contract call (raw or ABI mode). |
| `execute` | Submit a write / transaction (single or batched). |
| `transfer` | Transfer native ETH or an ERC-20 token. |
| `fund` | Open the account funding flow. |
| `debug` | Inspect local profile health without printing key material. |
| `update` | Update the CLI and bundled agent skill. |

Run `mega moss --help` or `mega moss <command> --help` for full flags.

## Quick Start

```bash
# Connect this machine to your MOSS account
mega moss login

# Confirm the connected account and active key
mega moss whoami

# Create a scoped key: 25 USDm/week, only the transfer() call
mega moss create-key \
  --spend-limit 0xfafddbb3fc7688494971a79cc65dca3ef82079e7:25:week \
  --allow-call '0xfafddbb3fc7688494971a79cc65dca3ef82079e7:transfer(address,uint256)' \
  --label usdm-transfer

# Send through the active delegated key
mega moss transfer \
  --token 0xfafddbb3fc7688494971a79cc65dca3ef82079e7 \
  --to 0xRecipient \
  --amount 1
```

Each `--spend-limit` is `<token>:<amount>:<period>` — use `0x0000000000000000000000000000000000000000` for native ETH; period is `minute`, `hour`, `day`, `week`, `month`, or `year`. Each `--allow-call` is `<contract>:<signature>`; write keys must declare explicit call scope. For native ETH transfer targets, scope the no-calldata selector `0xe0e0e0e0`.

## Reads and Writes

```bash
# Read-only call (no write key needed)
mega moss call --to 0xContract --abi ./erc20.json --function balanceOf --args '["0xUser"]'

# Single write
mega moss execute --to 0xContract --data 0x --value 0

# Batched writes from a file, through a specific key
mega moss execute --key 0xKEY_OR_ACCESS_ADDRESS --calls ./calls.json
```

Spend permission is not call permission — select or create a key whose spend limits and call scopes both cover the operation.

## Scripting and Agents

Human-readable output is the default. For scripts, CI, and agents, use machine output:

```bash
mega moss whoami --json
mega moss list --json
mega moss permissions 0xKEY_OR_ACCESS_ADDRESS --terse
```

`--json` returns structured data (`authorizedKey.permissions.spend` is the stored request; `spendInfos[].remaining` is the live remaining capacity); `--terse` is compact tab-delimited. The installer also ships a bundled agent skill, so coding agents can drive the CLI directly.

## Related

- [Smart Approvals (Policy Engine)](core-sdk/permissions.md) — the delegated-key permission model.
- [`mega.grantPermissions()`](methods/grant-permissions.md) — the SDK equivalent of `create-key`.
- [Agent Skills Pack](agent-skills.md) — machine-readable MOSS skills for coding agents.
