# OptionTrigger Pro V3.2 — Signal Quality Intelligence

## Scope
Read-only quality analytics are included in the existing authenticated V3.1 historical-performance response, using the **same** verified IEX candle observations. No new expensive historical price sweep, schema migration, cron, scanner logic, Telegram message, or change in owner auth.

## Fields and source lineage
- **CALL vs PUT**: validated sent direction from signal_alerts.
- **Per-ticker**: validated ticker from signal_alerts.
- **Time of day**: confirmed 1m bar open timestamp rendered in America/New_York. Four regular-session ET buckets: 9:30–10:29, 10:30–11:59, 12:00–13:59, 14:00–15:59.
- **Absolute VWAP distance**: `abs((scanner observed price - recorded scanner VWAP) / scanner VWAP) × 100`. This is distance, NOT bullish/bearish VWAP deviation. Buckets <0.25%, 0.25–<0.75%, 0.75–<1.5%, >=1.5%. Scanner values are not historical recalculations.
- **Volume ratio**: recorded scanner `volume_ratio`; buckets <1.5x, 1.5–<2x, >=2x. Existing scanner min-volume-ratio threshold is not modified.
- **Source reconciliation**: signal_events metadata MUST match exact session date/ticker/direction/confirmation bar instant and `feed=IEX` plus observed price within $0.011 of scanner reference. Ambiguous duplicate metadata is treated as unavailable, not estimated. Only successfully SENT signal_alerts and verified V3.1 measurement inputs participate.
- **Event days**: no trusted CPI, FOMC or ticker-specific earnings event calendar exists in this project. Event-day intelligence is explicitly UNAVAILABLE. No heuristic or dated event labels are inferred.

## Sample sizes / uncertainty
- Every group displays number of assessed signals and, per +5/+10/+15m horizon, favorable/measured observations and eligible-minus-measured (missing, invalid, pending, unverified, outside session).
- A favorable underlying movement is directional IEX stock-price movement, not an option win or a real execution.
- Descriptive 95% Wilson interval for favorable proportion; never shown when sample size is zero, and never represented as a predictive probability.
- Reuses V3.1's partial-period coverage flag (1000 records / 60 ticker-day pairs cap, feed errors, invalid bars, incomplete references). Journal lookup has a separate 1000-record cap and exposes PARTIAL if metadata truncates/fails.
- Missing/mismatched metadata **does not** move a signal into a VWAP or volume bucket, or change the observed historical result.
- Beware overlapping factors, tiny samples, selection bias and unobserved/out-of-period trade signals; no A+ ranking or causal inference.

## Verification and release gate
- Existing V3.1 private/no-store auth and V3.0.1 per-instance request guard remain in place.
- CI: TypeScript and Node tests, plus new regression tests for exact-key metadata matching, missing values, DST/time buckets, volume/VWAP bin edges, confidence bounds and zero-measurement behavior.
- Vercel preview build; production unchanged. Deployment protection might block direct API read without Vercel access plus owner cookie; do not misrepresent a protected-preview 401 as proof of app-level authorization.
- Leave PR **draft and unmerged** until owner reviews the preview.
