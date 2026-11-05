# ORCL premarket reference — deployment notes

## Source research

Alpaca Basic provides free real-time IEX-only stock market data. Its SIP historic REST market data can be queried once the requested window is at least 15 minutes old (see https://docs.alpaca.markets/us/docs/market-data-faq). This implementation requests **17-minute delayed** SIP historical ORCL 1-minute bars using the existing server-side Alpaca keys, with no new account, API key, or subscription. Data availability remains subject to Alpaca entitlements and current plan. Alternative Twelve Data U.S. live extended hours requires a Pro-or-higher plan as of 2026-01-12 (https://support.twelvedata.com/en/articles/5195429-pre-post-market-data), so it was not selected.

## Feature

In the *custom watchlist display only*, if the exchange calendar verifies PRE-MARKET and ORCL's IEX evaluator reports `NO PREMARKET DATA`, request the delayed SIP historical ORCL bars. Prefer the latest completed valid same-day bar at least 17 minutes old and not more than 90 minutes old. Display the result with an **ALPACA SIP (DELAYED)** source label, Eastern timestamp, age and **DISPLAY ONLY** label. If there is no sufficiently recent eligible SIP bar, leave the price blank. Never substitute a live-looking price or show delayed SIP as real-time.

Important: The delayed SIP price is in `premarketReference`, *not* `Signal.price`, and is never used for callAbove, putBelow, VWAP, confirmations, alerts, scanner executions, Telegram delivery, post-market displays, or charts. The existing eight-stock scan and ORCL opt-in use IEX. All old scanner rules and cron remain unchanged. No Vercel environment-variable changes or database migration required.

## Release

1. Review and merge the development PR only after CI, tests and Vercel preview checks.
2. Preview does not have production Alpaca credentials, so validate rendering and fail-closed behavior through unit tests and preview homepage. Do not copy production secrets to preview.
3. Once deployed, add ORCL to the local browser custom chart watchlist under Watchlist → Manage. Before 9:30 ET, check `/api/watchlist/signals?symbols=ORCL` (public read-only). If SIP data is accessible but IEX premarket is absent, expect `premarketReference` with timestamp and delay; canonical `price` must remain null.
4. If the API returns no `premarketReference`, the historical SIP feed may have no ORCL bars or your account may not have the relevant entitlement; don't guess a price. The display should keep showing no premarket data.
5. Compare `/api/triggers` and existing `cron.job_run_details` with the previous deployed behavior. Trading signals must never contain delayed SIP reference values.

## Security

All market-data calls happen on the server; Alpaca keys are never placed in query responses. ORCL symbol and SIP feed are hard-coded, and the fallback is guarded by validated symbols and Alpaca calendar. The read-only endpoint accepts only a bounded list of valid custom symbols. Non-2xx, timeout and invalid price/timestamp return no reference.
