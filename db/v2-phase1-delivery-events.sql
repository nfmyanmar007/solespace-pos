-- Phase 1 delivery event audit. Apply to the dedicated OptionTrigger Pro database
-- BEFORE merging the corresponding scanner changes.
create table if not exists public.alert_delivery_events (
 id bigint generated always as identity primary key,
 created_at timestamptz not null default now(),
 alert_id bigint references public.signal_alerts(id) on delete set null,
 ticker text not null,
 direction text not null check(direction in ('CALL','PUT')),
 event_type text not null check(event_type in ('claimed','sent','failed','journal_failed')),
 detail text
);
create index if not exists alert_delivery_events_created_idx on public.alert_delivery_events(created_at desc);
alter table public.alert_delivery_events enable row level security;
revoke all on public.alert_delivery_events from anon,authenticated;
grant select,insert,update,delete on public.alert_delivery_events to service_role;
grant usage,select on sequence public.alert_delivery_events_id_seq to service_role;
