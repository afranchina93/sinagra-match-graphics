import { supabase } from './supabaseClient';
import type { Player, Team, Competition, Match, MatchView, MatchGoal, MatchSubstitution, ScorerNote, StaffPerson, PlayerStats, PlayerMatchStat, MatchScoutNotes, PlayerMatchHistoryRow } from '../domain/types';
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
    doc_identity: player.docIdentity ?? null,
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

export async function loadAllPlayersStats(): Promise<Record<string, PlayerStats>> {
  const [starterRes, goalRes, subInRes, subOutRes] = await Promise.all([
    supabase
      .from('match_starters')
      .select('player_id, match_id, slot_id, matches(home_goals, away_goals, is_home)'),
    supabase
      .from('match_goals')
      .select('player_id')
      .not('player_id', 'is', null)
      .or('note.is.null,note.neq.AG'),
    supabase
      .from('match_substitutions')
      .select('player_in_id, match_id, minute')
      .not('player_in_id', 'is', null),
    supabase
      .from('match_substitutions')
      .select('player_out_id, match_id, minute')
      .not('player_out_id', 'is', null),
  ]);

  const starterRows = (starterRes.data ?? [] as unknown[]) as Array<{
    player_id: string;
    match_id: string;
    slot_id: string;
    matches: { home_goals: number; away_goals: number; is_home: boolean } | null;
  }>;
  const goalRows = (goalRes.data ?? []) as Array<{ player_id: string }>;
  const subInRows = (subInRes.data ?? []) as Array<{ player_in_id: string; match_id: string; minute: string }>;
  const subOutRows = (subOutRes.data ?? []) as Array<{ player_out_id: string; match_id: string; minute: string }>;

  const stats: Record<string, PlayerStats> = {};
  const ensure = (id: string) => {
    if (!stats[id]) stats[id] = { appearances: 0, starterAppearances: 0, minutesPlayed: 0, goals: 0, goalsConceded: 0 };
    return stats[id];
  };

  // Starters
  const starterMatchesByPlayer: Record<string, Set<string>> = {};
  for (const r of starterRows) {
    const s = ensure(r.player_id);
    s.starterAppearances++;
    const subOut = subOutRows.find(o => o.player_out_id === r.player_id && o.match_id === r.match_id);
    s.minutesPlayed += subOut ? (parseInt(subOut.minute) || 90) : 90;
    if (r.slot_id === 'gk' && r.matches) {
      s.goalsConceded += r.matches.is_home ? (r.matches.away_goals ?? 0) : (r.matches.home_goals ?? 0);
    }
    if (!starterMatchesByPlayer[r.player_id]) starterMatchesByPlayer[r.player_id] = new Set();
    starterMatchesByPlayer[r.player_id].add(r.match_id);
  }

  // Sub ins
  for (const r of subInRows) {
    const s = ensure(r.player_in_id);
    const subOut = subOutRows.find(o => o.player_out_id === r.player_in_id && o.match_id === r.match_id);
    const inMinute = parseInt(r.minute) || 0;
    const outMinute = subOut ? (parseInt(subOut.minute) || 90) : 90;
    s.minutesPlayed += outMinute - inMinute;
  }

  // Appearances = starter matches + sub-in only matches
  for (const r of subInRows) {
    const starterMatches = starterMatchesByPlayer[r.player_in_id];
    if (!starterMatches?.has(r.match_id)) {
      ensure(r.player_in_id).appearances++;
    }
  }
  for (const id of Object.keys(stats)) {
    stats[id].appearances += stats[id].starterAppearances;
  }

  // Goals
  for (const r of goalRows) {
    ensure(r.player_id).goals++;
  }

  return stats;
}

export async function loadPlayerStats(playerId: string): Promise<PlayerStats> {
  const [starterRes, goalRes, subInRes, subOutRes] = await Promise.all([
    supabase
      .from('match_starters')
      .select('match_id, slot_id, matches(home_goals, away_goals, is_home)')
      .eq('player_id', playerId),
    supabase
      .from('match_goals')
      .select('id')
      .eq('player_id', playerId)
      .or('note.is.null,note.neq.AG'),
    supabase
      .from('match_substitutions')
      .select('match_id, minute')
      .eq('player_in_id', playerId),
    supabase
      .from('match_substitutions')
      .select('match_id, minute')
      .eq('player_out_id', playerId),
  ]);

  const starterRows = (starterRes.data ?? [] as unknown[]) as Array<{
    match_id: string;
    slot_id: string;
    matches: { home_goals: number; away_goals: number; is_home: boolean } | null;
  }>;
  const goalRows = goalRes.data ?? [];
  const subInRows = (subInRes.data ?? []) as Array<{ match_id: string; minute: string }>;
  const subOutRows = (subOutRes.data ?? []) as Array<{ match_id: string; minute: string }>;

  const starterMatchIds = new Set(starterRows.map(r => r.match_id));
  const subMatchIds = new Set(subInRows.map(r => r.match_id));
  const appearances = new Set([...starterMatchIds, ...subMatchIds]).size;
  const starterAppearances = starterMatchIds.size;

  let minutesPlayed = 0;
  for (const r of starterRows) {
    const subOut = subOutRows.find(s => s.match_id === r.match_id);
    minutesPlayed += subOut ? (parseInt(subOut.minute) || 90) : 90;
  }
  for (const r of subInRows) {
    const subOut = subOutRows.find(s => s.match_id === r.match_id);
    const inMinute = parseInt(r.minute) || 0;
    const outMinute = subOut ? (parseInt(subOut.minute) || 90) : 90;
    minutesPlayed += outMinute - inMinute;
  }

  const goals = goalRows.length;

  let goalsConceded = 0;
  for (const r of starterRows) {
    if (r.slot_id === 'gk' && r.matches) {
      goalsConceded += r.matches.is_home ? (r.matches.away_goals ?? 0) : (r.matches.home_goals ?? 0);
    }
  }

  return { appearances, starterAppearances, minutesPlayed, goals, goalsConceded };
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
    docIdentity: (r.doc_identity as string) ?? undefined,
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
    numberOverrides: (r.number_overrides as Record<string, number>) ?? {},
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
    number_overrides: m.numberOverrides ?? {},
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

function dbToStaff(r: Record<string, unknown>): StaffPerson {
  return {
    id: r.id as string,
    firstName: (r.first_name as string) ?? '',
    lastName: (r.last_name as string) ?? '',
    role: (r.role as string) ?? '',
    dateOfBirth: (r.date_of_birth as string) ?? undefined,
    matricola: (r.matricola as string) ?? undefined,
    docIdentity: (r.doc_identity as string) ?? undefined,
    tesseraFIGC: (r.tessera_figc as string) ?? undefined,
    active: (r.active as boolean) ?? true,
  };
}

// ── Staff ─────────────────────────────────────────────────────────────────────

export async function loadStaff(): Promise<StaffPerson[]> {
  const { data, error } = await supabase
    .from('staff_members')
    .select('*')
    .order('last_name')
    .order('first_name');
  if (error) { console.error('loadStaff:', error); return []; }
  return (data ?? []).map(dbToStaff);
}

export async function upsertStaff(
  person: Omit<StaffPerson, 'id'> & { id?: string }
): Promise<StaffPerson> {
  const row: Record<string, unknown> = {
    first_name: person.firstName,
    last_name: person.lastName,
    role: person.role,
    date_of_birth: person.dateOfBirth ?? null,
    matricola: person.matricola ?? null,
    doc_identity: person.docIdentity ?? null,
    tessera_figc: person.tesseraFIGC ?? null,
    active: person.active ?? true,
  };
  if (person.id) row.id = person.id;
  const { data, error } = await supabase
    .from('staff_members')
    .upsert(row)
    .select()
    .single();
  if (error) throw error;
  return dbToStaff(data);
}

export async function deleteStaff(id: string): Promise<void> {
  await supabase.from('staff_members').delete().eq('id', id);
}

// ── Match Scout ───────────────────────────────────────────────────────────────

const DEFAULT_SCOUT_NOTES: MatchScoutNotes = {
  opponentFormation: '',
  sinagraNotes: '',
  opponentNotes: '',
  cornersHome: 0,
  cornersAway: 0,
};

export async function loadMatchScout(matchId: string): Promise<{
  stats: Record<string, PlayerMatchStat>;
  notes: MatchScoutNotes;
}> {
  const [statsRes, matchRes] = await Promise.all([
    supabase.from('match_player_stats').select('*').eq('match_id', matchId),
    supabase.from('matches').select('scout_notes').eq('id', matchId).single(),
  ]);

  const stats: Record<string, PlayerMatchStat> = {};
  for (const r of (statsRes.data ?? []) as Record<string, unknown>[]) {
    const pid = r.player_id as string;
    stats[pid] = {
      playerId: pid,
      playerName: r.player_name as string,
      playerNumber: r.player_number as number,
      tracked: (r.tracked as boolean) ?? false,
      tiriF: (r.tiri_fuori as number) ?? 0,
      tiriP: (r.tiri_in_porta as number) ?? 0,
      crossF: (r.cross_fondo as number) ?? 0,
      chiusure: (r.chiusure as number) ?? 0,
      pallePerse: (r.palle_perse as number) ?? 0,
      palleRecup: (r.palle_recuperate as number) ?? 0,
      assist: (r.assist as number) ?? 0,
      gol: (r.gol as number) ?? 0,
    };
  }

  const rawNotes = (matchRes.data?.scout_notes ?? {}) as Partial<MatchScoutNotes>;
  const notes: MatchScoutNotes = { ...DEFAULT_SCOUT_NOTES, ...rawNotes };

  return { stats, notes };
}

export async function upsertPlayerMatchStat(matchId: string, stat: PlayerMatchStat): Promise<void> {
  const { error } = await supabase.from('match_player_stats').upsert({
    match_id: matchId,
    player_id: stat.playerId,
    player_name: stat.playerName,
    player_number: stat.playerNumber,
    tracked: stat.tracked,
    tiri_fuori: stat.tiriF,
    tiri_in_porta: stat.tiriP,
    cross_fondo: stat.crossF,
    chiusure: stat.chiusure,
    palle_perse: stat.pallePerse,
    palle_recuperate: stat.palleRecup,
    assist: stat.assist,
    gol: stat.gol,
  }, { onConflict: 'match_id,player_id' });
  if (error) console.error('upsertPlayerMatchStat:', error);
}

export async function saveScoutNotes(matchId: string, notes: MatchScoutNotes): Promise<void> {
  const { error } = await supabase
    .from('matches')
    .update({ scout_notes: notes })
    .eq('id', matchId);
  if (error) console.error('saveScoutNotes:', error);
}

export async function loadPlayerMatchHistory(playerId: string): Promise<PlayerMatchHistoryRow[]> {
  const [matchesRes, starterRes, benchRes, subInRes, subOutRes, goalsRes, scoutRes] = await Promise.all([
    supabase.from('matches').select('id, match_date, formation, is_home, home_goals, away_goals, opponent_id').order('match_date', { ascending: false }),
    supabase.from('match_starters').select('match_id, slot_id').eq('player_id', playerId),
    supabase.from('match_bench').select('match_id').eq('player_id', playerId),
    supabase.from('match_substitutions').select('match_id, minute').eq('player_in_id', playerId),
    supabase.from('match_substitutions').select('match_id, minute').eq('player_out_id', playerId),
    supabase.from('match_goals').select('match_id').eq('player_id', playerId).or('note.is.null,note.neq.AG'),
    supabase.from('match_player_stats').select('*').eq('player_id', playerId),
  ]);

  type MatchRow = { id: string; match_date: string | null; formation: string; is_home: boolean; home_goals: number; away_goals: number; opponent_id: string | null };
  const matches = (matchesRes.data ?? []) as MatchRow[];

  const opponentIds = [...new Set(matches.map(m => m.opponent_id).filter(Boolean))] as string[];
  const teamsMap = new Map<string, string>();
  if (opponentIds.length > 0) {
    const { data: teams } = await supabase.from('teams').select('id, name').in('id', opponentIds);
    for (const t of (teams ?? []) as Array<{ id: string; name: string }>) teamsMap.set(t.id, t.name);
  }

  const starterMap = new Map<string, string>();
  for (const r of (starterRes.data ?? []) as Array<{ match_id: string; slot_id: string }>) {
    starterMap.set(r.match_id, r.slot_id);
  }
  const benchSet = new Set((benchRes.data ?? []).map((r: Record<string, unknown>) => r.match_id as string));
  const subInMap = new Map<string, number>();
  for (const r of (subInRes.data ?? []) as Array<{ match_id: string; minute: string }>) {
    subInMap.set(r.match_id, parseInt(r.minute) || 0);
  }
  const subOutMap = new Map<string, number>();
  for (const r of (subOutRes.data ?? []) as Array<{ match_id: string; minute: string }>) {
    subOutMap.set(r.match_id, parseInt(r.minute) || 90);
  }
  const goalCountMap = new Map<string, number>();
  for (const r of (goalsRes.data ?? []) as Array<{ match_id: string }>) {
    goalCountMap.set(r.match_id, (goalCountMap.get(r.match_id) ?? 0) + 1);
  }
  const scoutMap = new Map<string, PlayerMatchStat>();
  for (const r of (scoutRes.data ?? []) as Array<Record<string, unknown>>) {
    scoutMap.set(r.match_id as string, {
      playerId: r.player_id as string,
      playerName: r.player_name as string,
      playerNumber: r.player_number as number,
      tracked: (r.tracked as boolean) ?? false,
      tiriF: (r.tiri_fuori as number) ?? 0,
      tiriP: (r.tiri_in_porta as number) ?? 0,
      crossF: (r.cross_fondo as number) ?? 0,
      chiusure: (r.chiusure as number) ?? 0,
      pallePerse: (r.palle_perse as number) ?? 0,
      palleRecup: (r.palle_recuperate as number) ?? 0,
      assist: (r.assist as number) ?? 0,
      gol: (r.gol as number) ?? 0,
    });
  }

  return matches.map(m => {
    const isStarter = starterMap.has(m.id);
    const isSubIn = subInMap.has(m.id);
    const isBench = benchSet.has(m.id);

    let status: PlayerMatchHistoryRow['status'];
    let minutesPlayed = 0;
    let slotId: string | null = null;

    if (isStarter) {
      status = 'titolare';
      slotId = starterMap.get(m.id) ?? null;
      minutesPlayed = subOutMap.get(m.id) ?? 90;
    } else if (isSubIn) {
      status = 'subentrato';
      const inMinute = subInMap.get(m.id) ?? 0;
      minutesPlayed = (subOutMap.get(m.id) ?? 90) - inMinute;
    } else if (isBench) {
      status = 'panchina';
    } else {
      status = 'non_convocato';
    }

    const scoutEntry = scoutMap.get(m.id);
    return {
      matchId: m.id,
      matchDate: m.match_date,
      opponentName: m.opponent_id ? (teamsMap.get(m.opponent_id) ?? null) : null,
      isHome: m.is_home,
      formation: m.formation,
      homeGoals: m.home_goals,
      awayGoals: m.away_goals,
      status,
      minutesPlayed,
      slotId,
      goals: goalCountMap.get(m.id) ?? 0,
      scoutStats: scoutEntry?.tracked ? scoutEntry : null,
    };
  });
}
