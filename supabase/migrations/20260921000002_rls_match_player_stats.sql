ALTER TABLE match_player_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage match_player_stats"
  ON match_player_stats
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
