-- Soltunergy: приём заявок с сайта
-- Запустить один раз: Supabase → SQL Editor → New query → вставить файл → Run.

-- 1. Таблица заявок ---------------------------------------------------------
create table if not exists public.leads (
  id              uuid primary key default gen_random_uuid(),
  ref             text not null unique,                 -- номер заявки SOL-YYMMDD-XXXX, его видит клиент
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  source          text not null check (source in ('contact','quiz')),
  status          text not null default 'new'
                  check (status in ('new','reviewing','survey','quoted','closed')),
  name            text not null check (char_length(name) between 1 and 120),
  contact         text not null check (char_length(contact) between 3 and 160),  -- телефон или email
  lang            text,                                 -- язык общения, выбранный клиентом
  site_lang       text,                                 -- язык сайта при отправке: ru/en/th/zh
  area            text,                                 -- район / провинция / адрес
  message         text,
  answers         jsonb,                                -- ответы опроса Find Your Perfect Solar
  rules_version   text,                                 -- версия правил подбора (пока 'none': правила не утверждены)
  files           text[] not null default '{}',         -- пути в закрытом хранилище lead-files
  consent         boolean not null check (consent),     -- согласие PDPA обязательно
  consent_at      timestamptz not null default now(),
  ip_hash         text,                                 -- хеш IP для защиты от спама (сам IP не хранится)
  user_agent      text,
  engineer_notes  text                                  -- заметки инженера, заполняются вручную
);

create index if not exists leads_created_idx on public.leads (created_at desc);
create index if not exists leads_status_idx  on public.leads (status);
create index if not exists leads_ip_idx      on public.leads (ip_hash, created_at);

create or replace function public.leads_touch() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists leads_touch on public.leads;
create trigger leads_touch before update on public.leads
  for each row execute function public.leads_touch();

-- Доступ: RLS включён и публичных политик нет.
-- Сайт не пишет в таблицу напрямую — только через Edge Function submit-lead (service role).
-- Команда смотрит и меняет статусы в Table Editor.
alter table public.leads enable row level security;

-- 2. Закрытое хранилище для счетов и фото крыши ------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lead-files', 'lead-files', false, 10485760,
        array['image/jpeg','image/png','application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
-- Политик для storage.objects не создаём: файлы доступны только через service role
-- (Edge Function) и вошедшим в панель Supabase сотрудникам.
