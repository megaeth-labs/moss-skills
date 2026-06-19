---
name: moss-wallet-cli
description: Automates MOSS accounts from the terminal or CI with the mega CLI (mega moss ...). Use when scripting wallet operations outside a browser: login, whoami, list, permissions, create-key (with --spend-limit <token>:<amount>:<period> and --allow-call <contract>:<signature>), revoke, call, execute (single or batched), transfer, and fund. Covers the delegated session-key model (the CLI never holds the passkey), machine output via --json/--terse for agents, native-transfer call scoping, and that mega moss update refreshes the CLI plus its bundled agent skill. Install via the account.megaeth.com script.
license: MIT
compatibility: Claude Code, Codex, Cursor, Gemini, Copilot. Targets the mega CLI (moss subcommands).
metadata:
  binary: "mega"
  command-prefix: "mega moss"
  native-token-sentinel: "0x0000000000000000000000000000000000000000"
  network-mainnet-chainid: "4326"
  network-testnet-chainid: "6343"
---

# MOSS Wallet CLI (`mega moss`)

Drive a MOSS account from a shell or CI: connect a passkey account, mint scoped
delegated session keys, inspect live permissions, and submit reads, writes, and
transfers — all without a browser at run time. Every write goes through a
delegated key bounded by spend limits, allowed calls, and expiry (the same Smart
Approvals model the SDK uses).

## Golden rules

1. **The CLI only holds delegated session-key material — never the passkey.** The
   passkey stays in the browser wallet. So `create-key` and `revoke` require a
   confirmation in the browser; the CLI can use a key but cannot mint or destroy
   account authority on its own.
2. **A write key needs BOTH spend permission AND an explicit call scope.** Spend
   permission is not call permission. A usable write key must carry a matching
   `--spend-limit` *and* a matching `--allow-call <contract>:<signature>`. Either
   alone is insufficient.
3. **Use `--json` / `--terse` for any agent or CI parsing.** Human-readable output
   is the default and not stable to parse. `--json` returns structured data;
   `--terse` is compact tab-delimited.
4. **Native token sentinel is `0x0000000000000000000000000000000000000000`.** Use
   it as the `<token>` in `--spend-limit` for native ETH spend caps. For native ETH
   moves prefer `mega moss transfer` (no `--allow-call` needed); a key only needs a
   `--allow-call` scope for *contract* calls it should be allowed to make.
5. **`mega moss update` also updates the bundled agent skill.** The installer ships
   this skill alongside the CLI; updating the CLI refreshes it. Keep usage here
   consistent with the installed CLI version (`mega moss update --check`).

## Install

```bash
curl -fsSL https://account.megaeth.com/install | sh
```

Installs the `mega` binary and the bundled agent skill (verifies release
checksum). Pin a release with `sh -- --version v0.1.0`. Update later with
`mega moss update` (`--check` checks without installing).

## Minimal working flow

```bash
# 1. Connect this machine to your MOSS account (opens account.megaeth.com)
mega moss login

# 2. Confirm the connected account + active key, machine-readable
mega moss whoami --json

# 3. Create a scoped write key: 25 USDm/week + ONLY the transfer() call.
#    Build the flag values with the helper scripts (see Scripts), then:
mega moss create-key \
  --spend-limit 0xfafddbb3fc7688494971a79cc65dca3ef82079e7:25:week \
  --allow-call '0xfafddbb3fc7688494971a79cc65dca3ef82079e7:transfer(address,uint256)' \
  --label usdm-transfer
# -> confirm the new key in the browser wallet

# 4. Inspect approved scope + live on-chain remaining for a key
mega moss permissions 0xKEY_OR_ACCESS_ADDRESS --terse

# 5. Transfer an ERC-20 through the active delegated key
mega moss transfer \
  --token 0xfafddbb3fc7688494971a79cc65dca3ef82079e7 \
  --to 0xRecipient \
  --amount 1
```

### Reads, single writes, batched writes

```bash
# Read-only call — no write key needed (raw or ABI mode)
mega moss call --to 0xContract --abi ./erc20.json --function balanceOf --args '["0xUser"]'

# Single write through a key whose spend + call scopes both cover it
mega moss execute --to 0xContract --data 0x --value 0 --key 0xKEY_OR_ACCESS_ADDRESS

# Batched writes from a file (array of calls), through a specific key
mega moss execute --key 0xKEY_OR_ACCESS_ADDRESS --calls ./calls.json
```

### Native ETH spend limit

```bash
# Spend limit uses the native sentinel as <token>.
# Native moves go through `mega moss transfer` and need no --allow-call;
# add --allow-call only for contract calls this key should be able to make.
mega moss create-key \
  --spend-limit 0x0000000000000000000000000000000000000000:0.5:day \
  --label native-eth
```

## Command map

| Need | Command |
| --- | --- |
| Connect / disconnect this machine | `mega moss login` / `mega moss logout` |
| Show connected account + active key | `mega moss whoami [--json]` |
| List delegated keys | `mega moss list [--show-inactive] [--json]` |
| Approved scope + live remaining | `mega moss permissions <addr> [--terse]` |
| Select active key | `mega moss switch <addr>` |
| Label a key | `mega moss label <addr> "<name>"` |
| Mint a scoped delegated key | `mega moss create-key [--spend-limit …] [--allow-call …] [--label …]` |
| Revoke a key on-chain | `mega moss revoke <addr>` (browser confirm) |
| Read-only contract call | `mega moss call [--to --abi --function --args]` |
| Single / batched write | `mega moss execute [--to --data --value --key --calls]` |
| Transfer native / ERC-20 | `mega moss transfer [--token --to --amount --key]` |
| Open funding flow | `mega moss fund` |
| Local profile health | `mega moss debug` |
| Update CLI + bundled skill | `mega moss update [--check]` |

## Flag formats

- `--spend-limit <token>:<amount>:<period>` — `token` is a contract address or the
  native sentinel; `period` ∈ `{minute,hour,day,week,month,year}`. Repeatable.
- `--allow-call <contract>:<signature>` — both required; signature is the canonical
  `{ to, signature }` call matcher, e.g. `transfer(address,uint256)`. Repeatable.

`--json` exposes `authorizedKey.permissions.spend` (the stored request) and
`spendInfos[].remaining` (live remaining capacity).

## Scripts

Bundled executable helpers (Node ESM, no deps) that emit valid flag values —
**RUN** them, don't paste their source:

```bash
# --spend-limit value (native sentinel auto-filled when token omitted / "native")
node scripts/format-spend-limit.mjs 25 week 0xfafddbb3fc7688494971a79cc65dca3ef82079e7
node scripts/format-spend-limit.mjs 0.5 day            # native ETH

# --allow-call value (validates address + name(typeList) signature)
node scripts/format-allow-call.mjs 0xfafddbb3fc7688494971a79cc65dca3ef82079e7 "transfer(address,uint256)"
```

Both are also importable: `import { formatSpendLimit } from './scripts/format-spend-limit.mjs'`.

## References

- See [references/cli.md](references/cli.md) for the full command list, flags,
  install-from-source, and the `--json` / `--terse` output shapes.
- See [references/smart-approvals.md](references/smart-approvals.md) for the shared
  policy model — how `--allow-call` maps to `{ to, signature }` and `--spend-limit`
  to scoped spend caps.

## Related skills

- **moss-wallet-permissions** — the shared Smart Approvals / session-grant policy
  model behind delegated keys (the SDK side of `create-key`). Start there for
  designing scope.
- **moss-wallet-sdk** — the browser/Node `mega` object equivalents
  (`grantPermissions`, `callContract`, `transfer`).

## Old patterns

<details><summary>Stale assumptions to avoid</summary>

- The CLI does **not** hold or export your passkey, seed phrase, or root key — it
  is delegated session-key material only. Never ask it to "export keys." Use the
  wording "Recovery Code," never "seed phrase."
- A `--spend-limit` alone does **not** make a usable write key — you must also pass
  a matching `--allow-call`. Spend permission ≠ call permission.
- Do not treat `to`-only call grants as the default — the canonical matcher is
  `{ to, signature }` (`--allow-call <contract>:<signature>`).
- Do not parse the default human-readable output in scripts — it is not stable.
  Use `--json` / `--terse`.
- Do not hand-build a funding UI — `mega moss fund` opens the account funding flow.

</details>
