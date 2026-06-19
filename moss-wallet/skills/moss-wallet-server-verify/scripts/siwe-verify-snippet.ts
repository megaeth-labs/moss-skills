// Reference snippet — adapt to your framework; do not run as-is.
//
// MOSS wallet SIWE verification (backend only, @megaeth-labs/wallet-server-verify).
// Flow:
//   1. POST /auth/challenge  -> server builds a challenge, stores it, returns { challengeId, message }
//   2. client signs `message` with mega.signMessage(message)  (browser, @megaeth-labs/wallet-sdk)
//   3. POST /auth/verify     -> server verifies the signature, then issues the app session
//
// Golden rules baked in below:
//   - Verify on the backend (never trust a client-only check).
//   - Challenges are single-use: deleted on success AND failure.
//   - Challenges expire: this example uses an in-memory Map with a TTL — use Redis in prod.
//   - config.chainId matches the environment: 4326 mainnet / 6343 testnet (here: 4326).
//   - The SAME config is passed to getMessageToSign and verifySignature.

import express from 'express';
import crypto from 'node:crypto';
import {
  getMessageToSign,
  verifySignature,
  Errors,
  type MessageConfig,
  type MessageToSign,
  type MessageToConfirm,
} from '@megaeth-labs/wallet-server-verify';

const app = express();
app.use(express.json());

// Identical config for challenge generation and verification.
// chainId 4326 = mainnet, 6343 = testnet.
const config: MessageConfig = {
  scheme: 'https',
  domain: 'yourapp.com',
  uri: 'https://yourapp.com',
  chainId: 4326,
  statement: 'Sign in to YourApp',
};

const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// In-memory store for the example only. Use Redis (with native TTL) in production.
type StoredChallenge = { challenge: MessageToSign; expiresAt: number };
const challenges = new Map<string, StoredChallenge>();

function takeChallenge(challengeId: string): MessageToSign | undefined {
  const stored = challenges.get(challengeId);
  // Single-use: remove on lookup regardless of outcome, so a captured
  // signature cannot be replayed and a failed attempt cannot be retried.
  challenges.delete(challengeId);
  if (!stored) return undefined;
  if (Date.now() > stored.expiresAt) return undefined; // expired
  return stored.challenge;
}

// POST /auth/challenge  body: { address: `0x${string}` }
app.post('/auth/challenge', (req, res) => {
  const { address } = req.body ?? {};
  if (typeof address !== 'string' || !address.startsWith('0x')) {
    return res.status(400).json({ error: 'INVALID_ADDRESS' });
  }

  const challenge = getMessageToSign(config, address as `0x${string}`);
  const challengeId = crypto.randomUUID();
  challenges.set(challengeId, {
    challenge,
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
  });

  // Return the exact `message` the client must pass to mega.signMessage(message).
  return res.json({ challengeId, message: challenge.message });
});

// POST /auth/verify  body: { challengeId: string, signature: `0x${string}` }
app.post('/auth/verify', async (req, res) => {
  const { challengeId, signature } = req.body ?? {};
  if (typeof challengeId !== 'string' || typeof signature !== 'string') {
    return res.status(400).json({ error: 'MISSING_FIELDS' });
  }

  const stored = takeChallenge(challengeId); // single-use: already deleted
  if (!stored) {
    return res.status(401).json({ error: 'UNKNOWN_OR_EXPIRED_CHALLENGE' });
  }

  const messageToConfirm: MessageToConfirm = {
    ...stored,
    signature: signature as `0x${string}`,
  };

  try {
    // Throws on mismatch; resolves void on success.
    await verifySignature(config, messageToConfirm);
  } catch (error) {
    if (error instanceof Error && error.message === Errors.DIFFERENT_MESSAGE) {
      // Submitted payload != generated challenge. Ask client for a fresh challenge.
      return res.status(401).json({ error: Errors.DIFFERENT_MESSAGE });
    }
    if (error instanceof Error && error.message === Errors.INVALID_SIGNATURE) {
      // Signature does not match the message/address pair.
      return res.status(401).json({ error: Errors.INVALID_SIGNATURE });
    }
    return res.status(500).json({ error: 'VERIFICATION_FAILED' });
  }

  // Verified: stored.address is proven. Issue your app session here
  // (set a cookie, sign a JWT, create a DB session, etc.).
  return res.json({ ok: true, address: stored.address });
});

export default app;
