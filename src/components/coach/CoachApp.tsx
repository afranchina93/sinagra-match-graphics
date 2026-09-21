import { useState, useEffect } from 'react';
import type { Player, Match, Team } from '../../domain/types';
import { loadPlayers, loadMatches, loadTeams } from '../../storage/db';
import { RosterManager } from '../match/RosterManager';
import { PlayerPage } from '../match/PlayerPage';
import { CoachMatchDetail } from './CoachMatchDetail';
import { supabase } from '../../storage/supabaseClient';

type MainTab = 'rosa' | 'partite';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function CoachApp() {
  const [mainTab, setMainTab] = useState<MainTab>('partite');
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([loadPlayers(), loadMatches(), loadTeams()])
      .then(([p, m, t]) => { setPlayers(p); setMatches(m); setTeams(t); })
      .catch(console.error);
  }, []);

  const teamMap = new Map(teams.map(t => [t.id, t]));

  // Detail views override tabs
  if (selectedMatchId) {
    return (
      <Layout onLogout={() => supabase.auth.signOut()}>
        <CoachMatchDetail
          matchId={selectedMatchId}
          players={players}
          onBack={() => setSelectedMatchId(null)}
        />
      </Layout>
    );
  }

  if (selectedPlayer) {
    return (
      <Layout onLogout={() => supabase.auth.signOut()}>
        <PlayerPage
          player={selectedPlayer}
          onBack={() => setSelectedPlayer(null)}
          onMatchSelect={setSelectedMatchId}
        />
      </Layout>
    );
  }

  return (
    <Layout onLogout={() => supabase.auth.signOut()}>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-white/10 pb-3 mb-5">
        <button
          onClick={() => setMainTab('partite')}
          className={`text-[12px] font-bold px-3 py-1.5 rounded-md uppercase tracking-[0.04em] transition-colors ${mainTab === 'partite' ? 'bg-app-signal text-[#111111]' : 'text-app-muted hover:text-app-text'}`}
        >
          Partite
        </button>
        <button
          onClick={() => setMainTab('rosa')}
          className={`text-[12px] font-bold px-3 py-1.5 rounded-md uppercase tracking-[0.04em] transition-colors ${mainTab === 'rosa' ? 'bg-app-signal text-[#111111]' : 'text-app-muted hover:text-app-text'}`}
        >
          Rosa
        </button>
      </div>

      {mainTab === 'partite' && (
        <div className="space-y-2">
          {matches.length === 0 && (
            <p className="text-[12px] text-app-dim text-center py-8">Nessuna partita registrata</p>
          )}
          {matches.map(m => {
            const opponent = m.opponentId ? teamMap.get(m.opponentId) : null;
            const homeTeam = m.isHome ? 'Sinagra' : (opponent?.name ?? '?');
            const awayTeam = m.isHome ? (opponent?.name ?? '?') : 'Sinagra';
            return (
              <button
                key={m.id}
                onClick={() => setSelectedMatchId(m.id)}
                className="w-full bg-app-surface border border-white/10 rounded-lg px-4 py-3 text-left hover:border-white/20 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-app-muted shrink-0">{formatDate(m.matchDate)}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-condensed text-[15px] font-black text-app-signal">
                      {m.homeGoals}–{m.awayGoals}
                    </span>
                    <span className="text-app-muted text-[14px]">›</span>
                  </div>
                </div>
                <div className="text-[13px] font-semibold text-app-text mt-0.5">
                  {homeTeam} vs {awayTeam}
                </div>
                {m.formation && (
                  <span className="text-[10px] text-app-dim">{m.formation}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {mainTab === 'rosa' && (
        <RosterManager
          players={players}
          staff={[]}
          readOnly
          onSelectPlayer={setSelectedPlayer}
          onUpsertPlayer={async () => {}}
          onDeletePlayer={async () => {}}
          onUpsertStaff={async () => ({ id: '', firstName: '', lastName: '', role: '', active: true })}
          onDeleteStaff={async () => {}}
          onSelectStaff={() => {}}
        />
      )}
    </Layout>
  );
}

function Layout({ children, onLogout }: { children: React.ReactNode; onLogout: () => void }) {
  return (
    <div className="min-h-screen bg-app-canvas text-app-text">
      <div className="bg-app-surface border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <span className="font-condensed text-[15px] font-bold uppercase tracking-widest text-app-text">
          Sinagra Calcio
        </span>
        <button
          onClick={onLogout}
          className="text-[11px] text-app-muted hover:text-red-400 uppercase tracking-[0.1em] transition-colors"
        >
          Logout
        </button>
      </div>
      <div className="max-w-lg mx-auto px-4 py-5">
        {children}
      </div>
    </div>
  );
}
