# OptionTrigger Pro V3.1 — Historical Signal Analytics

## Scope and invariants
- Owner-only historical summaries for rolling **7, 30 and 90 calendar days**, inclusive of today's America/New_York session date.
- Uses the existing `signal_alerts` journal. Only successfully sent Telegram CALL/PUT confirmations are eligible. Records without sent time, valid ticker, numeric reference, and completed confirmation candle cannot be scored.
- Historical results are recalculated on demand from **Alpaca IEX 1Min** bars; no new database table, cron, SQL migration, market-data licensing assumption, or persistence/retention guarantee is introduced.
- Alpaca's historical trading calendar must verify each session, including early closes and holidays. No inferred weekday sessions. No missing-bar interpolation or price substitution.
- Uses the exact V3.0.1 `measureSignal` 5/10/15-minute horizon computation and `verifyReferenceCandle` check. Each point is the close of the exact completed 1-minute bar 5/10/15 minutes after the confirmation bar **opened** (i.e. 5/10/15 elapsed minutes after it **closed**). Current-day unfinished bars remain PENDING. Reconciled reference close is scanner-observed IEX, rounded to a cent.
- CALL favorable if underlying rises; PUT favorable if underlying falls. Never label this an options win rate or an obtainable fill. A Telegram notification may arrive after the measurement clock started.

## Privacy and cost
- Both the new route and existing V3.0.1 endpoints require the same owner-authenticated cookie; returns 401 before accessing privileged DB or Alpaca.
- The shared V3.0.1 per-instance request budget is retained; not a distributed rate limit. No client access to secret keys.
- Each lookback period is cached for 30 seconds in-process after authorization. Results are `private, no-store` to prevent public proxy/browser caches.
- DB query is capped at 1001 records and uses at most 1000; only the newest 60 **date/ticker pairs** are fetched to bound per-request Alpaca usage. For any exceedance the response sets `dataStatus: PARTIAL` with explicit coverage. **Never present capped coverage as a complete historical 90-day sample.**
- Each pair fetch is paginated (max three pages, fail-closed), calendar from Alpaca verified, and per-pair errors appear in feedFailures; never scored as a loss.
- No silent synthetic defaults, carry-forwards, or fabricated P&L. Blank intervals are excluded from measured averages; live data may be unavailable on previews.

## UI
- Alerts tab displays 7/30/90 day selector, +5/+10/+15 directional average and sample size, daily scorecards, per-stock stats, and CORE/CUSTOM split.
- Core membership comes from the existing `CORE_TICKERS` list, while ORCL/AMZN or any other valid symbol remains CUSTOM.
- The per-ticker mean is weighted per recorded confirmation, not by trading day. Small samples can be misleading; no claim of predictive accuracy.

## Deployment checklist
1. CI must pass TypeScript and Node tests on the dedicated V3.1 branch.
2. Vercel preview must build. Owner-less API requests should return 401; if Vercel deployment protection blocks the preview request, do not claim an end-to-end authentication test passed.
3. The V3.0.1 scanner, Telegram, owner security, existing signal API, database RLS, and production deployment are not changed.
4. Review PR and leave **unmerged**. Deploy only after independently checking the preview and deciding whether the bounded historical coverage is adequate.
