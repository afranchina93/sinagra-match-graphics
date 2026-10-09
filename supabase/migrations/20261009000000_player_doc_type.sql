-- Aggiunge tipo documento (C.I. / Passaporto) ai giocatori
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS doc_type TEXT;
