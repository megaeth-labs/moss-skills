---
name: moss-wallet-server-verify
description: Verifies MOSS wallet ownership on the backend with @megaeth-labs/wallet-server-verify (SIWE, viem + porto). Use when implementing wallet-backed login or session issuance: generate a challenge with getMessageToSign(config, address), have the client sign it via mega.signMessage(), and confirm with verifySignature(config, messageToConfirm), which throws DIFFERENT_MESSAGE or INVALID_SIGNATURE on mismatch. Also covers the JWT path — mega.authenticate() returns a JWT verified at the partner-auth endpoint. Encodes nonce/challenge storage, single-use challenges, correct chainId (mainnet 4326, testnet 6343), and the rule to never trust client-only signature checks.
license: MIT
compatibility: Claude Code, Codex, Cursor, Gemini, Copilot. Backend (Node). Targets @megaeth-labs/wallet-server-verify v0.1.x.
metadata:
  package: "@megaeth-labs/wallet-server-verify"
  network-mainnet-chainid: "4326"
  network-testnet-chainid: "6343"
---

# MOSS Wallet Server Verify

Prove a user controls a MOSS wallet address on your **backend** before issuing an app session. Two paths: an explicit SIWE challenge/verify flow (`getMessageToSign` + `verifySignature`), or a JWT flow where `mega.authenticate()` returns a token your backend confirms at the partner-auth endpoint. Both are backend-only — the client merely signs or fetches a token.

## Golden rules

1. **Always verify on the backend.** A client-only signature or JWT check is trivially forged. The session is only valid once your server has run `verifySignature` (SIWE) or the partner-auth check (JWT).
2. **Challenges are single-use.** Store each challenge server-side keyed by an id, and `delete` it on the verify attempt — on both success AND failure — so a captured signature cannot be replayed.
3. **Challenges expire.** Persist them with a short TTL (use Redis or your DB in prod, not a process-local `Map`). Reject lookups that are missing or stale.
4. **Match `config.chainId` to the environment.** Mainnet `4326`, testnet `6343`. A mismatch fails verification.
5. **The client signs the EXACT message.** Pass the `message` returned by `getMessageToSign` straight into `mega.signMessage(message)`. Any mutation throws `Errors.DIFFERENT_MESSAGE`.
6. **`config` must be identical** on `getMessageToSign` and `verifySignature` (`scheme`, `domain`, `uri`, `chainId`, `statement`).

## Install

```bash
npm install @megaeth-labs/wallet-server-verify
```

Backend only — depends on viem + porto. Do not import it into client bundles.

## SIWE flow (challenge + verify)

```
server: getMessageToSign(config, address)  ->  { address, message, nonce, issuedAt }
client: mega.signMessage(message)          ->  { status, signature }
server: verifySignature(config, { ...challenge, signature })  // throws on mismatch
```

The verify step, with the two thrown errors mapped to 401:

```typescript
import { verifySignature, Errors } from '@megaeth-labs/wallet-server-verify';

try {
  await verifySignature(config, { ...stored, signature });
  // success: stored.address is proven — issue your session
} catch (error) {
  if (error instanceof Error && error.message === Errors.DIFFERENT_MESSAGE) {
    // submitted payload != generated challenge -> ask for a fresh challenge
    return res.status(401).json({ error: Errors.DIFFERENT_MESSAGE });
  }
  if (error instanceof Error && error.message === Errors.INVALID_SIGNATURE) {
    // signature does not match message/address -> reject
    return res.status(401).json({ error: Errors.INVALID_SIGNATURE });
  }
  throw error;
}
```

Client side (browser, `@megaeth-labs/wallet-sdk`) — branch on `status`, never assume:

```typescript
const result = await mega.signMessage(message); // the exact server message
if (result.status === 'success' && result.signature) {
  await fetch('/auth/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ challengeId, signature: result.signature }),
  });
}
// result.status === 'cancelled' is neutral — no error toast
```

See [scripts/siwe-verify-snippet.ts](scripts/siwe-verify-snippet.ts) for the full Express challenge + verify server to copy and adapt.

## JWT flow (authenticate)

When you want wallet-backed login without prompting for a message, the client calls `mega.authenticate()` and forwards the returned `jwt`; your backend confirms it.

```typescript
// backend: 2xx = verified, anything else = reject
const url =
  `https://wallet-api.megaeth.com/v1/partner-auth/verify` +
  `?origin=${encodeURIComponent(origin)}&jwt=${encodeURIComponent(jwt)}`;
const res = await fetch(url);
if (!res.ok) throw new Error('MOSS_JWT_VERIFICATION_FAILED');
// verified -> issue your session
```

Client side:

```typescript
const auth = await mega.authenticate();
if (auth.status === 'success' && auth.jwt) {
  await fetch('/api/auth/moss', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jwt: auth.jwt }),
  });
}
```

See [scripts/jwt-verify-snippet.ts](scripts/jwt-verify-snippet.ts) for the backend handler to copy and adapt.

## Which flow?

| Need | Use |
| --- | --- |
| Full control over the signed statement / SIWE semantics | SIWE: `getMessageToSign` + `verifySignature` |
| Simplest wallet login, no custom message prompt | JWT: `mega.authenticate()` + partner-auth verify |

## API map

| Need | API |
| --- | --- |
| Build challenge payload | `getMessageToSign(config, address)` -> `{ address, message, nonce, issuedAt }` |
| Verify a signed challenge | `verifySignature(config, messageToConfirm)` -> `Promise<void>` (throws) |
| Error constants | `Errors.DIFFERENT_MESSAGE`, `Errors.INVALID_SIGNATURE`, `Errors.ACCOUNT_NOT_FOUND`, `Errors.ACCESS_DENIED` |
| Config type | `MessageConfig` = `{ scheme, domain, uri, chainId, statement }` |
| Challenge type | `MessageToSign` = `{ address, message, nonce, issuedAt }` |
| Verify input type | `MessageToConfirm` = `MessageToSign & { signature }` |
| Client sign (browser) | `mega.signMessage(message)` -> `{ status, signature?, error? }` |
| Client JWT (browser) | `mega.authenticate()` -> `{ status, jwt?, error? }` |
| JWT verify endpoint | `GET https://wallet-api.megaeth.com/v1/partner-auth/verify?origin=&jwt=` |

## References

- [references/server-verify.md](references/server-verify.md) — full SIWE example, error table, exports, and type definitions.
- [references/authentication.md](references/authentication.md) — JWT `authenticate()` flow, response contract, and backend verification.

## Scripts

Both are TypeScript REFERENCE snippets — **read and adapt**, not executed here. There is no runnable helper in this skill.

- `scripts/siwe-verify-snippet.ts` — Express challenge + verify server (SIWE path).
- `scripts/jwt-verify-snippet.ts` — backend handler for the JWT path.

## When to switch skills / Related skills

- Wiring `mega.signMessage` / `mega.authenticate` in the browser app, provider setup, or React hooks (`useSignMessage`, `useAuthenticate`): use the core SDK skill **moss-wallet-sdk** / React skill **moss-wallet-react**.
- This skill is strictly the **server side** of auth. It does not connect wallets or run in the browser.

## Old patterns

<details>
<summary>Stale assumptions to avoid</summary>

- Do not "verify" by recovering the address with viem/ethers in your own code and comparing — use `verifySignature`, which is relay-backed and validates message integrity too.
- Do not trust a JWT or signature checked only on the client; the session must be gated on the backend result.
- Do not keep challenges in a long-lived or process-local store in production — they must be single-use and expiring (Redis/DB).
- Do not call `getMessageToSign` / `verifySignature` from browser code — the package is backend-only (viem + porto).
- Do not reuse a challenge after a failed verify; delete on every attempt.
</details>
