# V3.0.1: Performance reliability and private history

## Security and access
- Both /api/signal-performance and /api/alert-history require the existing owner session (administrative or trusted-device cookie). Unauthorized requests return 401 without touching the performance market-data fetch.
- Read-only responses are private/no-store. UI explains how to unlock owner access under Watchlist → Manage.
- Best-effort **per-instance** request cap 15/min, shared between the endpoints. Production must additionally configure a **distributed rate limit** (WAF/edge or storage-backed) for attack resistance across serverless instances.
- Performance reads coalesce in-flight work and cache the computed response for 30 seconds on a single server instance. This can make values up to 30 seconds old. Failed reads are not cached.
- This change does not grant database access to anon/authenticated roles and does not modify policies, keys, passkeys, scanners, Telegram, or cron.

## Measurement integrity
- Time zero is the close of the confirmation candle, **not the Telegram send event and not any actual trade fill**.
- The UI now shows both the confirmation candle close and the Telegram accepted time, plus the delay in seconds.
- The scanner's reported cent-rounded reference price must match the original completed same-feed IEX confirmation candle close (within $0.011). Missing, ambiguous or mismatching reference bars invalidate measured/missing horizon outcomes and never count as wins. This reconciles sources but is **not** an independent consolidated market feed or second provider.
- Outcome candles still use exact completed IEX bar timestamps at +5/+10/+15 minutes; no interpolation. Duplicate timestamps are permanently excluded, even for 3+ duplicate records.
- There is still no options fill, options P&L, broker trade data, historical cross-session storage, or a post-Telegram executable-price model. Leave those for later separately scoped work.

## Deployment review
- GitHub CI must pass all tests and TypeScript.
- Vercel preview should build and unauthenticated API calls should return 401, while an owner session succeeds using data from current market day.
- Do not merge this branch until verified; production remains unchanged.
