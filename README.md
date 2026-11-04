# OptionTrigger Pro — signals-only prototype

This repository **replaces the old solespace-pos application**. A snapshot of the previous main branch is preserved at `backup-before-optiontrigger-2026-11-04`.

## Features
- Responsive dashboard covering QQQ, SPY, TSLA, NVDA, AMD, AAPL, MSFT and GOOGL.
- Premarket provisional price/high/low from available 4:00–9:29 ET IEX bars (no trading confirmation), and opening range (9:30–9:35 ET), two consecutive completed 1m candles, VWAP, prior-5m direction and relative volume checks.
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

## Premarket behavior
- 4:00–9:29 ET: use only completed IEX 1-minute candles to calculate preliminary high and low and VWAP; stale or missing IEX prints are prominently flagged.
- 9:30–9:35 ET: provisional levels are retired; regular session waits for opening-range completion.
- IEX premarket candles may be absent for some symbols, even while other exchanges trade actively. No synthetic prices or guaranteed real-time prices are displayed.

## Automated Telegram alerts (first release)

**Not active by default.** A GitHub Actions scheduled scanner checks approximately every 5 minutes and posts to the Vercel backend. GitHub cron may run late or skip jobs. This is unsuitable for latency-sensitive scalping without a dedicated always-on market stream.

1. Create a **separate** Supabase project; run `db/schema.sql`, then `db/alerts-migration.sql` in its SQL Editor.
2. In Telegram, message **@BotFather**, send `/newbot`, follow the prompts, and securely copy your bot token. Open your own bot and press **Start** (or send `/start`).
3. Find your numeric Telegram chat ID using Telegram's bot/account UI or a method you trust. Avoid exposing the bot token to third-party lookup sites.
4. Add these **Production** environment variables in Vercel:
   - `ALPACA_API_KEY`, `ALPACA_API_SECRET` (existing)
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (new isolated database)
   - `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
   - `SCAN_SECRET`: a generated high-entropy value of at least 32 characters
5. Redeploy Vercel to apply variables.
6. In GitHub `nfmyanmar007/solespace-pos` → **Settings → Secrets and variables → Actions**, add repository secrets:
   - `OPTIONTRIGGER_SCAN_URL`: `https://YOUR-VERCEL-DOMAIN/api/scan`
   - `OPTIONTRIGGER_SCAN_SECRET`: exactly the same value as Vercel `SCAN_SECRET`.
7. In GitHub **Actions → Scan confirmed option triggers**, use **Run workflow** to test the HTTP scanner (a market-closed test should send no signal). A 503 indicates required server settings or schema are missing. A 401 indicates mismatched `SCAN_SECRET`.
8. Inspect `public.signal_alerts` and `public.scan_runs` in Supabase for successes and failures. The scanner never sends test trading signals by default; an actual passing setup is required.

### Alert behavior / limitations

- Starts only when a **completed** 1-minute-bar setup passes *all* requirements: complete 9:30–9:35 ET opening range, two consecutive qualifying closes, VWAP, prior five-minute direction, relative volume >=1.10x, and a fresh bar.
- No alerts for preliminary levels, missing data, extended moves, stale feed, after hours or missing keys.
- Alert text includes stock price, trigger, VWAP, volume ratio, bar timestamp and explanation. **No options contract recommendations or orders.**
- Deduplication: unique `session_date+ticker+direction`; at most one notification of each direction per stock per day even if scan runs multiple times. This intentionally limits repeated opportunities.
- Message delivery failures are logged with status `failed`; **automatic retry isn't implemented** because blindly retrying may duplicate messages.
- GitHub Actions' five-minute schedule can miss a fleeting 1–3-minute signal. Even successful cron delivery is not instantaneous. For dependable sub-minute alerts, add a separate streaming service rather than relying on GitHub Actions and polling.
- Never expose any credentials in the public repository or screenshots. Discord/Telegram/other outbound alerts are independent of Robinhood; check actual quotes at your broker.
