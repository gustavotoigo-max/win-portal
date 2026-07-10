alter table public.orders add column if not exists product_id text;
alter table public.licenses add column if not exists product_id text;

create index if not exists idx_orders_product_id on public.orders(product_id);
create index if not exists idx_licenses_product_id on public.licenses(product_id);
