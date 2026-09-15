-- ============================================================
--  Sinagra Match Graphics — Result Poster migration
--  Aggiunge i campi risultato alla tabella matches.
--  Eseguire nell'SQL Editor di Supabase.
-- ============================================================

alter table matches add column if not exists home_goals integer default 0;
alter table matches add column if not exists away_goals integer default 0;
alter table matches add column if not exists home_scorers jsonb default '[]';
alter table matches add column if not exists away_scorers jsonb default '[]';
