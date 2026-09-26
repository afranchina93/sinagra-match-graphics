import { useState } from 'react';
import { AppIcon } from '../ui/AppIcon';
import type { Player, Match, MatchView, StaffPerson } from '../../domain/types';
import type { ClubConfig } from '../../domain/distinta';

interface DistintaFormProps {
  match: Match;
  view: MatchView;
  players: Player[];
  staff: StaffPerson[];
  clubConfig: ClubConfig;
  onChange: (match: Match) => void;
  onClubConfigChange: (config: ClubConfig) => void;
  onPrint: () => void;
}

const inputCls =
  'bg-app-surface border border-white/10 text-app-text text-[12px] rounded-md px-2.5 py-2 focus:outline-none focus:border-app-signal/60 transition-colors w-full';
const labelCls = 'block text-[9px] uppercase tracking-[0.14em] text-app-muted mb-1';
const selectCls =
  'bg-app-surface border border-white/10 text-app-muted text-[12px] rounded-md px-2.5 py-2 focus:outline-none focus:border-app-signal/60 transition-colors w-full';

type Marker = 'K' | 'VK';

function StaffField({
  label, name, extra, extraLabel, staff,
  onName, onExtra, onSelectStaff,
}: {
  label: string;
  name: string;
  extra?: string;
  extraLabel?: string;
  staff: StaffPerson[];
  onName: (v: string) => void;
  onExtra?: (v: string) => void;
  onSelectStaff: (person: StaffPerson) => void;
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-[9px] uppercase tracking-[0.14em] text-app-muted font-semibold">{label}</span>
      {staff.length > 0 && (
        <select className={selectCls}
          value=""
          onChange={e => {
            const p = staff.find(s => s.id === e.target.value);
            if (p) onSelectStaff(p);
          }}>
          <option value="">Seleziona da lista...</option>
          {staff.map(s => (
            <option key={s.id} value={s.id}>{s.lastName} {s.firstName}</option>
          ))}
        </select>
      )}
      <div className={onExtra ? 'grid grid-cols-2 gap-2' : ''}>
        <input className={inputCls} value={name} onChange={e => onName(e.target.value)} placeholder="Nome completo" />
        {onExtra && extraLabel && (
          <input className={inputCls} value={extra ?? ''} onChange={e => onExtra(e.target.value)} placeholder={extraLabel} />
        )}
      </div>
    </div>
  );
}

export function DistintaForm({ match, view, players, staff, clubConfig, onChange, onClubConfigChange, onPrint }: DistintaFormProps) {
  const [showStaff, setShowStaff] = useState(false);

  const markers = match.distintaMarkers ?? {};

  function toggleMarker(playerId: string, marker: Marker) {
    const current = markers[playerId];
    const updated = { ...markers };
    if (current === marker) {
      delete updated[playerId];
    } else {
      updated[playerId] = marker;
    }
    onChange({ ...match, distintaMarkers: updated });
  }

  const overrides = match.numberOverrides ?? {};
  const starterIds = Object.values(view.starters).filter(Boolean);
  const benchIds = view.bench.filter(Boolean);
  const allIds = [...new Set([...starterIds, ...benchIds])];

  function getPlayer(id: string) {
    return players.find(p => p.id === id);
  }

  function displayNumber(id: string, player: Player) {
    return overrides[id] ?? player.number;
  }

  const setCC = (fn: (prev: ClubConfig) => ClubConfig) =>
    onClubConfigChange(fn(clubConfig));

  return (
    <div className="space-y-5">
      <h2 className="font-condensed text-[15px] font-bold uppercase text-app-text border-b border-white/10 pb-2">
        Distinta di Gara
      </h2>

      {/* Giocatori */}
      <div>
        <p className="text-[9px] uppercase tracking-[0.14em] text-app-muted mb-2">
          Giocatori ({allIds.length})
        </p>

        {allIds.length === 0 && (
          <p className="text-[12px] text-app-dim text-center py-4">
            Seleziona prima i giocatori nel tab Formazione
          </p>
        )}

        {allIds.length > 0 && (
          <div className="space-y-0.5">
            {starterIds.length > 0 && (
              <div className="mb-1">
                <p className="text-[9px] text-app-dim uppercase tracking-widest px-2 py-1">
                  Titolari ({starterIds.length})
                </p>
                {starterIds.map(id => {
                  const p = getPlayer(id);
                  if (!p) return null;
                  const marker = markers[id];
                  return (
                    <div key={id} className="flex items-center gap-2.5 px-2.5 py-2 rounded-md hover:bg-app-surface transition-colors">
                      <span className="text-[12px] font-bold text-app-signal w-5">{displayNumber(id, p)}</span>
                      <span className="text-[13px] text-app-text flex-1 truncate">
                        {p.lastName} {p.firstName}
                      </span>
                      <div className="flex gap-1">
                        {(['K', 'VK'] as Marker[]).map(m => (
                          <button
                            key={m}
                            onClick={() => toggleMarker(id, m)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide transition-colors ${
                              marker === m
                                ? 'bg-app-signal text-[#111111]'
                                : 'bg-app-surface text-app-muted border border-white/10 hover:border-app-signal/40'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {benchIds.length > 0 && (
              <div>
                <p className="text-[9px] text-app-dim uppercase tracking-widest px-2 py-1 border-t border-white/8">
                  Panchina ({benchIds.length})
                </p>
                {benchIds.map(id => {
                  const p = getPlayer(id);
                  if (!p) return null;
                  const marker = markers[id];
                  return (
                    <div key={id} className="flex items-center gap-2.5 px-2.5 py-2 rounded-md hover:bg-app-surface transition-colors">
                      <span className="text-[12px] font-bold text-app-muted w-5">{displayNumber(id, p)}</span>
                      <span className="text-[13px] text-app-text/70 flex-1 truncate">
                        {p.lastName} {p.firstName}
                      </span>
                      <div className="flex gap-1">
                        {(['K', 'VK'] as Marker[]).map(m => (
                          <button
                            key={m}
                            onClick={() => toggleMarker(id, m)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide transition-colors ${
                              marker === m
                                ? 'bg-app-signal text-[#111111]'
                                : 'bg-app-surface text-app-muted border border-white/10 hover:border-app-signal/40'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <p className="text-[10px] text-app-dim mt-2 px-2">
          K = Capitano · VK = Vice Capitano
        </p>
      </div>

      {/* Dati Società (collassabile) */}
      <div className="border border-white/10 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowStaff(s => !s)}
          className="w-full flex items-center justify-between px-3 py-3 text-[12px] font-semibold text-app-muted uppercase tracking-[0.06em] hover:bg-app-surface transition-colors"
        >
          Dati Società / Staff
          <AppIcon
            name="chevron-down"
            size={14}
            className={`transition-transform ${showStaff ? 'rotate-180' : ''}`}
          />
        </button>

        {showStaff && (
          <div className="px-3 pb-3 space-y-3 border-t border-white/10">
            <div className="grid grid-cols-2 gap-2 pt-3">
              <div>
                <label className={labelCls}>Denominazione società</label>
                <input className={inputCls} value={clubConfig.clubFullName}
                  onChange={e => setCC(c => ({ ...c, clubFullName: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>N° matricola</label>
                <input className={inputCls} value={clubConfig.matricola}
                  onChange={e => setCC(c => ({ ...c, matricola: e.target.value }))} />
              </div>
            </div>

            <StaffField label="Dirigente accompagnatore"
              staff={staff}
              name={clubConfig.dirigente.name ?? ''}
              extra={clubConfig.dirigente.docIdentity} extraLabel="Doc. identità"
              onName={v => setCC(c => ({ ...c, dirigente: { ...c.dirigente, name: v } }))}
              onExtra={v => setCC(c => ({ ...c, dirigente: { ...c.dirigente, docIdentity: v } }))}
              onSelectStaff={p => setCC(c => ({ ...c, dirigente: { name: `${p.lastName} ${p.firstName}`.trim(), docIdentity: p.docIdentity ?? c.dirigente.docIdentity } }))}
            />

            <StaffField label="Dirigente addetto gara"
              staff={staff}
              name={clubConfig.direttoreGara.name ?? ''}
              extra={clubConfig.direttoreGara.tesseraFIGC} extraLabel="Tessera Imp. FIGC n°"
              onName={v => setCC(c => ({ ...c, direttoreGara: { ...c.direttoreGara, name: v } }))}
              onExtra={v => setCC(c => ({ ...c, direttoreGara: { ...c.direttoreGara, tesseraFIGC: v } }))}
              onSelectStaff={p => setCC(c => ({ ...c, direttoreGara: { name: `${p.lastName} ${p.firstName}`.trim(), tesseraFIGC: p.tesseraFIGC ?? c.direttoreGara.tesseraFIGC, docIdentity: p.docIdentity ?? c.direttoreGara.docIdentity } }))}
            />

            <StaffField label="Allenatore"
              staff={staff}
              name={clubConfig.allenatore.name ?? ''}
              extra={clubConfig.allenatore.matricola} extraLabel="Matricola tecnico"
              onName={v => setCC(c => ({ ...c, allenatore: { ...c.allenatore, name: v } }))}
              onExtra={v => setCC(c => ({ ...c, allenatore: { ...c.allenatore, matricola: v } }))}
              onSelectStaff={p => setCC(c => ({ ...c, allenatore: { name: `${p.lastName} ${p.firstName}`.trim(), matricola: p.matricola ?? c.allenatore.matricola } }))}
            />

            <StaffField label="Medico Sociale"
              staff={staff}
              name={clubConfig.medicoSociale.name ?? ''}
              extra={clubConfig.medicoSociale.tesseraFIGC} extraLabel="Tessera FIGC n°"
              onName={v => setCC(c => ({ ...c, medicoSociale: { ...c.medicoSociale, name: v } }))}
              onExtra={v => setCC(c => ({ ...c, medicoSociale: { ...c.medicoSociale, tesseraFIGC: v } }))}
              onSelectStaff={p => setCC(c => ({ ...c, medicoSociale: { name: `${p.lastName} ${p.firstName}`.trim(), tesseraFIGC: p.tesseraFIGC ?? c.medicoSociale.tesseraFIGC } }))}
            />

            <StaffField label="Collaboratore"
              staff={staff}
              name={clubConfig.collaboratore.name ?? ''}
              extra={clubConfig.collaboratore.matricola} extraLabel="Matricola"
              onName={v => setCC(c => ({ ...c, collaboratore: { ...c.collaboratore, name: v } }))}
              onExtra={v => setCC(c => ({ ...c, collaboratore: { ...c.collaboratore, matricola: v } }))}
              onSelectStaff={p => setCC(c => ({ ...c, collaboratore: { name: `${p.lastName} ${p.firstName}`.trim(), matricola: p.matricola ?? c.collaboratore.matricola } }))}
            />

            <div>
              <span className="text-[9px] uppercase tracking-[0.14em] text-app-muted font-semibold block mb-2">
                Dirigenti Forza Pubblica
              </span>
              {clubConfig.dirigentiForza.map((df, i) => (
                <div key={i} className="grid grid-cols-2 gap-2 mb-2">
                  <input className={inputCls} placeholder="Nome" value={df.name ?? ''}
                    onChange={e => setCC(c => {
                      const arr = [...c.dirigentiForza];
                      arr[i] = { ...arr[i], name: e.target.value };
                      return { ...c, dirigentiForza: arr };
                    })}
                  />
                  <input className={inputCls} placeholder="Doc. identità" value={df.docIdentity ?? ''}
                    onChange={e => setCC(c => {
                      const arr = [...c.dirigentiForza];
                      arr[i] = { ...arr[i], docIdentity: e.target.value };
                      return { ...c, dirigentiForza: arr };
                    })}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Print button */}
      <button
        onClick={onPrint}
        className="w-full inline-flex items-center justify-center gap-2 min-h-[48px] bg-app-text text-app-canvas text-[13px] font-bold rounded-md transition-colors hover:bg-white uppercase tracking-[0.04em]"
      >
        <AppIcon name="printer" size={16} />
        Stampa Distinta
      </button>

      <p className="text-[11px] text-app-dim text-center">
        Assicurati di aver inserito DOB e matricola nella scheda Rosa prima di stampare
      </p>
    </div>
  );
}
