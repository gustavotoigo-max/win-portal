-- WinPortal schema for Neon PostgreSQL.
-- Run this entire file in Neon Console > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id text primary key,
  email text not null,
  full_name text,
  company text,
  role text not null default 'user' check (role in ('user', 'admin')),
  preferred_locale text not null default 'pt' check (preferred_locale in ('pt', 'en')),
  login_method text not null default 'password'
    check (login_method in ('password', 'google', 'sso', 'unknown')),
  login_provider text,
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_profiles_email_lower
  on public.profiles (lower(email));

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id text references public.profiles(user_id) on delete set null,
  order_number text unique not null,
  stripe_session_id text unique,
  stripe_payment_intent_id text,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'canceled', 'refunded')),
  amount integer not null default 0,
  currency text not null default 'usd',
  product_id text,
  customer_email text,
  created_at timestamptz not null default now()
);

create table if not exists public.licenses (
  id uuid primary key default gen_random_uuid(),
  user_id text references public.profiles(user_id) on delete set null,
  customer_email text,
  product_id text,
  order_id uuid references public.orders(id) on delete set null,
  license_key text unique,
  license_key_hash text unique,
  license_key_hint text,
  license_key_ciphertext text,
  app_id text not null default 'com.winportal.windowssoftware',
  status text not null default 'active'
    check (status in ('active', 'revoked', 'blocked', 'expired')),
  max_machines integer not null default 1 check (max_machines > 0),
  expires_at timestamptz,
  revoked_at timestamptz,
  offline_allowed boolean not null default true,
  offline_max_days integer not null default 30 check (offline_max_days >= 0),
  features jsonb not null default '["core"]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.machines (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references public.licenses(id) on delete cascade,
  machine_fingerprint text not null,
  machine_name text,
  registered_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  blocked_at timestamptz,
  unique (license_id, machine_fingerprint)
);

create table if not exists public.license_events (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references public.licenses(id) on delete cascade,
  admin_id text references public.profiles(user_id) on delete set null,
  action text not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.activations (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references public.licenses(id) on delete cascade,
  machine_id text not null,
  machine_name text,
  software_version text,
  system_info jsonb not null default '{}'::jsonb,
  status text not null default 'active'
    check (status in ('active', 'revoked', 'blocked')),
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
  operator_id text references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_orders_user_id on public.orders(user_id);
create index if not exists idx_orders_product_id on public.orders(product_id);
create index if not exists idx_licenses_user_id on public.licenses(user_id);
create index if not exists idx_licenses_customer_email_lower on public.licenses(lower(customer_email));
create index if not exists idx_licenses_product_id on public.licenses(product_id);
create index if not exists idx_licenses_order_id on public.licenses(order_id);
create index if not exists idx_licenses_key on public.licenses(license_key);
create unique index if not exists idx_licenses_key_hash on public.licenses(license_key_hash);
create index if not exists idx_machines_license_id on public.machines(license_id);
create index if not exists idx_activations_license_id on public.activations(license_id);
create index if not exists idx_activations_machine_id on public.activations(machine_id);
create index if not exists idx_validation_logs_activation_id on public.validation_logs(activation_id);
create index if not exists idx_validation_logs_license_id on public.validation_logs(license_id);
create index if not exists idx_revocations_license_id on public.revocations(license_id);
