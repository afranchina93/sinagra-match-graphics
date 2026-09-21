-- Statistiche individuali per partita
CREATE TABLE IF NOT EXISTS match_player_stats (
  match_id      UUID    NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id     UUID    NOT NULL,
  player_name   TEXT    NOT NULL DEFAULT '',
  player_number INTEGER NOT NULL DEFAULT 0,
  tiri_fuori    INTEGER NOT NULL DEFAULT 0,
  tiri_in_porta INTEGER NOT NULL DEFAULT 0,
  cross_fondo   INTEGER NOT NULL DEFAULT 0,
  chiusure      INTEGER NOT NULL DEFAULT 0,
  palle_perse   INTEGER NOT NULL DEFAULT 0,
  palle_recuperate INTEGER NOT NULL DEFAULT 0,
  assist        INTEGER NOT NULL DEFAULT 0,
  gol           INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (match_id, player_id)
);

-- Note scout a livello di partita (formazione avversaria, note, angoli)
ALTER TABLE matches ADD COLUMN IF NOT EXISTS scout_notes JSONB DEFAULT '{}';
