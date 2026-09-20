import { supabase } from './supabaseClient';
import type { Player, Team, Competition, Match, MatchView, MatchGoal, MatchSubstitution, ScorerNote } from '../domain/types';
import type { ClubConfig } from '../domain/distinta';
import { DEFAULT_CLUB_CONFIG } from '../domain/distinta';

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
    date_of_birth: player.dateOfBirth ?? null,
    matricola: player.matricola ?? null,
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
  await supabase.from('players').delete().eq('id', id);
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
  const [matchRes, startersRes, benchRes, goalsRes, subsRes] = await Promise.all([
    supabase.from('matches').select('*').eq('id', matchId).single(),
    supabase.from('match_starters').select('slot_id, player_id').eq('match_id', matchId),
    supabase.from('match_bench')
      .select('player_id, sort_order')
      .eq('match_id', matchId)
      .order('sort_order'),
    supabase.from('match_goals')
      .select('*')
      .eq('match_id', matchId)
      .order('minute'),
    supabase.from('match_substitutions')
      .select('*')
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
  const goals = (goalsRes.data ?? []).map(dbToMatchGoal);
  const substitutions = (subsRes.data ?? []).map(dbToMatchSubstitution);

  return { match, opponent, starters, bench, goals, substitutions };
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

export async function saveMatchGoals(
  matchId: string,
  goals: MatchGoal[]
): Promise<void> {
  await supabase.from('match_goals').delete().eq('match_id', matchId);
  if (goals.length === 0) return;
  const rows = goals.map((g, i) => ({
    match_id: matchId,
    player_id: g.playerId ?? null,
    player_name: g.playerName,
    minute: g.minute,
    side: g.side,
    note: g.note ?? null,
    sort_order: i,
  }));
  const { error } = await supabase.from('match_goals').insert(rows);
  if (error) console.error('saveMatchGoals:', error);
}

export async function saveMatchSubstitutions(
  matchId: string,
  subs: MatchSubstitution[]
): Promise<void> {
  await supabase.from('match_substitutions').delete().eq('match_id', matchId);
  if (subs.length === 0) return;
  const rows = subs.map((s, i) => ({
    match_id: matchId,
    player_out_id: s.playerOutId ?? null,
    player_out_number: s.playerOutNumber,
    player_out_name: s.playerOutName,
    player_in_id: s.playerInId ?? null,
    player_in_number: s.playerInNumber,
    player_in_name: s.playerInName,
    minute: s.minute,
    sort_order: i,
  }));
  const { error } = await supabase.from('match_substitutions').insert(rows);
  if (error) console.error('saveMatchSubstitutions:', error);
}

// ── Club Config ───────────────────────────────────────────────────────────────

export async function loadClubConfig(): Promise<ClubConfig> {
  const { data, error } = await supabase
    .from('club_config')
    .select('data')
    .eq('id', 1)
    .single();
  if (error || !data) return DEFAULT_CLUB_CONFIG;
  return { ...DEFAULT_CLUB_CONFIG, ...(data.data as Partial<ClubConfig>) };
}

export async function saveClubConfig(config: ClubConfig): Promise<void> {
  const { error } = await supabase
    .from('club_config')
    .upsert({ id: 1, data: config });
  if (error) console.error('saveClubConfig:', error);
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
    dateOfBirth: (r.date_of_birth as string) ?? undefined,
    matricola: (r.matricola as string) ?? undefined,
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
    kickoffTime: (r.kickoff_time as string) ?? '',
    distintaMarkers: (r.distinta_markers as Record<string, 'K' | 'VK'>) ?? {},
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
    kickoff_time: m.kickoffTime ?? null,
    distinta_markers: m.distintaMarkers ?? {},
  };
}

function dbToMatchGoal(r: Record<string, unknown>): MatchGoal {
  return {
    id: r.id as string,
    matchId: r.match_id as string,
    playerId: (r.player_id as string) ?? undefined,
    playerName: r.player_name as string,
    minute: r.minute as number,
    side: r.side as 'home' | 'away',
    note: (r.note as ScorerNote) ?? undefined,
    sortOrder: r.sort_order as number,
  };
}

function dbToMatchSubstitution(r: Record<string, unknown>): MatchSubstitution {
  return {
    id: r.id as string,
    matchId: r.match_id as string,
    playerOutId: (r.player_out_id as string) ?? undefined,
    playerOutNumber: (r.player_out_number as number) ?? 0,
    playerOutName: (r.player_out_name as string) ?? '',
    playerInId: (r.player_in_id as string) ?? undefined,
    playerInNumber: (r.player_in_number as number) ?? 0,
    playerInName: (r.player_in_name as string) ?? '',
    minute: (r.minute as string) ?? '',
    sortOrder: (r.sort_order as number) ?? 0,
  };
}
