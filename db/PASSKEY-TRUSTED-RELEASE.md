# Passkeys + 30-day Trusted Devices — OptionTrigger Pro

Status: **development branch only**. Apply this migration to the dedicated OptionTrigger Pro Supabase project (`asaadfdsggxnljkcrpps`) **only after approval**, before merging the PR. Do not apply to BurmeseWorship.

## Database migration

Run [`db/passkey-trusted-devices.sql`](./passkey-trusted-devices.sql) in the correct Supabase SQL Editor. The migration creates:

- `owner_passkeys`: authenticator **public** keys, counters, and transports (never biometric data or private keys)
- `owner_auth_challenges`: five-minute single-use WebAuthn challenges
- `owner_trusted_devices`: **SHA-256 hashes** of 256-bit random bearer tokens with fixed 30-day expiration

All tables have RLS enabled and anonymous/authenticated privileges revoked. Server-only service-role access is used, with no public policies.

## Vercel production configuration

- Existing `CUSTOM_ALERT_ADMIN_KEY` remains the owner key and fallback.
- Optional `PASSKEY_RP_ORIGIN` must be `https://optiontrigger-pro.vercel.app` (default). The passkey RP identity **must never change** without a deliberate migration. Passkeys only work on the canonical production origin, not Vercel preview URLs.
- Node.js 22+ is required for the pinned SimpleWebAuthn packages.
- Keep all secrets in Vercel encrypted environment settings; never publish or prefix secrets `NEXT_PUBLIC_`.

## First-time enrollment on an iPhone

1. Open `https://optiontrigger-pro.vercel.app` in Safari, **Watchlist → Manage**.
2. Tap **Lock settings** if already logged in.
3. Enter your existing owner access key with **Remember this device for 30 days** **unchecked**; this issues the 12-hour key-authenticated session needed for new passkey enrollment.
4. Tap **Register Face ID / Passkey** and follow Apple's passkey prompt. The device may instead prompt for a device passcode or other biometric as supported by its authenticator.
5. Later, tap **Unlock with Face ID / Passkey**. A verified WebAuthn assertion issues a revocable 30-day session.
6. Alternatively, use the owner key with **Remember this device for 30 days** checked. This also issues a hashed, revocable 30-day session.

**Lock settings** revokes the current 30-day trusted device token and clears authentication cookies. A new device/browser must authenticate separately. 30 days is a fixed maximum, not automatically extended on browsing.

## Security and limitations

- Owner key is **never stored** in localStorage, and a passkey's private key/Face ID biometric data never leaves the device.
- Registration/removal requires a recent owner-key session, even if a device holds a 30-day session.
- Each WebAuthn challenge is stored server-side, bound to a client identifier, expires in five minutes, and is atomically deleted on use.
- Verification requires the exact challenge, HTTPS origin, RP ID, user verification and valid authenticator signature. Signed counter is verified and updated.
- Passkeys authenticate to the same pre-existing single-owner alert settings; this is **not** a multi-user login system.
- At most five passkeys can be registered per owner; passkey browser support and physical-device prompts cannot be simulated in Vercel CI.
- The owner key remains a recovery factor. Treat a compromised owner key as access to all the custom alert switches; rotate it if disclosed.
- Keep the trusted device secret private: anyone stealing its cookie could use it until expiration or revocation. Use HTTPS and trusted devices only.
- No change to the existing eight-stock scanner, custom alert opt-in list, confirmation rules, Telegram destination, cron schedule or auto-trading behavior.
- Integration checks must be run on production **after** migration and merge. Preview tests verify compile, navigation, unauthenticated responses and safe refusal to enroll on preview origin; they cannot complete Face ID on the server.

## Rollback

Revert the app deployment to the prior release to restore 12-hour key sessions. The new tables can remain unused. Never delete passkeys or trusted-device records during rollback unless you intentionally revoke owner access.
