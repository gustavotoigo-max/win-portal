-- Cupons de compra cadastrados no ADM (substituem o cupom fixo do código).
-- Rodar no SQL Editor do Neon, no branch dev primeiro. Pode rodar de novo sem problema.

create table if not exists public.coupons (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique check (code ~ '^[A-Z0-9_-]{3,40}$'),
  percent_off   integer not null check (percent_off between 1 and 100),
  product_id    text,                                  -- vazio = vale para qualquer produto
  valid_from    timestamptz not null default now(),
  valid_until   timestamptz,                           -- vazio = sem prazo
  max_uses      integer check (max_uses is null or max_uses > 0),   -- vazio = sem limite
  uses          integer not null default 0,
  license_days  integer check (license_days is null or license_days > 0),  -- licença com prazo (testes); vazio = sem prazo
  max_machines  integer not null default 1 check (max_machines between 1 and 10),
  active        boolean not null default true,
  note          text,
  created_by    text,
  created_at    timestamptz not null default now()
);

-- quem usou cada cupom (um uso por conta)
create table if not exists public.coupon_redemptions (
  id             uuid primary key default gen_random_uuid(),
  coupon_id      uuid not null references public.coupons(id) on delete cascade,
  user_id        text not null,
  customer_email text not null,
  order_number   text,
  created_at     timestamptz not null default now(),
  unique (coupon_id, user_id)
);
create index if not exists coupon_redemptions_coupon_ix on public.coupon_redemptions (coupon_id, created_at desc);
