alter table public.profiles add column if not exists login_method text not null default 'password';
alter table public.profiles add column if not exists login_provider text;
alter table public.profiles add column if not exists last_login_at timestamptz;

alter table public.profiles drop constraint if exists profiles_login_method_check;
alter table public.profiles add constraint profiles_login_method_check
check (login_method in ('password', 'google', 'sso', 'unknown'));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    user_id,
    email,
    full_name,
    company,
    preferred_locale,
    login_method,
    login_provider,
    last_login_at
  )
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'company',
    coalesce(new.raw_user_meta_data ->> 'preferred_locale', 'pt'),
    case
      when new.raw_app_meta_data ->> 'provider' = 'google' then 'google'
      when new.raw_app_meta_data ->> 'provider' in ('sso', 'saml', 'azure', 'okta') then 'sso'
      else 'password'
    end,
    coalesce(new.raw_app_meta_data ->> 'provider', 'email'),
    now()
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;
