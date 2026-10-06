-- Compra simulada na loja: guarda preco de tabela, desconto e cupom do pedido.
-- Alteracao apenas aditiva; nao mexe em licencas, ativacoes nem no contrato
-- com os aplicativos. Pode ser executada mais de uma vez.

alter table public.orders add column if not exists subtotal integer;
alter table public.orders add column if not exists discount integer;
alter table public.orders add column if not exists coupon_code text;
alter table public.orders add column if not exists payment_method text;
