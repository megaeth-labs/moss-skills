<!-- AUTO-GENERATED from wallet/core-sdk/security.md by skills/scripts/build-skills.mjs. Do not edit here — edit the source doc and re-run the script. -->

# Security and Integration Notes

MOSS is designed around a hosted iframe model, which gives partner apps a clear separation between application UI and wallet UI.

## Security Model

- The wallet host runs in an iframe appended to the parent document.
- Penpal is configured with an explicit allowed origin based on the selected wallet host.
- The wallet iframe receives feature permissions for clipboard write and public key credential APIs.
- The parent app does not directly handle key material — it requests actions from the hosted wallet surface.

## MOSS UI and Silent Execution

MOSS UI is the approval and security boundary for first-time connect, signing, permission grants, and transactions. Apps shouldn't assume those approval surfaces can be bypassed for first-time actions. Lower-prompt UX comes from Smart Approvals session grants and scoped delegated execution — this is the intended path to reduce friction while preserving explicit user trust boundaries.

Use `silent: true` only after valid permissions exist for the exact `{ to, signature }` scope.

## Partner Best Practices

- Initialise once and keep wallet access behind clear user intent.
- Request only the permissions required for the current feature.
- Explain high-trust actions before opening the wallet.
- Log operational failures, but do not store raw signed payloads unless your backend actually needs them.
- If your app supports multiple networks, make the selected network visible before the wallet flow begins.
- Do not store long-lived session keys or delegated signing credentials in persistent frontend storage.
- Keep permission escalation and sponsorship approval logic on the backend.

{% hint style="warning" %}
Treat the current SDK source as the observed contract for this release line, not a substitute for release-note compatibility guarantees. If your integration depends on exact iframe host behavior or extra query params, coordinate that expectation with MegaETH.
{% endhint %}

For session keys, restrictive permission defaults, and shipping checklists, see [Best Practices](../best-practices.md). For independent audits of the on-chain account contract, see [Security Audits](../audits.md).
