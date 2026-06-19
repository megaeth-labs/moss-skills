<!-- AUTO-GENERATED from wallet/server-verify.md by skills/scripts/build-skills.mjs. Do not edit here — edit the source doc and re-run the script. -->

---
description: Backend SIWE verification for MOSS wallet signatures.
---

# Verify Wallet Signatures on Your Server

Two core functions. SIWE message generation + signature verification for MOSS wallet auth flows.

**install**

```bash
npm install @megaeth-labs/wallet-server-verify
```

## How It Works

1. **Server** generates challenge via `getMessageToSign()`.
2. **Client** signs the exact message with `mega.signMessage()`.
3. **Server** verifies with `verifySignature()` using the same config.

{% hint style="warning" %}
Always verify server-side before issuing app sessions. Never trust client-only signature checks.
{% endhint %}

## Complete Express.js Example

**server/auth.ts**

```typescript
import express from 'express';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import {
  getMessageToSign,
  verifySignature,
  Errors,
  type MessageConfig,
  type MessageToConfirm,
  type MessageToSign,
} from '@megaeth-labs/wallet-server-verify';

const app = express();
app.use(express.json());

const config: MessageConfig = {
  scheme: 'https',
  domain: 'yourapp.com',
  uri: 'https://yourapp.com',
  chainId: 4326,
  statement: 'Sign in to YourApp',
};

const challenges = new Map<string, MessageToSign>();

// POST /auth/challenge
app.post('/auth/challenge', (req, res) => {
  const challenge = getMessageToSign(config, req.body.address);
  const challengeId = crypto.randomUUID();

  challenges.set(challengeId, challenge);

  res.json({
    challengeId,
    ...challenge,
  });
});

// POST /auth/verify
app.post('/auth/verify', async (req, res) => {
  const { challengeId, signature } = req.body;
  const stored = challenges.get(challengeId);

  if (!stored) {
    return res.status(400).json({ error: 'UNKNOWN_OR_EXPIRED_CHALLENGE' });
  }

  const signedMessage: MessageToConfirm = {
    ...stored,
    signature,
  };

  try {
    await verifySignature(config, signedMessage);
    challenges.delete(challengeId);

    const token = jwt.sign(
      { address: stored.address },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' },
    );

    res.json({ ok: true, token });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === Errors.DIFFERENT_MESSAGE) {
        return res.status(400).json({ error: Errors.DIFFERENT_MESSAGE });
      }
      if (error.message === Errors.INVALID_SIGNATURE) {
        return res.status(401).json({ error: Errors.INVALID_SIGNATURE });
      }
    }

    return res.status(500).json({ error: 'UNKNOWN_ERROR' });
  }
});
```

## Error Handling

| Error | Meaning | Typical action |
| --- | --- | --- |
| `DIFFERENT_MESSAGE` | Submitted message payload does not match what your server generated. | Reject request and ask client to fetch a fresh challenge. |
| `INVALID_SIGNATURE` | The signature does not match the message/address pair. | Reject auth attempt. |

## Chain IDs Reference

Use the same chain ID in `MessageConfig` that your app uses for the target environment.

| Network | chainId |
| --- | --- |
| Mainnet | `4326` |
| Testnet | `6343` |

## Exports and Types

This package exports core methods, typed payloads, and error constants:

| Export | Purpose |
| --- | --- |
| `getMessageToSign(config, address)` | Create a SIWE message payload plus nonce/issuedAt. |
| `verifySignature(config, messageToConfirm)` | Validate message integrity and signature via relay-backed verification. |
| `Errors` | Error constants: `DIFFERENT_MESSAGE`, `INVALID_SIGNATURE`, `ACCOUNT_NOT_FOUND`, `ACCESS_DENIED`. |
| `MessageConfig` / `MessageToSign` / `MessageToConfirm` | Typed contracts for challenge and verification payloads. |

**types.ts**

```typescript
type MegaETHNetwork = 6343 | 4326;

interface MessageConfig {
  scheme: 'http' | 'https';
  domain: string;
  uri: string;
  chainId: MegaETHNetwork;
  statement: string;
}

interface MessageToSign {
  address: Hex;
  message: string;
  nonce: string;
  issuedAt: Date;
}

interface MessageToConfirm extends MessageToSign {
  signature: Hex;
}
```
