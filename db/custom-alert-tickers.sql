-- Apply ONLY to the OptionTrigger Pro Supabase project, AFTER approval and BEFORE releasing custom alerts.
-- No changes to the original eight-symbol scanner, existing schedules or delivery journals.
create table if not exists public.custom_alert_tickers (
 ticker text primary key check (ticker ~ '^[A-Z]{1,5}(\.[A-Z])?$'
  and ticker not in ('QQQ','SPY','TSLA','NVDA','AMD','AAPL','MSFT','GOOGL')),
 enabled boolean not null default false,
 updated_at timestamptz not null default now()
);
alter table public.custom_alert_tickers enable row level security;
revoke all on public.custom_alert_tickers from anon, authenticated;
grant select,insert,update,delete on public.custom_alert_tickers to service_role;
-- Enforce maximum four concurrent opt-in custom signals even with parallel owner requests.
create or replace function public.guard_custom_alert_capacity()
returns trigger language plpgsql set search_path = '' as $$
begin
 perform pg_catalog.pg_advisory_xact_lock(722764, 4);
 if new.enabled and (
   select count(*) from public.custom_alert_tickers
   where enabled and ticker <> new.ticker
 ) >= 4 then
   raise exception 'Maximum four enabled custom alerts';
 end if;
 new.updated_at = now();
 return new;
end;
$$;
revoke all on function public.guard_custom_alert_capacity() from public, anon, authenticated;
grant execute on function public.guard_custom_alert_capacity() to service_role;
drop trigger if exists custom_alert_capacity_guard on public.custom_alert_tickers;
create trigger custom_alert_capacity_guard
before insert or update on public.custom_alert_tickers
for each row execute function public.guard_custom_alert_capacity();
