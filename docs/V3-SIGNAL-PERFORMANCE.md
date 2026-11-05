# OptionTrigger Pro V3.0 — Signal Performance Tracker

## Scope
Read-only daily report. No trading-rule, alert, cron, Telegram, Supabase schema, environment-secret, or automatic-order modifications.

### Metric definition
- Included records: **today's successful Telegram sent** A+ CALL/PUT confirmations stored in `public.signal_alerts`; never count unsuccessful or pending alerts.
- Entry reference: `signal_alerts.price`, the underlying stock price reported by scanner at the completed confirmation candle close. **Not** a fill or options premium.
- Time zero: confirmation bar timestamp + 1 minute (end of the completed IEX minute bar).
- +5/+10/+15 minutes: price is the **close of the exact IEX 1-minute candle** whose open is 5/10/15 minutes after the confirmation bar's opening timestamp (i.e., after 5/10/15 full minutes since time zero). All target bars must be complete.
- Stock move % = (observed target close / entry reference - 1) × 100.
- Directional move % = stock move % for CALL, negated for PUT.
- Favorable = directional move > 0; unfavorable = < 0; flat = exactly 0. **These labels mean directional underlying stock movement, NOT profitable options trades**.

### Integrity protections
- Compare bar timestamps exactly: never interpolate, carry forward a last trade, or synthesize missing data.
- Ignore wrong-day, premarket, postmarket, future/incomplete, invalid OHLC/volume and duplicate bars.
- Verified Alpaca exchange calendar required. Early-close horizons outside session show OUTSIDE_SESSION, not losses.
- PENDING until target candle fully closed; MISSING_BAR if exact candle absent; INVALID for feed unavailable.
- Only today's session is measured. Historic days require a later separate feature and historical calendar handling. Average percentages exclude missing/pending/invalid cases and display measured sample size.
- Public dashboard currently exposes sent-alert history. V3.0 uses the same limited public records; no user trades or account information are fetched.
- Fetch up to 50 sent confirmation records and 12 distinct ticker histories, bounded in groups of 3. This is not a storage-backed performance history. It recalculates from read-only records on request (2-minute refresh).
- No new database table or cron job. Production scan route, engine, opt-in ORCL rules, Telegram delivery, and existing dedup remain untouched.
- Preview can have missing private environment variables. Never copy Alpaca/Supabase production keys into a preview to simulate an end-to-end result.

### Verification
Run TypeScript and the existing Node test suite, review GitHub CI, build a Vercel preview without altering production. After merge, check the Alerts tab and `/api/signal-performance` during a regular session. Do not interpret a favorable stock outcome as evidence the options contract made money. A scanner signal timestamp is not proof of actual user trade execution.

## Limitations
IEX is not consolidated data and can be sparse. Reconstructing a trade-entry reference from scanner-observed last-bar price is not identical to an executable quote. Option Greeks, contract strike/expiry, spreads, premium slippage, fees, and Robinhood P&L are unknown. Past outcomes cannot establish predictive accuracy or guaranteed returns.
