-- Apply in the *OptionTrigger Pro* Supabase database SQL Editor.
-- This table prevents multiple notifications of the same CALL/PUT ticker per NY session day.
create table if not exists public.signal_alerts (
  id bigint generated always as identity primary key,
  session_date date not null,
  ticker text not null,
  direction text not null check (direction in ('CALL','PUT')),
  bar_timestamp timestamptz not null,
  price numeric not null,
  trigger_price numeric not null,
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  unique (session_date,ticker,direction)
);
create index if not exists signal_alerts_created_at_idx on public.signal_alerts(created_at desc);
alter table public.signal_alerts enable row level security;
-- No anon policies. Use service-role access only in server routes.
