# OptionTrigger Pro V2 Phase 2 — Chart Preview and Release Checklist

**Deployment status: draft PR; do not merge before approval.** Production main, Supabase cron, scanner, Telegram notifications, and trades remain untouched.

## Added
- `GET /api/chart?ticker=QQQ&interval=1m|5m`: server-side Alpaca IEX-only stock candles, no browser secrets, strict ticker/timeframe allowlist.
- Charts for all eight supported symbols via watchlist selection. Default chart QQQ when All tickers is selected.
- Responsive SVG candlesticks; hover/click reveals candle OHLCV and session VWAP; 30/60/120-candle window; 1m/5m selector and manual refresh.
- Today's valid completed 1-minute regular-session IEX candles only. No gaps are synthesized.
- Five-minute bars only built from all five valid consecutive 1-minute IEX bars. Incomplete groups omitted.
- Opening range high/low lines require five real opening minutes (9:30–9:35 ET).
- A session cumulative VWAP calculated from valid IEX bars; not consolidated market VWAP.
- Confirmation markers come strictly from existing `signal_events` for the ticker/session, not invented historical chart annotations.
- Outdated or missing data is explicitly labeled. Chart refreshes every 60 seconds (not a true tick-by-tick stream).

## Validation
1. GitHub Actions `npx tsc --noEmit` and `node --experimental-strip-types --test tests/*.test.mjs`: **23 unit tests passed, 0 failed** as of 2026-11-04.
2. Vercel preview build for commit `6699c1bc7b44af1bc434cc18f8c2113a25ae23d8` reported READY.
3. New API and chart code has **no writes, no order placement, no scheduler changes, no paid providers**.
4. The preview does not inherit Production-only Alpaca credentials: the chart API should respond with an explicit unavailable message rather than pretend sample data is live. Build/CI validation alone is **not** a live-data integration test.
5. Visual/manual review of a chart with authorized data is still required prior to production merge, including mobile and desktop layouts, 5m gaps, and candle hover.

## Rollout/rollback
- Merge PR only after manual preview review and deciding how to safely validate actual Alpaca bars in staging; avoid pasting production secrets into chat, PR comments, or client code.
- Confirm `main` still has the same production scanner SHA and one Supabase two-minute cron before merge.
- After merging: inspect Vercel build, verify `/api/chart` for allowed/invalid ticker, inspect 1m/5m session chart and IEX warnings, and confirm scanner/alerts continue unaffected.
- Roll back by reverting the Phase 2 merge if charts break; the new API and component are read-only and do not require database migrations.

## Limitations
- IEX volume and trade prices are not full SIP/market-wide coverage.
- Dashboard fetch uses 60-second refresh; scanner remains separately scheduled every 2 minutes.
- Missing IEX minutes may result in few or no complete 5-minute bars.
- No options quotes, bid/ask, or automated trading.
