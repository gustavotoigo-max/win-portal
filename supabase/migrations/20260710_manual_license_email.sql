-- Support manual official license creation by customer e-mail.

alter table public.licenses add column if not exists customer_email text;

update public.licenses
set customer_email = coalesce(
  customer_email,
  (
    select profiles.email
    from public.profiles
    where profiles.user_id = licenses.user_id
  ),
  (
    select orders.customer_email
    from public.orders
    where orders.id = licenses.order_id
  )
)
where customer_email is null;

create index if not exists idx_licenses_customer_email on public.licenses(customer_email);
