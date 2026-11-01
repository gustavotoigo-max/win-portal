-- Preços dos produtos, editados no ADM. Produto do catálogo sem linha aqui = "sem preço" (o site mostra R$ 0,00).
-- Rodar no SQL Editor do Neon, no branch dev primeiro. Pode rodar de novo sem problema.
create table if not exists public.product_prices (
  product_id   text primary key,
  price_cents  integer not null check (price_cents >= 0 and price_cents <= 100000000),
  updated_by   text,
  updated_at   timestamptz not null default now()
);
