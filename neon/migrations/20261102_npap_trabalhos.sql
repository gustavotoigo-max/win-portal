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
