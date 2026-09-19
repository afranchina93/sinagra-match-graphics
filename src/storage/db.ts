import { supabase } from './supabaseClient';
import type { Player, Team, Competition, Match, MatchView, Scorer, SubstitutionEntry } from '../domain/types';

// ── Players ───────────────────────────────────────────────────────────────────

export async function loadPlayers(): Promise<Player[]> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .order('role')
    .order('number');
  if (error) { console.error('loadPlayers:', error); return []; }
  return (data ?? []).map(dbToPlayer);
}

export async function upsertPlayer(
  player: Omit<Player, 'id'> & { id?: string }
): Promise<Player> {
  const row: Record<string, unknown> = {
    number: player.number,
    first_name: player.firstName,
    last_name: player.lastName,
    role: player.role,
    active: player.active ?? true,
  };
  if (player.id) row.id = player.id;
  const { data, error } = await supabase
    .from('players')
    .upsert(row)
    .select()
    .single();
  if (error) throw error;
  return dbToPlayer(data);
}

export async function deletePlayer(id: string): Promise<void> {
  const { error } = await supabase.from('players').delete().eq('id', id);
  if (error) throw error;
}

export async function deactivatePlayer(id: string): Promise<void> {
  const { error } = await supabase.from('players').update({ active: false }).eq('id', id);
  if (error) throw error;
}

// ── Teams ─────────────────────────────────────────────────────────────────────

export async function loadTeams(): Promise<Team[]> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('name');
  if (error) { console.error('loadTeams:', error); return []; }
  return (data ?? []).map(dbToTeam);
}

export async function upsertTeam(
  team: Omit<Team, 'id'> & { id?: string }
): Promise<Team> {
  const row: Record<string, unknown> = { name: team.name, logo_url: team.logoUrl ?? null };
  if (team.id) row.id = team.id;
  const { data, error } = await supabase
    .from('teams')
    .upsert(row)
    .select()
    .single();
  if (error) throw error;
  return dbToTeam(data);
}

export async function uploadTeamLogo(teamId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'png';
  const path = `${teamId}.${ext}`;
  const { error } = await supabase.storage
    .from('logos')
    .upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('logos').getPublicUrl(path);
  return data.publicUrl;
}

// ── Competitions ──────────────────────────────────────────────────────────────

export async function loadCompetitions(): Promise<Competition[]> {
  const { data, error } = await supabase
    .from('competitions')
    .select('*')
    .order('name');
  if (error) { console.error('loadCompetitions:', error); return []; }
  return (data ?? []).map(dbToCompetition);
}

export async function upsertCompetition(
  name: string,
  season: string
): Promise<Competition> {
  const { data, error } = await supabase
    .from('competitions')
    .upsert({ name, season }, { onConflict: 'name' })
    .select()
    .single();
  if (error) throw error;
  return dbToCompetition(data);
}

// ── Matches ───────────────────────────────────────────────────────────────────

export async function loadMatches(): Promise<Match[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('match_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) { console.error('loadMatches:', error); return []; }
  return (data ?? []).map(dbToMatch);
}

export async function createMatch(
  matchData: Omit<Match, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Match> {
  const { data, error } = await supabase
    .from('matches')
    .insert(matchToDb(matchData))
    .select()
    .single();
  if (error) throw error;
  return dbToMatch(data);
}

export async function updateMatch(match: Match): Promise<void> {
  const { error } = await supabase
    .from('matches')
    .update({ ...matchToDb(match), updated_at: new Date().toISOString() })
    .eq('id', match.id);
  if (error) console.error('updateMatch:', error);
}

export async function deleteMatch(id: string): Promise<void> {
  await supabase.from('matches').delete().eq('id', id);
}

export async function loadMatchView(matchId: string): Promise<MatchView | null> {
  const [matchRes, startersRes, benchRes] = await Promise.all([
    supabase.from('matches').select('*').eq('id', matchId).single(),
    supabase.from('match_starters').select('slot_id, player_id').eq('match_id', matchId),
    supabase.from('match_bench')
      .select('player_id, sort_order')
      .eq('match_id', matchId)
      .order('sort_order'),
  ]);

  if (matchRes.error || !matchRes.data) return null;

  const match = dbToMatch(matchRes.data);

  let opponent: Team | null = null;
  if (match.opponentId) {
    const { data } = await supabase
      .from('teams').select('*').eq('id', match.opponentId).single();
    if (data) opponent = dbToTeam(data);
  }

  const starters: Record<string, string> = {};
  for (const row of startersRes.data ?? []) {
    starters[row.slot_id] = row.player_id;
  }
  const bench = (benchRes.data ?? []).map((r) => r.player_id as string);

  return { match, opponent, starters, bench };
}

export async function saveMatchLineup(
  matchId: string,
  starters: Record<string, string>,
  bench: string[]
): Promise<void> {
  await Promise.all([
    supabase.from('match_starters').delete().eq('match_id', matchId),
    supabase.from('match_bench').delete().eq('match_id', matchId),
  ]);

  const starterRows = Object.entries(starters)
    .filter(([, pid]) => !!pid)
    .map(([slotId, playerId]) => ({
      match_id: matchId,
      slot_id: slotId,
      player_id: playerId,
    }));

  const benchRows = bench.map((playerId, i) => ({
    match_id: matchId,
    player_id: playerId,
    sort_order: i,
  }));

  await Promise.all([
    starterRows.length > 0
      ? supabase.from('match_starters').insert(starterRows)
      : Promise.resolve(),
    benchRows.length > 0
      ? supabase.from('match_bench').insert(benchRows)
      : Promise.resolve(),
  ]);
}

// ── DB ↔ TypeScript mappers ───────────────────────────────────────────────────

function dbToPlayer(r: Record<string, unknown>): Player {
  return {
    id: r.id as string,
    number: r.number as number,
    firstName: r.first_name as string,
    lastName: r.last_name as string,
    role: r.role as Player['role'],
    active: r.active as boolean,
  };
}

function dbToTeam(r: Record<string, unknown>): Team {
  return {
    id: r.id as string,
    name: r.name as string,
    logoUrl: (r.logo_url as string) ?? null,
  };
}

function dbToCompetition(r: Record<string, unknown>): Competition {
  return {
    id: r.id as string,
    name: r.name as string,
    season: r.season as string,
  };
}

function dbToMatch(r: Record<string, unknown>): Match {
  return {
    id: r.id as string,
    opponentId: (r.opponent_id as string) ?? null,
    isHome: r.is_home as boolean,
    matchDate: (r.match_date as string) ?? null,
    competitionId: (r.competition_id as string) ?? null,
    matchday: (r.matchday as string) ?? '',
    formation: (r.formation as string) ?? '4-3-3',
    stadium: (r.stadium as string) ?? '',
    coach: (r.coach as string) ?? '',
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    homeGoals: (r.home_goals as number) ?? 0,
    awayGoals: (r.away_goals as number) ?? 0,
    homeScorers: (r.home_scorers as Scorer[]) ?? [],
    awayScorers: (r.away_scorers as Scorer[]) ?? [],
    substitutions: (r.substitutions as SubstitutionEntry[]) ?? [],
  };
}

function matchToDb(m: Omit<Match, 'id' | 'createdAt' | 'updatedAt'>): Record<string, unknown> {
  return {
    opponent_id: m.opponentId ?? null,
    is_home: m.isHome,
    match_date: m.matchDate ?? null,
    competition_id: m.competitionId ?? null,
    matchday: m.matchday ?? '',
    formation: m.formation ?? '4-3-3',
    stadium: m.stadium ?? 'Campo Sportivo Sinagra',
    coach: m.coach ?? 'Andrea Ioppolo',
    home_goals: m.homeGoals ?? 0,
    away_goals: m.awayGoals ?? 0,
    home_scorers: m.homeScorers ?? [],
    away_scorers: m.awayScorers ?? [],
    substitutions: m.substitutions ?? [],
  };
}
