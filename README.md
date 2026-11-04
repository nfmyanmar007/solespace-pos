# OptionTrigger Pro — signals-only prototype

This repository **replaces the old solespace-pos application**. A snapshot of the previous main branch is preserved at `backup-before-optiontrigger-2026-11-04`.

## Features
- Responsive dashboard covering QQQ, SPY, TSLA, NVDA, AMD, AAPL, MSFT and GOOGL.
- Opening range (9:30–9:35 ET), two consecutive completed 1m candles, VWAP, prior-5m direction and relative volume checks.
- Statuses WAIT, READY, CONFIRMED CALL, CONFIRMED PUT, STALE and NO TRADE.
- Alpaca Basic real-time **IEX-only** stock bars. This is not a consolidated quote feed or an options bid/ask feed.
- Public API GET /api/triggers; authorized POST /api/scan for persisting results to Supabase.
- Without data keys the UI shows illustrative DEMO mode only. **Never trade based on DEMO**.

## Run locally
```bash
npm install
cp .env.example .env.local
npm run dev
```
Open http://localhost:3000.

## Enable live IEX equity candles
Set `ALPACA_API_KEY` and `ALPACA_API_SECRET` in `.env.local` and Vercel environment settings; redeploy. Keys must remain **server-side only**. The app does not fetch options contracts or submit orders.

## Database and scheduled scanner
1. Create a *separate* Supabase project, apply `db/schema.sql` in its SQL Editor.
2. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and a random `SCAN_SECRET` of 32+ characters in Vercel settings.
3. For periodic scans, configure a trusted external scheduler to POST `https://YOUR-APP.vercel.app/api/scan` with `Authorization: Bearer YOUR_SCAN_SECRET`. The free Vercel plan alone cannot execute frequent minute-by-minute cron.
4. Do not use the old Supabase project or environment secrets from solespace-pos; its old app has been replaced.
5. Push notifications, market holidays, backtests, options-chain quotes and durable deduplication across successive confirmation bars are **not yet production-ready**.

## Trading limitations
Opening range and VWAP are based on the subset of trades in the IEX feed. Missing 1m candles and market-wide holiday closures can affect signals. Signal status is not a broker-executable price; no profit performance has been validated. Manual verification and paper testing are required before any real-money use.
