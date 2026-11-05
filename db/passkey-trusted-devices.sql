-- APPLY ONLY to the OptionTrigger Pro Supabase project AFTER review and BEFORE merging.
-- No public access, no scanner/Telegram changes and no credential secrets stored in plaintext.
create table if not exists public.owner_passkeys(
 credential_id text primary key check(length(credential_id) between 16 and 1024),
 public_key text not null check(length(public_key) between 16 and 8192),
 counter bigint not null default 0 check(counter>=0),
 transports jsonb not null default '[]'::jsonb,
 created_at timestamptz not null default now(),
 last_used_at timestamptz
);
create table if not exists public.owner_auth_challenges(
 id uuid primary key default gen_random_uuid(),
 challenge text not null check(length(challenge) between 20 and 512),
 kind text not null check(kind in ('register','authenticate')),
 expires_at timestamptz not null,
 client_hash text not null check(length(client_hash)=64),
 created_at timestamptz not null default now()
);
create index if not exists owner_auth_challenges_expiry_idx on public.owner_auth_challenges(expires_at);
create index if not exists owner_auth_challenges_client_idx on public.owner_auth_challenges(client_hash,created_at);
create table if not exists public.owner_trusted_devices(
 token_hash text primary key check(length(token_hash)=64),
 expires_at timestamptz not null,
 created_at timestamptz not null default now(),
 last_used_at timestamptz,
 label text not null default 'Trusted browser'
);
create index if not exists owner_trusted_devices_expiry_idx on public.owner_trusted_devices(expires_at);
do $$
declare t text;
begin
 foreach t in array array['owner_passkeys','owner_auth_challenges','owner_trusted_devices'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant select,insert,update,delete on public.%I to service_role',t);
 end loop;
end $$;
-- No anon/authenticated policies. Challenges are atomically consumed via DELETE ... RETURNING.
-- Optional housekeeping: delete expired challenges/devices with an authorized maintenance task.
