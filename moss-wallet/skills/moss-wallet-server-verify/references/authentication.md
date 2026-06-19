<!-- AUTO-GENERATED from wallet/authentication.md by skills/scripts/build-skills.mjs. Do not edit here — edit the source doc and re-run the script. -->

# MOSS Authentication

Use MOSS auth when you want wallet-backed login UX without implementing a direct SIWE prompt flow in your app UI.

## Core SDK Flow

```ts
import { mega } from '@megaeth-labs/wallet-sdk';

await mega.initialise({ network: 'mainnet' });

const auth = await mega.authenticate();

if (auth.status === 'success' && auth.jwt) {
  await fetch('/api/auth/moss', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jwt: auth.jwt }),
  });
}
```

## React SDK Flow

```tsx
function AuthButton() {
  const authenticate = useAuthenticate();

  return (
    <button
      onClick={() =>
        authenticate.mutate(undefined, {
          onSuccess: async (result) => {
            if (result.status === 'success' && result.jwt) {
              await fetch('/api/auth/moss', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ jwt: result.jwt }),
              });
            }
          },
        })
      }
    >
      Authenticate with MOSS
    </button>
  );
}
```

## Response Contract

```ts
type AuthenticateResponse = {
  status: 'success' | 'cancelled' | 'error';
  error?: string;
  jwt?: string;
};
```

- `success` + `jwt`: send to backend verification/session exchange.
- `cancelled`: user dismissed auth flow; show neutral retry UX.
- `error`: operational failure; log and show retry guidance.

## Backend Verification

Verify the returned JWT server-side before issuing an app session.

Example verification request:

```ts
const response = await fetch(
  `https://wallet-api.megaeth.com/v1/partner-auth/verify?origin=${encodeURIComponent('yourapp.com')}&jwt=${encodeURIComponent(jwt)}`,
);

if (!response.ok) {
  throw new Error('MOSS_JWT_VERIFICATION_FAILED');
}

const verified = await response.json();
```

If your auth stack uses Privy, map this into your backend auth exchange layer:
- [Privy user authentication docs](https://docs.privy.io/authentication/user-authentication/privy-auth)

{% hint style="warning" %}
Do not trust client-only auth state. Treat MOSS JWT validation and app session issuance as backend responsibilities.
{% endhint %}

## Coming Soon

Social login flows (Google, Apple, email) are on the roadmap but not yet shipped. This page will update with API contracts when they release.

## Related

- [`mega.authenticate()`](methods/authenticate.md) — full method signature and response contract.
- [Server Verify](server-verify.md) — explicit message-signature verification when you need it instead of JWT auth.
