-- ============================================================
--  Sinagra Match Graphics — DB Relazionale v2 (Distinta)
--  1. Extend players + matches
--  2. Nuove tabelle: match_goals, match_substitutions, club_config
--  3. RLS
--  4. Migrazione dati JSONB → tabelle relazionali
-- ============================================================

-- ── 1. Estendi tabelle esistenti ─────────────────────────────

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS date_of_birth TEXT,
  ADD COLUMN IF NOT EXISTS matricola TEXT;

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS kickoff_time TEXT,
  ADD COLUMN IF NOT EXISTS distinta_markers JSONB DEFAULT '{}';

-- ── 2. Nuove tabelle ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS match_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id),
  player_name TEXT NOT NULL,
  minute INTEGER NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('home', 'away')),
  note TEXT CHECK (note IN ('R', 'AG')),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS match_substitutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_out_id UUID REFERENCES players(id),
  player_out_number INTEGER NOT NULL DEFAULT 0,
  player_out_name TEXT NOT NULL DEFAULT '',
  player_in_id UUID REFERENCES players(id),
  player_in_number INTEGER NOT NULL DEFAULT 0,
  player_in_name TEXT NOT NULL DEFAULT '',
  minute TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS club_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  data JSONB NOT NULL DEFAULT '{}'
);

-- ── 3. RLS ───────────────────────────────────────────────────

ALTER TABLE match_goals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_substitutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_config        ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'match_goals' AND policyname = 'public'
  ) THEN
    CREATE POLICY "public" ON match_goals        FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'match_substitutions' AND policyname = 'public'
  ) THEN
    CREATE POLICY "public" ON match_substitutions FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'club_config' AND policyname = 'public'
  ) THEN
    CREATE POLICY "public" ON club_config        FOR ALL USING (true);
  END IF;
END $$;

-- ── 4. Seed club_config ──────────────────────────────────────

INSERT INTO club_config (id, data) VALUES (1, '{
  "clubFullName": "A.D.P SINAGRA CALCIO",
  "matricola": "916079",
  "dirigente": {},
  "direttoreGara": {
    "name": "PULLELLA NUNZIO",
    "docIdentity": "CA55584WB"
  },
  "allenatore": {
    "name": "IOPPOLO ANDREA",
    "matricola": "112403"
  },
  "medicoSociale": {},
  "collaboratore": {
    "name": "BALLATO GIOVANNI ERMINIO",
    "matricola": "5322998"
  },
  "dirigentiForza": [
    { "name": "CALAMUNCI ROBERTO", "docIdentity": "CA15790TF" },
    {}
  ]
}')
ON CONFLICT (id) DO NOTHING;

-- ── 5. Migrazione dati JSONB → tabelle relazionali ───────────

-- home_scorers → match_goals (side = 'home')
INSERT INTO match_goals (match_id, player_name, minute, side, note, sort_order)
SELECT
  m.id,
  scorer->>'playerName',
  (scorer->>'minute')::int,
  'home',
  NULLIF(scorer->>'note', ''),
  (row_number() OVER (PARTITION BY m.id ORDER BY (scorer->>'minute')::int) - 1)
FROM matches m, jsonb_array_elements(m.home_scorers) scorer
WHERE m.home_scorers IS NOT NULL
  AND m.home_scorers != 'null'::jsonb
  AND jsonb_array_length(m.home_scorers) > 0
ON CONFLICT DO NOTHING;

-- away_scorers → match_goals (side = 'away')
INSERT INTO match_goals (match_id, player_name, minute, side, note, sort_order)
SELECT
  m.id,
  scorer->>'playerName',
  (scorer->>'minute')::int,
  'away',
  NULLIF(scorer->>'note', ''),
  (row_number() OVER (PARTITION BY m.id ORDER BY (scorer->>'minute')::int) - 1)
FROM matches m, jsonb_array_elements(m.away_scorers) scorer
WHERE m.away_scorers IS NOT NULL
  AND m.away_scorers != 'null'::jsonb
  AND jsonb_array_length(m.away_scorers) > 0
ON CONFLICT DO NOTHING;

-- substitutions → match_substitutions
INSERT INTO match_substitutions (
  match_id, player_out_number, player_out_name,
  player_in_number, player_in_name, minute, sort_order
)
SELECT
  m.id,
  COALESCE((sub->'playerOut'->>'number')::int, 0),
  COALESCE(sub->'playerOut'->>'name', ''),
  COALESCE((sub->'playerIn'->>'number')::int, 0),
  COALESCE(sub->'playerIn'->>'name', ''),
  COALESCE(sub->>'minute', ''),
  (row_number() OVER (PARTITION BY m.id) - 1)
FROM matches m, jsonb_array_elements(m.substitutions) sub
WHERE m.substitutions IS NOT NULL
  AND m.substitutions != 'null'::jsonb
  AND jsonb_array_length(m.substitutions) > 0
ON CONFLICT DO NOTHING;
