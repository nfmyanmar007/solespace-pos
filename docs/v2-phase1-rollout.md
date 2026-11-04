# OptionTrigger Pro V2 — Phase 1 safe rollout

Status: development branch only. Do not merge until the checks below pass.

## Scope
- Calendar: market-day and early-close information comes from Alpaca Paper Trading `/v2/calendar`. A failed request results in `CALENDAR UNAVAILABLE` and no confirmed signal.
- Candles: only valid, completed, positive-price OHLCV bars with integer positive volume are evaluated. Invalid timestamps are ignored.
- Freshness: a 1-minute bar must have finished and be no older than 3 minutes to qualify.
- Setup rules: existing opening-range, two consecutive candles, VWAP, trend, volume >= 1.10x, and 0.8% chase guard remain mandatory.
- Delivery: Telegram API 429 responses can retry a maximum of twice; ambiguous transport errors never retry automatically to avoid duplicate messages. Existing one-per-ticker/direction/day deduplication is preserved.
- Observability: new server-only `alert_delivery_events` table logs claims, accepted sends, failed sends, and journal failures. Existing `scan_runs` stores all scanner evaluations.
- Production scheduler: remain on existing 2-minute Supabase cron; do not activate the unused GitHub Actions scan workflow.

## Automated checks
Run `npm install --ignore-scripts --no-audit --no-fund`, `npx tsc --noEmit`, and
`node --experimental-strip-types --test tests/*.test.mjs`.
The draft PR runs these checks in GitHub Actions.

## Manual pre-merge checks
1. Confirm **main** and `https://optiontrigger-pro.vercel.app` still serve the original live release.
2. Confirm the preview builds successfully; Preview does not have Production Alpaca or Telegram secrets, so it should display DEMO, not send alerts.
3. Verify Alpaca Paper Trading's calendar API responds using Production credentials in a safe staging environment (don't copy tokens into logs).
4. Validate an exchange holiday, a 1 PM early close, a missing calendar response, and missing/corrupted IEX bars.
5. Apply `db/v2-phase1-delivery-events.sql` to **only** the OptionTrigger Pro Supabase project and verify RLS and service-role-only privileges.
6. Stage a delivery test with test-only Telegram credentials and verify the alert journal, rate-limit retries and no duplicate delivery on repeated scans.
7. Verify there is exactly one active Supabase cron scanner and that GitHub Actions scanner secrets were not configured.
8. Review workflow billing and Vercel Preview deployment permissions before merge.

## Deploy and rollback
- Merge only after all gates pass; Vercel deploys `main` to production. The database migration is additive and should be installed first.
- Watch `scan_runs`, `signal_alerts`, `alert_delivery_events`, Telegram failures, and calendar failures.
- If validation fails, revert the merge commit and redeploy previous `main`; keep the existing Supabase cron and database intact.
- Do not enable live order placement, paid market data, or a second scanning service.

## Known limitations
- Alpaca IEX data is not SIP consolidated stock data; calculations may differ from the user's broker.
- The app does not verify live options bid/ask, premium or spread.
- A 2-minute schedule can miss one-minute setups. Alerts are not guaranteed to be immediate.
- Trading holidays changed unexpectedly by exchanges require the calendar API to remain healthy; fail closed is intentional.
- Current repository has no committed npm lockfile; add a reviewed lockfile before a broad dependency upgrade.
