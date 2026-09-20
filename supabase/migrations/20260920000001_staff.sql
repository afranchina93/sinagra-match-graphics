-- ============================================================
--  Sinagra Match Graphics — Staff Members + doc_identity
-- ============================================================

-- Aggiungi doc_identity ai giocatori
ALTER TABLE players ADD COLUMN IF NOT EXISTS doc_identity TEXT;

-- Nuova tabella staff
CREATE TABLE IF NOT EXISTS staff_members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name   TEXT NOT NULL DEFAULT '',
  last_name    TEXT NOT NULL DEFAULT '',
  role         TEXT NOT NULL DEFAULT '',
  date_of_birth TEXT,
  matricola    TEXT,
  doc_identity TEXT,
  tessera_figc TEXT,
  active       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff public read"  ON staff_members FOR SELECT USING (true);
CREATE POLICY "staff public write" ON staff_members FOR ALL    USING (true) WITH CHECK (true);
