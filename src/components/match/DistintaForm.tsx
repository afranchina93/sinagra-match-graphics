import { useState } from 'react';
import { ChevronDown, ChevronUp, Printer } from 'lucide-react';
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
  'bg-gray-800 border border-gray-700 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-yellow-400 w-full';
const labelCls = 'block text-[10px] text-gray-500 uppercase tracking-wider mb-0.5';
const selectCls =
  'bg-gray-800 border border-gray-600 text-gray-400 text-xs rounded px-2 py-1.5 focus:outline-none focus:border-yellow-400 w-full';

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
    <div className="space-y-1">
      <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">{label}</span>
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

  // Ordine: titolari (dal layout di formazione) poi panchina
  const starterIds = Object.values(view.starters).filter(Boolean);
  const benchIds = view.bench.filter(Boolean);
  const allIds = [...new Set([...starterIds, ...benchIds])];

  function getPlayer(id: string) {
    return players.find(p => p.id === id);
  }

  const setCC = (fn: (prev: ClubConfig) => ClubConfig) =>
    onClubConfigChange(fn(clubConfig));

  return (
    <div className="space-y-5">
      <h2 className="text-sm font-bold text-yellow-400 uppercase tracking-widest border-b border-gray-700 pb-2">
        Distinta di Gara
      </h2>

      {/* Orario */}
      <div>
        <label className={labelCls}>Orario calcio d&apos;inizio (es. 15.30)</label>
        <input
          className={inputCls}
          type="text"
          placeholder="15.30"
          value={match.kickoffTime ?? ''}
          onChange={e => onChange({ ...match, kickoffTime: e.target.value })}
        />
      </div>

      {/* Giocatori */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Giocatori ({allIds.length})
        </p>

        {allIds.length === 0 && (
          <p className="text-xs text-gray-600 text-center py-4">
            Seleziona prima i giocatori nel tab Formazione
          </p>
        )}

        {allIds.length > 0 && (
          <div className="space-y-0.5">
            {/* Titolari */}
            {starterIds.length > 0 && (
              <div className="mb-1">
                <p className="text-[10px] text-gray-600 uppercase tracking-widest px-2 py-1">
                  Titolari ({starterIds.length})
                </p>
                {starterIds.map(id => {
                  const p = getPlayer(id);
                  if (!p) return null;
                  const marker = markers[id];
                  return (
                    <div key={id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-800">
                      <span className="text-xs font-bold text-yellow-400 w-5">{p.number}</span>
                      <span className="text-xs text-white flex-1 truncate">
                        {p.lastName} {p.firstName.charAt(0)}.
                      </span>
                      <div className="flex gap-1">
                        {(['K', 'VK'] as Marker[]).map(m => (
                          <button
                            key={m}
                            onClick={() => toggleMarker(id, m)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
                              marker === m
                                ? 'bg-yellow-400 text-gray-900'
                                : 'bg-gray-800 text-gray-500 border border-gray-700 hover:border-yellow-400'
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

            {/* Panchina */}
            {benchIds.length > 0 && (
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-widest px-2 py-1 border-t border-gray-800">
                  Panchina ({benchIds.length})
                </p>
                {benchIds.map(id => {
                  const p = getPlayer(id);
                  if (!p) return null;
                  const marker = markers[id];
                  return (
                    <div key={id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-800">
                      <span className="text-xs font-bold text-gray-500 w-5">{p.number}</span>
                      <span className="text-xs text-gray-300 flex-1 truncate">
                        {p.lastName} {p.firstName.charAt(0)}.
                      </span>
                      <div className="flex gap-1">
                        {(['K', 'VK'] as Marker[]).map(m => (
                          <button
                            key={m}
                            onClick={() => toggleMarker(id, m)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
                              marker === m
                                ? 'bg-yellow-400 text-gray-900'
                                : 'bg-gray-800 text-gray-500 border border-gray-700 hover:border-yellow-400'
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

        <p className="text-[10px] text-gray-600 mt-2 px-2">
          K = Capitano · VK = Vice Capitano
        </p>
      </div>

      {/* Dati Società (collassabile) */}
      <div className="border border-gray-700 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowStaff(s => !s)}
          className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-gray-300 uppercase tracking-wide hover:bg-gray-800 transition-colors"
        >
          Dati Società / Staff
          {showStaff ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showStaff && (
          <div className="px-3 pb-3 space-y-3 border-t border-gray-700">
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
              extra={clubConfig.direttoreGara.docIdentity} extraLabel="Doc. identità"
              onName={v => setCC(c => ({ ...c, direttoreGara: { ...c.direttoreGara, name: v } }))}
              onExtra={v => setCC(c => ({ ...c, direttoreGara: { ...c.direttoreGara, docIdentity: v } }))}
              onSelectStaff={p => setCC(c => ({ ...c, direttoreGara: { name: `${p.lastName} ${p.firstName}`.trim(), docIdentity: p.docIdentity ?? c.direttoreGara.docIdentity } }))}
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
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold block mb-2">
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
        className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-100 text-gray-900 text-sm font-black py-3 rounded transition-colors uppercase tracking-wide"
      >
        <Printer size={16} />
        Stampa Distinta
      </button>

      <p className="text-xs text-gray-600 text-center">
        Assicurati di aver inserito DOB e matricola nella scheda Rosa prima di stampare
      </p>
    </div>
  );
}
