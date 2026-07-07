-- Run this migration if your Supabase project was created before the
-- signed activation API was added. It updates the existing schema without
-- recreating tables.

alter table public.licenses alter column license_key drop not null;
alter table public.licenses add column if not exists license_key_hash text;
alter table public.licenses add column if not exists license_key_hint text;
alter table public.licenses add column if not exists license_key_ciphertext text;
alter table public.licenses add column if not exists app_id text not null default 'com.winportal.windowssoftware';
alter table public.licenses add column if not exists revoked_at timestamptz;
alter table public.licenses add column if not exists offline_allowed boolean not null default true;
alter table public.licenses add column if not exists offline_max_days integer not null default 30;
alter table public.licenses add column if not exists features jsonb not null default '["core"]'::jsonb;

create table if not exists public.activations (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references public.licenses(id) on delete cascade,
  machine_id text not null,
  machine_name text,
  software_version text,
  system_info jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active', 'revoked', 'blocked')),
  activated_at timestamptz not null default now(),
  last_seen_at timestamptz,
  last_validated_at timestamptz,
  unique (license_id, machine_id)
);

create table if not exists public.validation_logs (
  id uuid primary key default gen_random_uuid(),
  license_id uuid references public.licenses(id) on delete set null,
  activation_id uuid references public.activations(id) on delete set null,
  email text,
  machine_id text,
  software_version text,
  ip_address text,
  user_agent text,
  result text not null,
  code text,
  created_at timestamptz not null default now()
);

create table if not exists public.revocations (
  id uuid primary key default gen_random_uuid(),
  license_id uuid references public.licenses(id) on delete cascade,
  activation_id uuid references public.activations(id) on delete set null,
  reason text,
  operator_id uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.activations enable row level security;
alter table public.validation_logs enable row level security;
alter table public.revocations enable row level security;

drop policy if exists "Users read own activations" on public.activations;
create policy "Users read own activations"
on public.activations for select
using (
  exists (
    select 1
    from public.licenses
    where licenses.id = activations.license_id
      and (licenses.user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "Users read own validation logs" on public.validation_logs;
create policy "Users read own validation logs"
on public.validation_logs for select
using (
  exists (
    select 1
    from public.licenses
    where licenses.id = validation_logs.license_id
      and (licenses.user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "Users read own revocations" on public.revocations;
create policy "Users read own revocations"
on public.revocations for select
using (
  exists (
    select 1
    from public.licenses
    where licenses.id = revocations.license_id
      and (licenses.user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "Admins manage activations" on public.activations;
create policy "Admins manage activations"
on public.activations for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins manage validation logs" on public.validation_logs;
create policy "Admins manage validation logs"
on public.validation_logs for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins manage revocations" on public.revocations;
create policy "Admins manage revocations"
on public.revocations for all
using (public.is_admin())
with check (public.is_admin());

create unique index if not exists idx_licenses_key_hash on public.licenses(license_key_hash);
create index if not exists idx_activations_license_id on public.activations(license_id);
create index if not exists idx_activations_machine_id on public.activations(machine_id);
create index if not exists idx_validation_logs_activation_id on public.validation_logs(activation_id);
create index if not exists idx_validation_logs_license_id on public.validation_logs(license_id);
create index if not exists idx_revocations_license_id on public.revocations(license_id);
