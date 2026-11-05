# Optional Custom Stock Telegram Alerts — release checklist

This feature is a **separate, opt-in addition** to the original eight-stock scanner. Original core tickers, the existing two-minute cron, Telegram recipient, two completed 1m candles, opening-range and VWAP rules, 5m trend, volume ≥1.10, freshness and daily deduplication all remain unchanged.

## Before production release

1. Review PR and CI; **do not merge before schema + key setup**.
2. In the **OptionTrigger Pro Supabase project only** (`asaadfdsggxnljkcrpps`), apply [`db/custom-alert-tickers.sql`](./custom-alert-tickers.sql). Do **not** run it in BurmeseWorship. It creates the service-role-only `custom_alert_tickers` table with a database-enforced maximum of four enabled stocks.
3. In the **OptionTrigger Pro Vercel project**, configure server-only `CUSTOM_ALERT_ADMIN_KEY` (32+ cryptographically random characters) for production. Do **not** prefix it `NEXT_PUBLIC_`; do not paste it in chat or GitHub. Set or rotate the value using the Vercel encrypted environment-variable UI. Redeploy if needed.
4. Merge PR and verify production routes. The admin interface is under **Watchlist → Manage → Custom stock Telegram alerts**. Unlock with the owner key in your browser and enable a custom saved stock (e.g. ORCL). Owner session expires within 12 hours; key is not persisted in browser storage. Custom alerts are **OFF** until explicitly enabled.
5. Confirm the app displays **SCANNER** for the enabled custom ticker and **RESEARCH ONLY** for disabled ones. Check scan run/alert journals after the market opens. No alert is sent unless every original A+ criterion passes.

## Guardrails

- **No automatic trades**. Telegram messages contain stock-level confirmation, not real options-chain spreads or fills.
- Four extra monitored symbols maximum (12 active symbols total); watchlist charts may still have twelve extra symbols.
- Same Telegram chat as the original eight; one alert per ticker/direction/New York trading day.
- Failed Alpaca calendar or feed, Supabase configuration, or incomplete candles all prevent custom notifications; they cannot disable the core scanner.
- Changes to browser-local chart symbols do **not** automatically change centrally saved Telegram settings. Disable the stock explicitly to stop its notifications.
- Owner settings require a 32+ character server-only key, short-lived signed HttpOnly cookie and same-origin write requests. RLS blocks anonymous Supabase writes.
- The Vercel preview may show setup unavailable without preview-specific credentials; that is expected, not proof of functional end-to-end alert delivery.

## Free-tier data budget

The additional scan load is bounded to at most four symbols every two-minute scanner execution. It uses the existing free Alpaca IEX stock feed and the same Supabase/Telegram services; there is no options pricing feed or paid provider.
