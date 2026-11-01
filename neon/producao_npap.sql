-- Tudo o que o branch principal (produção) do Neon precisa para o site novo, numa colagem só.
-- Rodar no SQL Editor do Neon, branch PRINCIPAL, DEPOIS de criar o papel npap_server. Pode rodar de novo sem problema.

-- ===== 20261101_npap_server.sql =====
-- Copia de db/neon/001_npap.sql do repositorio NPAPcore-Server (fonte oficial). Mantenha as duas iguais.
-- NPAPcore — schema "npap" no banco Neon do site (Nexotool).
-- Aditivo: não altera nenhuma tabela do schema public. Pode ser executado de novo sem erro.
--
-- Quem faz o quê:
--   * site (Vercel, papel dono do banco): aprova/recusa logins em npap.device_authorization,
--     lê sessões e histórico no ADM.
--   * servidor NPAPcore (Linux, papel npap_server): cria pedidos de login, emite tokens,
--     controla sessões. Não lê public.* diretamente: usa npap.valid_license() (SECURITY DEFINER).

create extension if not exists pgcrypto;
create schema if not exists npap;

-- ---------------------------------------------------------------------------
-- Produtos atendidos pelo servidor (id = id do produto em lib/products.js do site)
-- ---------------------------------------------------------------------------
create table if not exists npap.product (
  id                 text primary key check (id ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  name               text not null,
  active             boolean not null default true,
  min_client_version text,
  created_at         timestamptz not null default now()
);
insert into npap.product (id, name) values ('fbrecovery', 'FbRecovery') on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Login pelo navegador (fluxo de código de dispositivo)
-- ---------------------------------------------------------------------------
-- pending  -> criado pelo servidor; aguardando a pessoa confirmar no site
-- approved -> confirmado no site (user_id preenchido); o app ainda não buscou os tokens
-- denied   -> recusado no site, ou sem licença
-- consumed -> tokens entregues (não pode ser usado de novo)
create table if not exists npap.device_authorization (
  id                    uuid primary key default gen_random_uuid(),
  device_code_hash      bytea not null unique,          -- SHA-256 do segredo que só o app conhece
  user_code             text not null check (user_code ~ '^[A-Z]{4}-[A-Z]{4}$'),
  product_id            text not null references npap.product(id),
  device_fingerprint_hash bytea not null,
  device_label          text check (device_label is null or length(device_label) <= 80),
  client_version        text check (client_version is null or length(client_version) <= 40),
  status                text not null default 'pending'
                        check (status in ('pending','approved','denied','consumed')),
  user_id               text,                           -- Neon Auth / public.profiles.user_id
  approved_email        text,
  approved_email_verified boolean not null default false,
  deny_reason           text check (deny_reason is null or deny_reason ~ '^[A-Z_]{1,40}$'),
  request_ip            inet,
  created_at            timestamptz not null default now(),
  expires_at            timestamptz not null,
  decided_at            timestamptz,
  last_polled_at        timestamptz,
  check ((status in ('approved','consumed')) = (user_id is not null) or status = 'denied')
);
-- Código digitado pela pessoa é único entre os pendentes.
create unique index if not exists device_authorization_user_code_pending
  on npap.device_authorization (user_code) where status = 'pending';
create index if not exists device_authorization_expires_ix on npap.device_authorization (expires_at);

-- ---------------------------------------------------------------------------
-- Aparelhos de cada conta (identificador do aparelho guardado só como SHA-256)
-- ---------------------------------------------------------------------------
create table if not exists npap.device (
  id               uuid primary key default gen_random_uuid(),
  user_id          text not null,
  fingerprint_hash bytea not null,
  label            text check (label is null or length(label) <= 80),
  first_seen_at    timestamptz not null default now(),
  last_seen_at     timestamptz not null default now(),
  revoked_at       timestamptz,
  unique (user_id, fingerprint_hash)
);

-- Aparelhos ocupando vagas de uma licença (limite = public.licenses.max_machines)
create table if not exists npap.license_device (
  license_id    uuid not null,
  device_id     uuid not null references npap.device(id),
  registered_at timestamptz not null default now(),
  released_at   timestamptz
);
create unique index if not exists license_device_active_uq
  on npap.license_device (license_id, device_id) where released_at is null;

-- ---------------------------------------------------------------------------
-- Refresh tokens: só o hash; rotação a cada uso; reuso fora da tolerância revoga a família
-- ---------------------------------------------------------------------------
create table if not exists npap.refresh_token (
  id                uuid primary key default gen_random_uuid(),
  user_id           text not null,
  device_id         uuid not null references npap.device(id),
  product_id        text not null references npap.product(id),
  license_id        uuid not null,
  email_verified    boolean not null default false,  -- copiado da aprovação no site
  family_id         uuid not null,
  token_hash        bytea not null unique,
  created_at        timestamptz not null default now(),
  expires_at        timestamptz not null,
  family_expires_at timestamptz not null,
  used_at           timestamptz,
  replaced_by       uuid,
  revoked_at        timestamptz
);
create index if not exists refresh_token_family_ix on npap.refresh_token (family_id);

-- ---------------------------------------------------------------------------
-- Sessão de uso — no máximo UMA viva por conta, em qualquer produto
-- ---------------------------------------------------------------------------
create table if not exists npap.session (
  id                uuid primary key default gen_random_uuid(),
  user_id           text not null,
  product_id        text not null references npap.product(id),
  license_id        uuid not null,
  device_id         uuid not null references npap.device(id),
  state             text not null default 'ACTIVE'
                    check (state in ('ACTIVE','DISCONNECTED','CLEANING','CLEANUP_FAILED','CLOSED')),
  generation        bigint not null default 1,          -- fencing token
  opened_at         timestamptz not null default now(),
  last_heartbeat_at timestamptz not null default now(),
  disconnected_at   timestamptz,
  closed_at         timestamptz,
  close_reason      text check (close_reason in ('client','expired','revoked','admin','logout','cleanup_failed')),
  check ((state = 'CLOSED') = (closed_at is not null))
);
create unique index if not exists session_one_alive_per_user
  on npap.session (user_id) where state <> 'CLOSED';
create index if not exists session_alive_ix on npap.session (state, last_heartbeat_at) where state <> 'CLOSED';
create index if not exists session_user_ix on npap.session (user_id, opened_at desc);

-- ---------------------------------------------------------------------------
-- Análises: histórico durável = só os campos da lista fechada (documento §8.1)
-- ---------------------------------------------------------------------------
create table if not exists npap.job (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null references npap.session(id),
  user_id        text not null,
  product_id     text not null references npap.product(id),
  state          text not null default 'RUNNING'
                 check (state in ('RUNNING','PAUSED_CONNECTION','RESUMING','COMPLETED','FAILED','CANCELLED',
                                  'CLEANING','CLEAN','CLEANUP_FAILED')),
  file_basename  text check (file_basename is null or (length(file_basename) <= 255 and file_basename !~ '[/\\:]')),
  started_at     timestamptz not null default now(),
  finished_at    timestamptz,
  result_code    text check (result_code is null or result_code ~ '^[A-Z0-9_]{1,40}$'),
  result_summary text check (result_summary is null or length(result_summary) <= 500),
  cleaned_at     timestamptz
);
create unique index if not exists job_one_open_per_session on npap.job (session_id) where state <> 'CLEAN';
create index if not exists job_user_ix on npap.job (user_id, started_at desc);

-- ---------------------------------------------------------------------------
-- Auditoria sanitizada (sem tokens, senhas, payloads ou caminhos)
-- ---------------------------------------------------------------------------
create table if not exists npap.audit_event (
  id         bigserial primary key,
  at         timestamptz not null default now(),
  kind       text not null check (kind ~ '^[a-z0-9_.]{1,60}$'),
  user_id    text,
  product_id text,
  session_id uuid,
  device_id  uuid,
  ip         inet,
  detail     text check (detail is null or length(detail) <= 300)
);
create index if not exists audit_event_at_ix on npap.audit_event (at desc);
create index if not exists audit_event_user_ix on npap.audit_event (user_id, at desc);

-- ---------------------------------------------------------------------------
-- Licença válida de uma conta para um produto.
-- Casa por user_id; por e-mail só quando o e-mail da conta foi verificado no login.
-- SECURITY DEFINER: o servidor não precisa de acesso às tabelas public.*.
-- ---------------------------------------------------------------------------
create or replace function npap.valid_license(p_user_id text, p_product_id text, p_email_verified boolean)
returns table (license_id uuid, max_machines int, expires_at timestamptz)
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select l.id, l.max_machines, l.expires_at
    from public.licenses l
    left join public.profiles p on p.user_id = p_user_id
   where l.product_id = p_product_id
     and l.status = 'active'
     and l.revoked_at is null
     and (l.expires_at is null or l.expires_at > now())
     and (l.user_id = p_user_id
          or (p_email_verified and p.email is not null
              and lower(l.customer_email) = lower(p.email)))
   order by l.expires_at desc nulls first, l.created_at
   limit 1
$$;
revoke all on function npap.valid_license(text, text, boolean) from public;

-- ---------------------------------------------------------------------------
-- Permissões do servidor. O papel npap_server é criado no console do Neon
-- (Roles → New role); este bloco só concede o necessário, se ele existir.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'npap_server') then
    grant usage on schema npap to npap_server;
    grant select on npap.product to npap_server;
    grant select, insert, update on npap.device_authorization, npap.device, npap.license_device,
                                    npap.refresh_token, npap.session, npap.job to npap_server;
    grant delete on npap.device_authorization to npap_server;
    grant select, insert on npap.audit_event to npap_server;
    grant usage on sequence npap.audit_event_id_seq to npap_server;
    grant execute on function npap.valid_license(text, text, boolean) to npap_server;
  end if;
end $$;

-- ===== 20261102_npap_trabalhos.sql =====
-- NPAPcore — trabalhos (análises) processados no servidor.
-- Aditivo e pode rodar mais de uma vez. Rodar depois do 001_npap.sql.
--
-- O banco guarda só o HISTÓRICO MÍNIMO de cada trabalho (documento §8.1): produto, operação, nome base do
-- arquivo principal, horários, código e resumo do resultado. Arquivos, progresso detalhado e dados técnicos
-- ficam só na pasta temporária do trabalho no servidor e são apagados na limpeza.

-- estados: UPLOADING (recebendo arquivos) → QUEUED → RUNNING ⇄ PAUSED_CONNECTION → READY (resultado
-- disponível para download) | FAILED | CANCELLED → CLEANING → CLEAN | CLEANUP_FAILED
alter table npap.job drop constraint if exists job_state_check;
alter table npap.job add constraint job_state_check check (state in (
  'UPLOADING','QUEUED','RUNNING','PAUSED_CONNECTION','RESUMING','READY','COMPLETED',
  'FAILED','CANCELLED','CLEANING','CLEAN','CLEANUP_FAILED'));
alter table npap.job alter column state set default 'UPLOADING';

alter table npap.job add column if not exists operation text;
alter table npap.job drop constraint if exists job_operation_check;
alter table npap.job add constraint job_operation_check check (operation is null or operation ~ '^[a-z_]{2,30}$');
alter table npap.job add column if not exists input_files int check (input_files is null or input_files between 1 and 20);
alter table npap.job add column if not exists input_bytes bigint check (input_bytes is null or input_bytes >= 0);
alter table npap.job add column if not exists processing_seconds int;
alter table npap.job add column if not exists device_id uuid references npap.device(id);

create index if not exists job_open_ix on npap.job (state) where state not in ('CLEAN');

-- Permissões (o papel npap_server já tem select/insert/update em npap.job pelo 001).

-- ===== 20261103_cupons.sql =====
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

-- ===== 20261104_precos.sql =====
-- Preços dos produtos, editados no ADM. Produto do catálogo sem linha aqui = "sem preço" (o site mostra R$ 0,00).
-- Rodar no SQL Editor do Neon, no branch dev primeiro. Pode rodar de novo sem problema.
create table if not exists public.product_prices (
  product_id   text primary key,
  price_cents  integer not null check (price_cents >= 0 and price_cents <= 100000000),
  updated_by   text,
  updated_at   timestamptz not null default now()
);

select 'pronto' as resultado, (select count(*) from npap.product) as produtos;
