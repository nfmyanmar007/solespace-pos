# OptionTrigger Pro V2.9 — Scanner Reliability Release

Status: **draft development branch only**. Keep the pull request unmerged until review.

## Scope

- Retains existing original eight stocks, CALL/PUT thresholds, Alpaca IEX source, genuine two-candle confirmations, daily deduplication and existing Telegram delivery behavior.
- Records best-effort per-ticker diagnostic results for up to four opt-in custom stocks during regular-market scans: `CONFIRMED`, `NOT_CONFIRMED`, `NO_DATA`, `ERROR`, or `SKIPPED_CALENDAR`. A status is *evidence of evaluation only*, not proof of message delivery.
- Health API shows verified-Alpaca-session-only scan gaps greater than five minutes, last scan, Telegram accepted/failed/pending/stale/error counts over 24h.
- Health tab displays detailed custom stocks **only to an owner-authenticated browser session**, otherwise shows `OWNER_ONLY`. It never exports secrets or credential data.
- Notifies via on-screen Health warnings; **does not send extra Telegram messages** (no synthetic alerts or retry risks).
- Historical core `scan_runs.signal_count=8` remains unchanged; custom coverage uses a separate append-only diagnostic table.

## Required migration BEFORE merge

Apply **only** [`db/v2-9-scanner-diagnostics.sql`](./v2-9-scanner-diagnostics.sql) to Supabase **OptionTrigger Pro** project `asaadfdsggxnljkcrpps` after explicit review. Do not touch the BurmeseWorship database.

`public.custom_scan_diagnostics` is RLS-enabled, denies anonymous and authenticated direct access, and grants server-only service-role SELECT/INSERT. Never place `SUPABASE_SERVICE_ROLE_KEY` in a public environment variable.

If the table is missing, the scanner still processes core and custom signals normally; attempts to write diagnostics fail safely and the authenticated Health display reports SETUP_REQUIRED. Do not claim absence of rows means absence of signals.

## Verification

1. GitHub CI: TypeScript and node reliability/security tests must pass.
2. Vercel preview: check homepage 200, Health API 200 (public responses show `custom.access='OWNER_ONLY'`), never display owner subscription tickers anonymously.
3. **After merge only:** use the owner-unlocked production session and check Health custom ticker rows after 9:35 ET. ORCL is enabled now; a fresh row should appear with a true evaluation outcome, and the scanner's original eight stocks remain unchanged.
4. Audit Supabase: compare `scan_runs`, `custom_scan_diagnostics`, `signal_alerts`, `alert_delivery_events`, and `cron.job_run_details`. The Health endpoint does not query pg_cron itself, so HTTP `scan_runs` records are the primary execution evidence.
5. Review Telegram response IDs where recorded. `sent` means Telegram API acceptance, not user-device receipt. No replay of pending/failed alerts because it could duplicate trades.

## Known limitations

- UI refreshes every 60 seconds, backend scheduler remains every ~2 minutes. Not a real-time service-level guarantee.
- If browser owner session expires, personal ticker diagnostics hide; public aggregate scanner diagnostics remain visible.
- Prior dates have no per-ticker diagnostic rows; the table begins collecting from first V2.9 regular-session scan.
- Diagnostic rows are optional, appended once per scan while market is open, and may be missing on database/network failure; the scanner continues.
- A single day of 2-minute scans creates roughly 195 rows per enabled custom ticker. Consider scoped retention later.
- No changes to market trading windows, IEX feed, conditional confirmation logic, or automatic trades.
