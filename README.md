# MOSS Wallet — Agent Skills

Public distribution for the **MOSS Wallet SDK** Agent Skills (MegaETH embedded wallet) —
eight on-demand skills that teach coding agents (Claude Code, Cursor, Codex, Gemini) to
build MOSS integrations correctly: exact method names, safe defaults, the permission model,
and the patterns that quietly break things when missed.

This repo is the public marketplace; the skills are authored in MegaETH's docs and mirrored
here. It doubles as a Claude Code plugin marketplace.

## Install

### Claude Code

```bash
/plugin marketplace add https://github.com/megaeth-labs/moss-skills.git
/plugin install moss-wallet@moss-skills
/reload-plugins
```

The agent loads the right skill automatically when a task is relevant. Run `/plugin` →
**Installed** to see all eight.

### Cursor · Codex · Gemini · Copilot

```bash
git clone https://github.com/megaeth-labs/moss-skills
cp -r moss-skills/moss-wallet/skills/* .claude/skills/
```

Or download [`dist/moss-wallet-skills.zip`](dist/moss-wallet-skills.zip) and unzip it:

```bash
unzip moss-wallet-skills.zip -d .claude/skills    # or ~/.claude/skills for all projects
```

### claude.ai

Upload an individual skill archive from [`dist/`](dist/) (e.g. `dist/moss-wallet-sdk.zip`)
under **Settings → Capabilities → Skills**.

## The eight skills

| Skill | Use it when you are… |
| --- | --- |
| `moss-wallet-sdk` | building core integrations (connect, transfer, contract calls, signing, balances) — the entry point that routes to the rest |
| `moss-wallet-permissions` | implementing Smart Approvals: grants, `silent` execution, agent/automation/checkout flows |
| `moss-wallet-react` | wiring `MegaProvider` + hooks in a React 19 app, or using the wagmi connector |
| `moss-wallet-server-verify` | verifying wallet ownership on the backend (SIWE or JWT) |
| `moss-wallet-paymaster` | configuring gas sponsorship and the partner paymaster endpoint |
| `moss-wallet-cli` | automating MOSS from a terminal or CI with the `mega` CLI |
| `moss-wallet-privy-migration` | moving a user's assets from a Privy embedded wallet into MOSS |
| `moss-wallet-security-review` | auditing an existing integration before launch |

## Layout

```
.claude-plugin/marketplace.json   # marketplace manifest (exposes the plugin)
moss-wallet/                      # the plugin
├── .claude-plugin/plugin.json
└── skills/<skill-name>/
    ├── SKILL.md                  # instructions + safe defaults
    ├── references/              # bundled MOSS docs, loaded on demand
    └── scripts/                 # deterministic helpers the skill can run
dist/                            # downloadable archives (full pack + per-skill)
```

## Updating

Generated from MegaETH's docs repo via `skills/scripts/sync-mirror.mjs`; maintainers push
updates from there.
