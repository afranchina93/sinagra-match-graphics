-- ============================================================
--  Sinagra Match Graphics — DB Relazionale
--  Eseguire nell'SQL Editor di Supabase
-- ============================================================

-- 0. Drop tabella legacy
drop table if exists app_state;

-- ── 1. Tabelle ────────────────────────────────────────────────

create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  logo_url text,
  created_at timestamptz default now()
);

create table players (
  id uuid primary key default gen_random_uuid(),
  number integer not null,
  first_name text not null,
  last_name text not null,
  role text not null check (role in ('goalkeeper','defender','midfielder','forward')),
  active boolean default true,
  created_at timestamptz default now()
);

create table competitions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  season text not null default '2024/25'
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  opponent_id uuid references teams(id),
  is_home boolean not null default true,
  match_date timestamptz,
  competition_id uuid references competitions(id),
  matchday text,
  formation text not null default '4-3-3',
  stadium text default 'Campo Sportivo Sinagra',
  coach text default 'Andrea Ioppolo',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table match_starters (
  match_id uuid references matches(id) on delete cascade,
  slot_id text not null,
  player_id uuid references players(id),
  primary key (match_id, slot_id)
);

create table match_bench (
  match_id uuid references matches(id) on delete cascade,
  player_id uuid references players(id),
  sort_order integer default 0,
  primary key (match_id, player_id)
);

-- ── 2. RLS ────────────────────────────────────────────────────

alter table teams          enable row level security;
alter table players        enable row level security;
alter table competitions   enable row level security;
alter table matches        enable row level security;
alter table match_starters enable row level security;
alter table match_bench    enable row level security;

create policy "public" on teams          for all using (true);
create policy "public" on players        for all using (true);
create policy "public" on competitions   for all using (true);
create policy "public" on matches        for all using (true);
create policy "public" on match_starters for all using (true);
create policy "public" on match_bench    for all using (true);

-- ── 3. Storage bucket loghi ───────────────────────────────────

insert into storage.buckets (id, name, public)
  values ('logos', 'logos', true)
  on conflict (id) do nothing;

create policy "public logos read"
  on storage.objects for select
  using (bucket_id = 'logos');

create policy "public logos write"
  on storage.objects for insert
  with check (bucket_id = 'logos');

create policy "public logos update"
  on storage.objects for update
  using (bucket_id = 'logos');

create policy "public logos delete"
  on storage.objects for delete
  using (bucket_id = 'logos');

-- ── 4. Seed dati iniziali ─────────────────────────────────────

insert into competitions (name, season)
  values ('Campionato di Promozione', '2024/25')
  on conflict (name) do nothing;

insert into players (number, first_name, last_name, role) values
  -- Portieri
  (1,  'Francesco', 'Di Pane',     'goalkeeper'),
  (12, 'Giuseppe',  'Cordima',     'goalkeeper'),
  (17, 'Stefano',   'Fogliani',    'goalkeeper'),
  -- Difensori
  (18, 'Domenico',  'Ratto',       'defender'),
  (23, 'Salvatore', 'Russo B.',    'defender'),
  (17, 'Niko',      'Fogliani',    'defender'),
  (21, 'Gabriele',  'Faranda',     'defender'),
  (6,  'Federico',  'Cottone',     'defender'),
  (24, 'Antonino',  'Rigoli',      'defender'),
  (24, 'Matteo',    'Pintabona',   'defender'),
  (2,  'Stefano',   'Calà',        'defender'),
  (10, 'Giovanni',  'Gaudio',      'defender'),
  -- Centrocampisti
  (8,  'Tony',      'Fogliani',    'midfielder'),
  (4,  'Giovanni',  'Natalotto',   'midfielder'),
  (24, 'Jonathan',  'Fogliani',    'midfielder'),
  (14, 'Augusto',   'Monte',       'midfielder'),
  (16, 'Fabiano',   'Mancuso',     'midfielder'),
  (19, 'Nikolas',   'Colantropo',  'midfielder'),
  (20, 'Nunzio',    'Scaffidi',    'midfielder'),
  (22, 'Luca',      'Radici',      'midfielder'),
  (9,  'Nunzio',    'Tumeo',       'midfielder'),
  -- Attaccanti
  (7,  'Alessandro','Natalotto',   'forward'),
  (13, 'Giuseppe',  'Foti',        'forward'),
  (15, 'Marco',     'Fogliani',    'forward'),
  (11, 'Leandro',   'Paradiso',    'forward'),
  (3,  'Pietro',    'Bellomo',     'forward');
