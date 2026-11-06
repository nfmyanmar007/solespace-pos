# OptionTrigger Pro V3.3 — Smart Exit Review (read-only)

## Intent
Adds an informational monitoring panel in the existing Alerts tab. It does **not** know whether the owner took an options position and **never** places a buy/sell trade, modifies scanner/Telegram alert rules, sends a new Telegram message, or stores user trading decisions.

## Observations and timing
- Owner-only `GET /api/smart-exit`; all authentication, private/no-store, 429 best-effort per-process rate limiting and 30-second server cache patterns match V3.1/V3.2.
- Only today's **recorded sent** CALL/PUT confirmations; recent 30-minute window. Use original `bar_timestamp`, `sent_at`, stock reference price, and separately verified Alpaca session calendar.
- Start advisory clock at **Telegram accepted time**, not the earlier confirmation candle close. Only IEX bars with open timestamp **at/after Telegram accepted time** are considered for price review, and only completed fresh bars (<=180s since close) qualify.
- **MOMENTUM_WEAKNESS**: the latest two post-Telegram completed IEX minute bars are contiguous, and price moved against the original CALL/PUT direction. Not an option sell signal.
- **VWAP_REVERSAL**: last two contiguous post-Telegram IEX closes cross opposite the signal direction relative to the corresponding session VWAP at each candle close. VWAP is derived from IEX typical-price weighted candle volume and is **only available when every unique regular-session minute bar from the verified open to the last post-delivery candle exists**. No carry-forward or invented VWAP.
- **TIME_REVIEW**: >=5 minutes since Telegram acceptance; combined with market flags when valid bars available. **TIMEBOX_ELAPSED**: >=15 minutes since Telegram acceptance, no price assertions. These are sample time-based review checkpoints, not preauthorized exit instructions.
- **UNAVAILABLE**: no verified session, invalid reference candle, incomplete or stale post-delivery IEX bars; fail closed and expose no actionable market inference.
- 30-minute view window is solely for review visibility; no historical backtest, option fills or position tracking.

## Safety, accuracy and constraints
- IEX is an exchange-limited stock feed, not consolidated SIP and not option bid/ask quotes.
- Reference close is reconciled against original IEX confirmation candle using the existing V3.0.1 check.
- Missing/duplicate minute candles may make VWAP unavailable. A lack of flags does **not** mean the user should hold an option.
- No WebSocket, push notifications, Telegram edits, trading, scheduled jobs, Supabase writes/schema changes or persisted alerts.
- Market-check UI refreshes every minute; API coalesces requests for 30 seconds per server instance, cost-bounded by 50 journal records / 12 tickers.

## Release validation
1. GitHub tests must pass Node and TypeScript, including new edge-case tests.
2. Vercel preview build must be Ready; application-level owner-only API test requires successful passage through Vercel deployment protection and then owner cookie.
3. Production remains V3.2 until PR reviewed and manually merged.
