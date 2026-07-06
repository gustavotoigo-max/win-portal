create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  company text,
  role text not null default 'user' check (role in ('user', 'admin')),
  preferred_locale text not null default 'pt' check (preferred_locale in ('pt', 'en')),
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(user_id) on delete set null,
  order_number text unique not null,
  stripe_session_id text unique,
  stripe_payment_intent_id text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'canceled', 'refunded')),
  amount integer not null default 0,
  currency text not null default 'usd',
  customer_email text,
  created_at timestamptz not null default now()
);

create table if not exists public.licenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(user_id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  license_key text unique not null,
  status text not null default 'active' check (status in ('active', 'revoked', 'blocked', 'expired')),
  max_machines integer not null default 1,
  expires_at timestamptz,
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
  admin_id uuid references public.profiles(user_id) on delete set null,
  action text not null,
  notes text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, full_name, company, preferred_locale)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'company',
    coalesce(new.raw_user_meta_data ->> 'preferred_locale', 'pt')
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where user_id = auth.uid()
      and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.licenses enable row level security;
alter table public.machines enable row level security;
alter table public.license_events enable row level security;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile"
on public.profiles for select
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
on public.profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id and role = 'user');

drop policy if exists "Users read own orders" on public.orders;
create policy "Users read own orders"
on public.orders for select
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users read own licenses" on public.licenses;
create policy "Users read own licenses"
on public.licenses for select
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users read own machines" on public.machines;
create policy "Users read own machines"
on public.machines for select
using (
  exists (
    select 1
    from public.licenses
    where licenses.id = machines.license_id
      and (licenses.user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "Users read own license events" on public.license_events;
create policy "Users read own license events"
on public.license_events for select
using (
  exists (
    select 1
    from public.licenses
    where licenses.id = license_events.license_id
      and (licenses.user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "Admins manage profiles" on public.profiles;
create policy "Admins manage profiles"
on public.profiles for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins manage orders" on public.orders;
create policy "Admins manage orders"
on public.orders for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins manage licenses" on public.licenses;
create policy "Admins manage licenses"
on public.licenses for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins manage machines" on public.machines;
create policy "Admins manage machines"
on public.machines for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins manage events" on public.license_events;
create policy "Admins manage events"
on public.license_events for all
using (public.is_admin())
with check (public.is_admin());

create index if not exists idx_orders_user_id on public.orders(user_id);
create index if not exists idx_licenses_user_id on public.licenses(user_id);
create index if not exists idx_licenses_order_id on public.licenses(order_id);
create index if not exists idx_licenses_key on public.licenses(license_key);
create index if not exists idx_machines_license_id on public.machines(license_id);
