# OptionTrigger Pro V3.4 — Manual Options Risk Worksheet

## Scope
Read-only, client-side risk math for **user-entered long CALL or PUT contracts**. Adds a manual worksheet in the Alerts tab below V3.3 Smart Exit and above historical analytics. No back-end or schema changes, persistent portfolio, brokerage tokens, option-chain, order API, Telegram messages, or cron modifications.

## Inputs and interpretation
- Underlying ticker, long CALL/PUT, strike, expiration, quantity, contract multiplier, entry premium/share, planned stop premium/share, target premium/share, and optional manually observed current premium/share.
- Validation requires positive finite premiums and stop < entry < target, reasonable numeric ranges and a calendar-valid expiration.
- Entry cost = entry premium × multiplier × quantity; planned loss = (entry − stop) × units; planned gain = (target − entry) × units; reward/risk = planned gain / planned loss.
- Current value and P/L exist only when the user provides a current option premium (not inferred from underlying equity price). No unrealized P/L without a quote.
- CALL expiry break-even = strike + entry premium; PUT = strike − entry premium. This is not an intraday price forecast and excludes fees.
- Checkpoint states are **AWAITING_QUOTE**, **BELOW_STOP_REVIEW**, **AT_TARGET_REVIEW**, **BETWEEN_LEVELS**. These are **review prompts**, not execution recommendations or personalized financial advice.

## Risk, privacy and limits
- Worksheet is in component memory only. Clear/reset or page reload discards inputs; no localStorage, cookies, SQL, server API, or tracking.
- No account positions, option bid/ask liquidity or current contracts are automatically retrieved. Users must confirm the contract multiplier, adjusted deliverables, premiums and bid/ask.
- Stop execution is not guaranteed; even with a planned stop, the full entry debit can be lost. Options spreads, commissions, slippage and time decay are not modeled.
- V3.3 Smart Exit monitors only verified IEX equity candles after Telegram confirmations; it is **not** linked to manual worksheet inputs and cannot know whether an option is owned.
- Preserve scanner, Telegram, security, calendars, historical analytics, Supabase schema/RLS/cron and production.

## Verification
Run TypeScript check, Node tests including `tests/manual-risk.test.mjs`, and inspect Vercel preview. Leave PR unmerged.
