-- V2.9 OptionTrigger Pro diagnostic records ONLY. Apply to project asaadfdsggxnljkcrpps before deploying V2.9.
-- Independent of signal_events/signal_alerts; never drives Telegram sends or trade decisions.
create table if not exists public.custom_scan_diagnostics (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  scan_at timestamptz not null,
  ticker text not null check (ticker ~ '^[A-Z]{1,5}(\.[A-Z])?$'),
  outcome text not null check (outcome in ('CONFIRMED','NOT_CONFIRMED','NO_DATA','ERROR','SKIPPED_CALENDAR')),
  signal_status text,
  detail text,
  constraint custom_diag_detail_length check (length(coalesce(detail,'')) <= 160)
);
create index if not exists custom_scan_diag_time_idx on public.custom_scan_diagnostics(created_at desc);
create index if not exists custom_scan_diag_ticker_idx on public.custom_scan_diagnostics(ticker,scan_at desc);
alter table public.custom_scan_diagnostics enable row level security;
revoke all on public.custom_scan_diagnostics from anon,authenticated;
grant select,insert on public.custom_scan_diagnostics to service_role;
-- No public policies: ticker subscription diagnostics are accessible only via owner-authenticated server API.
-- This table is append-only from application code; operational retention can be added later.
