import type { Player, Match, MatchView } from '../../domain/types';
import type { ClubConfig } from '../../domain/distinta';
import { SinagraLogo } from '../graphics/SinagraLogo';

interface DistintaSheetProps {
  match: Match;
  view: MatchView;
  players: Player[];
  competition: string;
  opponentName: string;
  clubConfig: ClubConfig;
}

// ─── Style tokens ────────────────────────────────────────────────────────────
const FONT = 'Arial, sans-serif';
const BORDER = '1px solid #888';
const BORDER_DARK = '1px solid #333';

const base: React.CSSProperties = {
  border: BORDER,
  padding: '3px 5px',
  fontSize: 10,
  fontFamily: FONT,
  verticalAlign: 'middle',
};

const cell = (extra: React.CSSProperties = {}): React.CSSProperties => ({ ...base, ...extra });

const labelCell = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  ...base,
  backgroundColor: '#f2f2f2',
  color: '#444',
  whiteSpace: 'nowrap',
  ...extra,
});


const thCell = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  ...base,
  border: BORDER_DARK,
  backgroundColor: '#e0e0e0',
  fontWeight: 'bold',
  textAlign: 'center',
  fontSize: 9,
  ...extra,
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dob(player: Player): { g: string; m: string; a: string } {
  const raw = player.dateOfBirth ?? '';
  const parts = raw.split('/');
  return { g: parts[0] ?? '', m: parts[1] ?? '', a: parts[2] ?? '' };
}

function formatDate(isoDate: string | null): string {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── Row components ───────────────────────────────────────────────────────────

interface PlayerRowProps {
  player: Player;
  marker?: 'K' | 'VK';
  index: number;
  numberOverride?: number;
}

function PlayerRow({ player, marker, index, numberOverride }: PlayerRowProps) {
  const { g, m, a } = dob(player);
  const bg = index % 2 === 0 ? '#ffffff' : '#f7f7f7';
  const rowCell = (extra: React.CSSProperties = {}) => cell({ backgroundColor: bg, ...extra });
  const displayNumber = numberOverride ?? player.number;
  return (
    <tr>
      <td style={rowCell({ textAlign: 'center', fontWeight: 'bold' })}>{displayNumber}</td>
      <td style={rowCell({ textAlign: 'center' })}>{g}</td>
      <td style={rowCell({ textAlign: 'center' })}>{m}</td>
      <td style={rowCell({ textAlign: 'center' })}>{a}</td>
      <td style={rowCell({ fontWeight: 'bold', textTransform: 'uppercase' })}>
        {player.lastName} {player.firstName}
      </td>
      <td style={rowCell({ textAlign: 'center', fontWeight: 'bold' })}>{marker ?? ''}</td>
      <td style={rowCell({ textAlign: 'center' })}>{player.matricola ?? ''}</td>
      <td style={rowCell()}></td>
      <td style={rowCell()}></td>
      <td style={rowCell()}></td>
    </tr>
  );
}

function EmptyRow({ index }: { index: number }) {
  const bg = index % 2 === 0 ? '#ffffff' : '#f7f7f7';
  const rowCell = (extra: React.CSSProperties = {}) => cell({ backgroundColor: bg, ...extra });
  return (
    <tr>
      <td style={rowCell({ textAlign: 'center', color: '#ccc' })}></td>
      <td style={rowCell()}></td>
      <td style={rowCell()}></td>
      <td style={rowCell()}></td>
      <td style={rowCell()}></td>
      <td style={rowCell()}></td>
      <td style={rowCell()}></td>
      <td style={rowCell()}></td>
      <td style={rowCell()}></td>
      <td style={rowCell()}></td>
    </tr>
  );
}

function SeparatorRow() {
  return (
    <tr>
      <td colSpan={10} style={{
        padding: '3px 6px',
        backgroundColor: '#444',
        color: 'white',
        fontSize: 8,
        fontWeight: 'bold',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        border: BORDER_DARK,
      }}>
        Riserve
      </td>
    </tr>
  );
}

// ─── Staff info picker ────────────────────────────────────────────────────────

/** Returns the label/value to display: extra field if present, else doc identity. */
function staffInfo(
  extraLabel: string,
  extraValue: string | undefined,
  docValue: string | undefined,
): { label: string; value: string } {
  if (extraValue) return { label: extraLabel, value: extraValue };
  if (docValue) return { label: 'Doc. Identità', value: docValue };
  return { label: '', value: '' };
}

// ─── Sorting ──────────────────────────────────────────────────────────────────

function sortPlayerIds(ids: string[], players: Player[], gkId?: string, overrides: Record<string, number> = {}): string[] {
  return [...ids].sort((a, b) => {
    const pa = players.find(p => p.id === a);
    const pb = players.find(p => p.id === b);
    const aIsGk = a === gkId || pa?.role === 'goalkeeper';
    const bIsGk = b === gkId || pb?.role === 'goalkeeper';
    if (aIsGk && !bIsGk) return -1;
    if (bIsGk && !aIsGk) return 1;
    const numA = overrides[a] ?? pa?.number ?? 99;
    const numB = overrides[b] ?? pb?.number ?? 99;
    return numA - numB;
  });
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DistintaSheet({ match, view, players, competition, opponentName, clubConfig }: DistintaSheetProps) {
  const markers = match.distintaMarkers ?? {};
  const getPlayer = (id: string) => players.find(p => p.id === id);

  const gkSlotKey = Object.keys(view.starters).find(k => k.toLowerCase() === 'gk');
  const gkId = gkSlotKey ? view.starters[gkSlotKey] : undefined;

  const overrides = match.numberOverrides ?? {};
  const starterIds = sortPlayerIds(Object.values(view.starters).filter(Boolean), players, gkId, overrides);
  const benchIds = sortPlayerIds(view.bench.filter(Boolean), players, undefined, overrides);

  const homeTeam = match.isHome ? 'SINAGRA CALCIO' : (opponentName || 'AVVERSARIO');
  const awayTeam = match.isHome ? (opponentName || 'AVVERSARIO') : 'SINAGRA CALCIO';
  const dateStr = formatDate(match.matchDate);
  const timeStr = match.kickoffTime ? `ALLE ORE ${match.kickoffTime} ` : '';
  const stadioStr = match.stadium ? `PRESSO ${match.stadium.toUpperCase()}` : '';
  const cc = clubConfig;

  return (
    <div className="distinta-sheet" style={{
      backgroundColor: 'white',
      color: 'black',
      fontFamily: FONT,
      fontSize: 10,
      padding: '8mm 10mm',
      width: '210mm',
      minHeight: '297mm',
      boxSizing: 'border-box',
    }}>

      {/* ── HEADER ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 5 }}>
        <tbody>
          <tr>
            <td style={{ width: 72, textAlign: 'center', border: BORDER_DARK, padding: 6, backgroundColor: '#fafafa', verticalAlign: 'middle' }}>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <SinagraLogo size={46} />
              </div>
            </td>
            <td style={{ textAlign: 'center', border: BORDER_DARK, padding: '6px 10px', backgroundColor: '#fafafa' }}>
              <div style={{ fontSize: 13, fontWeight: 'bold', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                F.I.G.C. — Lega Nazionale Dilettanti
              </div>
              <div style={{ fontSize: 11, fontWeight: 'bold', marginTop: 4 }}>
                {cc.clubFullName}
              </div>
              <div style={{ fontSize: 10, color: '#555', marginTop: 1 }}>
                Matricola società: <strong>{cc.matricola}</strong>
              </div>
            </td>
            <td style={{ width: 72, textAlign: 'center', border: BORDER_DARK, padding: 6, backgroundColor: '#fafafa' }}>
              <img src="/lnd-logo.jpg" alt="LND" style={{ width: 52, height: 'auto', display: 'block', margin: '0 auto' }} />
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── MATCH INFO ── */}
      <div style={{
        border: BORDER_DARK,
        borderTop: 'none',
        padding: '5px 8px',
        marginBottom: 5,
        backgroundColor: '#fafafa',
      }}>
        <div style={{ fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 1 }}>{competition}</div>
        <div style={{ fontSize: 10 }}>
          Distinta dei giocatori partecipanti alla gara:{' '}
          <strong style={{ textTransform: 'uppercase' }}>{homeTeam} — {awayTeam}</strong>
        </div>
        {(dateStr || timeStr || stadioStr) && (
          <div style={{ fontSize: 10, marginTop: 1, color: '#333' }}>
            Da disputare il <strong>{dateStr}</strong> {timeStr}{stadioStr}
          </div>
        )}
      </div>

      {/* ── PLAYER TABLE ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 5, border: BORDER_DARK }}>
        <thead>
          <tr>
            <th rowSpan={2} style={thCell({ width: 30 })}>N°</th>
            <th colSpan={3} style={thCell({ whiteSpace: 'nowrap' })}>Data di Nascita</th>
            <th rowSpan={2} style={thCell()}>Cognome e Nome</th>
            <th rowSpan={2} style={thCell({ width: 36 })}>C/VK</th>
            <th rowSpan={2} style={thCell({ width: 66 })}>N° Matricola</th>
            <th colSpan={3} style={thCell()}>Documento di Identificazione</th>
          </tr>
          <tr>
            <th style={thCell({ width: 22 })}>G</th>
            <th style={thCell({ width: 22 })}>M</th>
            <th style={thCell({ width: 22 })}>A</th>
            <th style={thCell({ width: 40 })}>Tipo</th>
            <th style={thCell({ width: 66 })}>Numero</th>
            <th style={thCell({ width: 66 })}>Rilasciato</th>
          </tr>
        </thead>
        <tbody>
          {starterIds.map((id, i) => {
            const p = getPlayer(id);
            if (!p) return null;
            return <PlayerRow key={id} player={p} marker={markers[id]} index={i} numberOverride={overrides[id]} />;
          })}
          {Array.from({ length: Math.max(0, 11 - starterIds.length) }).map((_, i) => (
            <EmptyRow key={`e-s-${i}`} index={starterIds.length + i} />
          ))}

          <SeparatorRow />

          {benchIds.map((id, i) => {
            const p = getPlayer(id);
            if (!p) return null;
            return <PlayerRow key={id} player={p} marker={markers[id]} index={i} numberOverride={overrides[id]} />;
          })}
          {Array.from({ length: Math.max(0, 9 - benchIds.length) }).map((_, i) => (
            <EmptyRow key={`e-b-${i}`} index={benchIds.length + i} />
          ))}
        </tbody>
      </table>

      {/* ── STAFF ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 5, border: BORDER_DARK }}>
        <colgroup>
          <col style={{ width: '28%' }} />
          <col style={{ width: '30%' }} />
          <col style={{ width: '19%' }} />
          <col style={{ width: '23%' }} />
        </colgroup>
        <thead>
          <tr>
            <th style={thCell({ textAlign: 'left', padding: '4px 6px' })}>Ruolo</th>
            <th style={thCell({ textAlign: 'left', padding: '4px 6px' })}>Nominativo</th>
            <th style={thCell({ textAlign: 'left', padding: '4px 6px' })}>Doc. / Matricola</th>
            <th style={thCell({ textAlign: 'left', padding: '4px 6px' })}>Valore</th>
          </tr>
        </thead>
        <tbody>
          {(() => {
            const { label, value } = staffInfo('Doc. Identità', cc.dirigente.docIdentity, undefined);
            return (
              <tr>
                <td style={labelCell()}>Dirigente Accompagnatore</td>
                <td style={cell({ fontWeight: 'bold', textTransform: 'uppercase' })}>{cc.dirigente.name ?? ''}</td>
                <td style={labelCell()}>{label}</td>
                <td style={cell()}>{value}</td>
              </tr>
            );
          })()}
          {(() => {
            const { label, value } = staffInfo('Tessera Imp. FIGC n°', cc.direttoreGara.tesseraFIGC, cc.direttoreGara.docIdentity);
            return (
              <tr>
                <td style={labelCell()}>Dirigente Addetto Gara</td>
                <td style={cell({ fontWeight: 'bold', textTransform: 'uppercase' })}>{cc.direttoreGara.name ?? ''}</td>
                <td style={labelCell()}>{label || 'Tessera Imp. FIGC n°'}</td>
                <td style={cell()}>
                  {value || <span style={{ display: 'inline-block', border: '1px solid #aaa', width: 90, height: 13 }} />}
                </td>
              </tr>
            );
          })()}
          {(() => {
            const { label, value } = staffInfo('Matricola tecnico', cc.allenatore.matricola, cc.allenatore.docIdentity);
            return (
              <tr>
                <td style={labelCell()}>Allenatore</td>
                <td style={cell({ fontWeight: 'bold', textTransform: 'uppercase' })}>{cc.allenatore.name ?? ''}</td>
                <td style={labelCell()}>{label}</td>
                <td style={cell()}>{value}</td>
              </tr>
            );
          })()}
          {(() => {
            const { label, value } = staffInfo('Tessera FIGC n°', cc.medicoSociale.tesseraFIGC, cc.medicoSociale.docIdentity);
            return (
              <tr>
                <td style={labelCell()}>Medico Sociale</td>
                <td style={cell({ fontWeight: 'bold', textTransform: 'uppercase' })}>{cc.medicoSociale.name ?? ''}</td>
                <td style={labelCell()}>{label}</td>
                <td style={cell()}>{value}</td>
              </tr>
            );
          })()}
          {(() => {
            const { label, value } = staffInfo('Matricola', cc.collaboratore.matricola, cc.collaboratore.docIdentity);
            return (
              <tr>
                <td style={labelCell()}>Collaboratore</td>
                <td style={cell({ fontWeight: 'bold', textTransform: 'uppercase' })}>{cc.collaboratore.name ?? ''}</td>
                <td style={labelCell()}>{label}</td>
                <td style={cell()}>{value}</td>
              </tr>
            );
          })()}
        </tbody>
      </table>

      {/* ── FORZA PUBBLICA ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 5, border: BORDER_DARK }}>
        <colgroup>
          <col style={{ width: '28%' }} />
          <col style={{ width: '30%' }} />
          <col style={{ width: '19%' }} />
          <col style={{ width: '23%' }} />
        </colgroup>
        <thead>
          <tr>
            <th colSpan={4} style={thCell({ textAlign: 'left', padding: '4px 6px' })}>
              Dirigenti Addetti al Servizio Sostitutivo di Forza Pubblica
            </th>
          </tr>
        </thead>
        <tbody>
          {cc.dirigentiForza.map((df, i) => (
            <tr key={i}>
              <td style={labelCell()}>Sig. {i + 1}</td>
              <td style={cell({ fontWeight: 'bold', textTransform: 'uppercase' })}>{df.name ?? ''}</td>
              <td style={labelCell()}>Doc. Identità</td>
              <td style={cell()}>{df.docIdentity ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── FOOTER FIRME ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: BORDER_DARK }}>
        <tbody>
          <tr>
            <td style={{ ...cell({ width: '50%', paddingTop: 18, paddingBottom: 6 }), border: BORDER_DARK }}>
              <div style={{ fontSize: 9, color: '#555', marginBottom: 16 }}>V° L&apos;Arbitro</div>
              <div style={{ borderTop: '1px solid #555', paddingTop: 2, fontSize: 8, color: '#999', textAlign: 'center' }}>firma</div>
            </td>
            <td style={{ ...cell({ paddingTop: 18, paddingBottom: 6, textAlign: 'right' }), border: BORDER_DARK }}>
              <div style={{ fontSize: 9, color: '#555', marginBottom: 16 }}>Il Dirigente Accompagnatore Ufficiale</div>
              <div style={{ borderTop: '1px solid #555', paddingTop: 2, fontSize: 8, color: '#999', textAlign: 'center' }}>firma</div>
            </td>
          </tr>
        </tbody>
      </table>

    </div>
  );
}
