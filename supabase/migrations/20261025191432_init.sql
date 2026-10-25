-- =========================================
-- 拡張
-- =========================================
create extension if not exists vector with schema extensions;

-- =========================================
-- テーブル
-- =========================================
create table rooms (
  id            uuid primary key default gen_random_uuid(),
  topic         text not null,
  analysis_mode text not null check (analysis_mode in ('reaction','all')),
  board_scale   real not null default 1.0,
  created_at    timestamptz not null default now()
);

create table members (
  id       uuid primary key default gen_random_uuid(),
  room_id  uuid not null references rooms(id) on delete cascade,
  nickname text not null
);

create table messages (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid not null references rooms(id) on delete cascade,
  member_id    uuid not null references members(id),
  body         text not null,
  reply_to     uuid references messages(id),
  retracted_at timestamptz,
  created_at   timestamptz not null default now()
);

create table reactions (
  message_id uuid not null references messages(id) on delete cascade,
  member_id  uuid not null references members(id),
  value      text not null check (value in ('pro','con')),
  primary key (message_id, member_id)
);

create table notes (
  id                uuid primary key default gen_random_uuid(),
  room_id           uuid not null references rooms(id) on delete cascade,
  source_message_id uuid not null unique references messages(id),
  kind              text not null check (kind in ('idea','problem','solution','reason')),
  parent_id         uuid references notes(id) on delete cascade,
  label             text not null,
  proposer_id       uuid not null references members(id),
  x                 real,
  y                 real,
  embedding         extensions.vector,
  created_at        timestamptz not null default now()
);

create table analysis_jobs (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references rooms(id) on delete cascade,
  message_id uuid not null references messages(id),
  trigger    text not null check (trigger in ('reaction','reply','message')),
  status     text not null default 'pending'
             check (status in ('pending','running','done','failed')),
  locked_at  timestamptz,
  error      text,
  created_at timestamptz not null default now(),
  unique (message_id, trigger)
);

-- =========================================
-- RLS
-- =========================================
alter table rooms         enable row level security;
alter table members       enable row level security;
alter table messages      enable row level security;
alter table reactions     enable row level security;
alter table notes         enable row level security;
alter table analysis_jobs enable row level security;

-- =========================================
-- GRANT
-- =========================================
-- ブラウザ（anon）
grant select, insert                 on rooms, members, messages to anon;
grant select, insert, update, delete on reactions                to anon;
grant select                         on notes                    to anon;

-- サーバー（service_role）
grant select, update (board_scale)          on rooms         to service_role;
grant select                                on members       to service_role;
grant select, update (retracted_at)         on messages      to service_role;
grant select, delete                        on reactions     to service_role;
grant select, insert, delete                on notes         to service_role;
grant select, insert, update, delete        on analysis_jobs to service_role;

-- =========================================
-- RLSポリシー（anon用）
-- =========================================
create policy "anon read rooms"     on rooms     for select to anon using (true);
create policy "anon create rooms"   on rooms     for insert to anon with check (true);

create policy "anon read members"   on members   for select to anon using (true);
create policy "anon create members" on members   for insert to anon with check (true);

create policy "anon read messages"   on messages for select to anon using (true);
create policy "anon create messages" on messages for insert to anon with check (true);

create policy "anon read reactions"   on reactions for select to anon using (true);
create policy "anon create reactions" on reactions for insert to anon with check (true);
create policy "anon change reactions" on reactions for update to anon using (true) with check (true);
create policy "anon delete reactions" on reactions for delete to anon using (true);

create policy "anon read notes" on notes for select to anon using (true);

-- =========================================
-- Realtime の配信対象
-- =========================================
alter publication supabase_realtime add table rooms, messages, reactions, notes;