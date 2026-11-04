-- Apply in a dedicated Supabase project. Never expose service role key in the browser.
create table if not exists public.scan_runs(id bigint generated always as identity primary key,created_at timestamptz not null default now(),mode text not null,market_state text not null,signal_count integer not null,report jsonb not null);
create table if not exists public.signal_events(id bigint generated always as identity primary key,created_at timestamptz not null default now(),session_date date not null,ticker text not null,direction text not null check(direction in ('CALL','PUT')),bar_timestamp timestamptz not null,trigger_price numeric,observed_price numeric,vwap numeric,volume_ratio numeric,reason text,feed text,unique(session_date,ticker,direction,bar_timestamp));
alter table public.scan_runs enable row level security;
alter table public.signal_events enable row level security;
-- No public policies: backend service role only.
