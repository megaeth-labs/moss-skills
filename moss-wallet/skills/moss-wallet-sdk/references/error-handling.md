<!-- AUTO-GENERATED from wallet/core-sdk/error-handling.md by skills/scripts/build-skills.mjs. Do not edit here — edit the source doc and re-run the script. -->

# Troubleshooting and Common Issues

Use this page to debug integration issues quickly and to answer common support questions.

## Fast Triage Checklist

1. Confirm SDK is initialised once at app boot.
2. Confirm current status with `mega.status()` or `useStatus()`.
3. Confirm app permissions/session grants are active and not expired.
4. Confirm call scope matches `calls[]` entries exactly (`to` + `signature`).
5. Treat user cancellation as neutral, and handle explicit `error` responses separately with retry guidance.

## Common Issues

| Issue | Likely cause | What to do |
| --- | --- | --- |
| Wallet iframe is not appearing | iframe blocked by CSP, extension policy, or embedding constraints | Check browser console + network tab, verify wallet origin is allowed, and call initialise during app startup. |
| initialise() is not resolving | Wallet bridge was blocked or never reached ready state | Verify iframe load succeeded, avoid duplicate boot logic, and confirm network/config values are valid. |
| User cancels connect or signing | User intentionally dismissed approval flow | Treat as cancelled state, preserve UI state, and provide a retry action from explicit user intent. |
| Status is disconnected after reload | Session was not active or not restored yet | Check status on load, show reconnect UI, and do not assume connected state after refresh. |
| Silent call fails because no valid permission exists | No active session grant for the exact action | Grant permissions first, then retry with silent mode only after grant confirmation. |
| Permission expired | Current time is past permissions.expiry | Request a new session grant with a fresh expiry window. |
| Spend limit reached | Configured spend cap is exhausted for the period | Request a new grant with updated limits only when needed and keep least-privilege scope. |
| Contract call rejected due to wrong to/signature | Granted calls[] does not match the attempted contract/function | Use canonical matching with both to + signature and grant the exact required pair. |
| Balance query returns empty when disconnected | No connected account context for balances query | Connect first, then query balances. In React, useStatus should be connected before showing balances. |
| React hooks are not updating | MegaProvider is missing or mounted incorrectly | Wrap the app in MegaProvider, ensure it mounts once in a stable shell, and confirm initialise completes. |

## User-Facing Copy Guidance

- Use “Creating your account”.
- Use “Restoring account”.
- Avoid “Restoring Keys” in docs screenshots, captions, and support macros unless referencing legacy UI text.

## Permission Management for Support Teams

- Users can revoke app permissions per app in wallet/account settings.
- App-triggered `revokePermissions()` is supported, but it is not the only revocation path.
- Do not describe revocation as global-only or all-or-nothing.

## Account Recovery Wording

- Use “Recovery Code” or “Account Recovery Code”.
- Avoid “seed phrase”, “backup phrase”, or “recovery phrase” for MOSS account recovery UX.
- Clarify that the Recovery Code is MOSS-specific and cannot be imported into MetaMask or other external wallets.
- Support guidance should frame this as account recovery for MOSS passkey-based setup.

Canonical permission matching is contract + function scope with `{ to, signature }`. Keep session grants narrow, short-lived, and explicit.
