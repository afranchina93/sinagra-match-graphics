import { useRef, useState } from 'react';
import { AppIcon } from '../ui/AppIcon';
import type { Match, Team, Competition } from '../../domain/types';

interface MatchFormProps {
  match: Match;
  opponent: Team | null;
  teams: Team[];
  competitions: Competition[];
  onChange: (match: Match) => void;
  onAddTeam: (name: string) => Promise<Team>;
  onAddCompetition: (name: string) => Promise<Competition>;
  onUploadLogo: (teamId: string, file: File) => Promise<void>;
}

const labelCls = 'block text-[9px] uppercase tracking-[0.14em] text-app-muted mb-1.5';
const inputCls =
  'w-full bg-app-surface border border-white/10 text-app-text text-[13px] rounded-md px-3 py-2.5 focus:outline-none focus:border-app-signal/60 transition-colors';

export function MatchForm({
  match,
  opponent,
  teams,
  competitions,
  onChange,
  onAddTeam,
  onAddCompetition,
  onUploadLogo,
}: MatchFormProps) {
  const set = <K extends keyof Match>(key: K, val: Match[K]) =>
    onChange({ ...match, [key]: val });

  const [addingTeam, setAddingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [addingComp, setAddingComp] = useState(false);
  const [newCompName, setNewCompName] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  async function handleAddTeam() {
    const name = newTeamName.trim();
    if (!name) return;
    const team = await onAddTeam(name);
    onChange({ ...match, opponentId: team.id });
    setNewTeamName('');
    setAddingTeam(false);
  }

  async function handleAddComp() {
    const name = newCompName.trim();
    if (!name) return;
    const comp = await onAddCompetition(name);
    onChange({ ...match, competitionId: comp.id });
    setNewCompName('');
    setAddingComp(false);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !match.opponentId) return;
    setUploadingLogo(true);
    try {
      await onUploadLogo(match.opponentId, file);
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-5">
      <h2 className="font-condensed text-[15px] font-bold uppercase text-app-text border-b border-white/10 pb-2">
        Configurazione Partita
      </h2>

      {/* Avversario */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className={labelCls} style={{ marginBottom: 0 }}>Avversario</label>
          <button
            onClick={() => setAddingTeam(!addingTeam)}
            className="text-[11px] text-app-signal hover:text-[#f0ff66] flex items-center gap-1"
          >
            {addingTeam ? <AppIcon name="close" size={12} /> : <AppIcon name="plus" size={12} />}
            {addingTeam ? 'Annulla' : 'Nuovo'}
          </button>
        </div>

        {addingTeam ? (
          <div className="flex gap-2 mt-1">
            <input
              className={inputCls}
              autoFocus
              placeholder="Nome squadra"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTeam()}
            />
            <button
              onClick={handleAddTeam}
              className="shrink-0 bg-app-signal text-[#111710] text-[12px] font-bold px-3 rounded-md hover:bg-[#f0ff66]"
            >
              OK
            </button>
          </div>
        ) : (
          <select
            className={inputCls}
            value={match.opponentId ?? ''}
            onChange={(e) => set('opponentId', e.target.value || null)}
          >
            <option value="">— Seleziona avversario —</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Logo avversario */}
      {match.opponentId && (
        <div>
          <label className={labelCls}>Logo avversario</label>
          <div className="flex items-center gap-3">
            {opponent?.logoUrl ? (
              <img
                src={opponent.logoUrl}
                alt={opponent.name}
                className="w-10 h-10 object-contain rounded bg-app-surface"
              />
            ) : (
              <div className="w-10 h-10 rounded-md bg-app-raised border border-white/10 flex items-center justify-center text-app-muted text-xs font-bold">
                {opponent?.name?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
            <button
              onClick={() => logoInputRef.current?.click()}
              disabled={uploadingLogo}
              className="flex items-center gap-1.5 text-[12px] text-app-muted hover:text-app-text border border-white/10 hover:border-white/25 rounded-md px-3 py-2 transition-colors disabled:opacity-50"
            >
              <AppIcon name="upload" size={12} />
              {uploadingLogo ? 'Upload...' : opponent?.logoUrl ? 'Cambia logo' : 'Carica logo'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {/* Competizione */}
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-1.5">
            <label className={labelCls} style={{ marginBottom: 0 }}>Competizione</label>
            <button
              onClick={() => setAddingComp(!addingComp)}
              className="text-[11px] text-app-signal hover:text-[#f0ff66] flex items-center gap-1"
            >
              {addingComp ? <AppIcon name="close" size={12} /> : <AppIcon name="plus" size={12} />}
              {addingComp ? 'Annulla' : 'Nuova'}
            </button>
          </div>

          {addingComp ? (
            <div className="flex gap-2 mt-1">
              <input
                className={inputCls}
                autoFocus
                placeholder="Nome competizione"
                value={newCompName}
                onChange={(e) => setNewCompName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddComp()}
              />
              <button
                onClick={handleAddComp}
                className="shrink-0 bg-app-signal text-[#111710] text-[12px] font-bold px-3 rounded-md hover:bg-[#f0ff66]"
              >
                OK
              </button>
            </div>
          ) : (
            <select
              className={inputCls}
              value={match.competitionId ?? ''}
              onChange={(e) => set('competitionId', e.target.value || null)}
            >
              <option value="">— Seleziona competizione —</option>
              {competitions.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Giornata */}
        <div>
          <label className={labelCls}>Giornata</label>
          <input
            className={inputCls}
            type="text"
            placeholder="es. Giornata 5"
            value={match.matchday}
            onChange={(e) => set('matchday', e.target.value)}
          />
        </div>

        {/* Data e ora */}
        <div>
          <label className={labelCls}>Data e ora</label>
          <input
            className={inputCls}
            type="datetime-local"
            value={match.matchDate ? match.matchDate.slice(0, 16) : ''}
            onChange={(e) => {
              const val = e.target.value;
              const time = val ? val.slice(11, 16).replace(':', '.') : '';
              onChange({ ...match, matchDate: val || null, kickoffTime: time });
            }}
          />
        </div>

        {/* Allenatore */}
        <div>
          <label className={labelCls}>Allenatore</label>
          <input
            className={inputCls}
            type="text"
            placeholder="Nome allenatore"
            value={match.coach}
            onChange={(e) => set('coach', e.target.value)}
          />
        </div>

        {/* Stadio */}
        <div className="col-span-2">
          <label className={labelCls}>Stadio</label>
          <input
            className={inputCls}
            type="text"
            placeholder="es. Campo Sportivo Sinagra"
            value={match.stadium}
            onChange={(e) => set('stadium', e.target.value)}
          />
        </div>

        {/* Casa / Trasferta */}
        <div className="col-span-2">
          <label className={labelCls}>Sede</label>
          <div className="flex gap-2">
            {[
              { val: true, label: 'Casa' },
              { val: false, label: 'Trasferta' },
            ].map(({ val, label }) => (
              <button
                key={label}
                type="button"
                onClick={() => set('isHome', val)}
                className={`flex-1 py-2.5 rounded-md text-[13px] font-bold uppercase tracking-[0.04em] transition-colors ${
                  match.isHome === val
                    ? 'bg-app-signal text-[#111710]'
                    : 'bg-app-surface text-app-muted border border-white/10 hover:border-app-signal/40'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
