-- OptionTrigger Pro ONLY. Apply before merging passkey/trusted-device branch.
-- Existing custom_alert_tickers, cron and Telegram scanner remain unchanged.
create table if not exists public.owner_passkeys (
 credential_id text primary key,
 public_key text not null,
 counter bigint not null default 0 check(counter >= 0),
 transports text[] not null default '{}',
 created_at timestamptz not null default now(),
 last_used_at timestamptz
);
create table if not exists public.owner_webauthn_challenges (
 id uuid primary key default gen_random_uuid(),
 challenge text not null,
 kind text not null check(kind in ('register','authenticate')),
 expires_at timestamptz not null,
 consumed_at timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists owner_webauthn_challenges_expiry on public.owner_webauthn_challenges(expires_at);
create table if not exists public.owner_trusted_sessions (
 token_hash text primary key check(token_hash ~ '^[a-f0-9]{64}$'),
 expires_at timestamptz not null,
 created_at timestamptz not null default now(),
 revoked_at timestamptz
);
create index if not exists owner_trusted_sessions_expiry on public.owner_trusted_sessions(expires_at);
alter table public.owner_passkeys enable row level security;
alter table public.owner_webauthn_challenges enable row level security;
alter table public.owner_trusted_sessions enable row level security;
revoke all on public.owner_passkeys,public.owner_webauthn_challenges,public.owner_trusted_sessions from anon,authenticated;
grant select,insert,update,delete on public.owner_passkeys,public.owner_webauthn_challenges,public.owner_trusted_sessions to service_role;
-- No public policies. Service key must remain server-only.