// Reference snippet — adapt to your framework; do not run as-is.
//
// MOSS wallet JWT verification (backend only).
// Flow:
//   1. client calls mega.authenticate() (browser, @megaeth-labs/wallet-sdk) -> { status, jwt }
//   2. client POSTs { jwt } to your backend
//   3. backend confirms the JWT at the MOSS partner-auth endpoint, then issues the app session
//
// Golden rule: verify on the backend. A client-only auth check is forgeable —
// the session is only valid once the partner-auth endpoint returns 2xx.

import express from 'express';

const app = express();
app.use(express.json());

// Your app's registered origin (must match what MOSS expects for partner-auth).
const ORIGIN = 'yourapp.com';

async function verifyMossJwt(jwt: string): Promise<boolean> {
  const url =
    `https://wallet-api.megaeth.com/v1/partner-auth/verify` +
    `?origin=${encodeURIComponent(ORIGIN)}` +
    `&jwt=${encodeURIComponent(jwt)}`;

  const response = await fetch(url);
  // 2xx = verified; any non-2xx = rejected.
  return response.ok;
}

// POST /api/auth/moss  body: { jwt: string }
app.post('/api/auth/moss', async (req, res) => {
  const { jwt } = req.body ?? {};
  if (typeof jwt !== 'string' || jwt.length === 0) {
    return res.status(400).json({ error: 'MISSING_JWT' });
  }

  let verified: boolean;
  try {
    verified = await verifyMossJwt(jwt);
  } catch {
    // Network/endpoint failure — do not issue a session.
    return res.status(502).json({ error: 'VERIFICATION_UNAVAILABLE' });
  }

  if (!verified) {
    return res.status(401).json({ error: 'MOSS_JWT_VERIFICATION_FAILED' });
  }

  // Verified: issue your app session here (set a cookie, sign your own JWT, etc.).
  return res.json({ ok: true });
});

export default app;
