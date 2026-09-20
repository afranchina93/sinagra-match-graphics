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

const cell = (extra = ''): React.CSSProperties => ({
  border: '1px solid black',
  padding: '2px 4px',
  fontSize: 9,
  fontFamily: 'Arial, sans-serif',
  verticalAlign: 'middle',
  ...Object.fromEntries(extra.split(';').filter(Boolean).map(s => {
    const [k, v] = s.split(':');
    return [k.trim().replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase()), v?.trim()];
  })),
});

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

interface PlayerRowProps {
  player: Player;
  marker?: 'K' | 'VK';
}

function PlayerRow({ player, marker }: PlayerRowProps) {
  const { g, m, a } = dob(player);
  return (
    <tr>
      <td style={cell('text-align:center; font-weight:bold')}>{player.number}</td>
      <td style={cell('text-align:center')}>{g}</td>
      <td style={cell('text-align:center')}>{m}</td>
      <td style={cell('text-align:center')}>{a}</td>
      <td style={cell('font-weight:bold; text-transform:uppercase')}>
        {player.lastName} {player.firstName}
      </td>
      <td style={cell('text-align:center; font-weight:bold')}>{marker ?? ''}</td>
      <td style={cell('text-align:center')}>{player.matricola ?? ''}</td>
      <td style={cell()}></td>
      <td style={cell()}></td>
      <td style={cell()}></td>
    </tr>
  );
}

function EmptyRow({ label }: { label?: string }) {
  return (
    <tr>
      <td style={cell('text-align:center; font-weight:bold; color:#999')}>{label ?? ''}</td>
      <td style={cell()}></td>
      <td style={cell()}></td>
      <td style={cell()}></td>
      <td style={cell()}></td>
      <td style={cell()}></td>
      <td style={cell()}></td>
      <td style={cell()}></td>
      <td style={cell()}></td>
      <td style={cell()}></td>
    </tr>
  );
}

function SeparatorRow() {
  return (
    <tr>
      <td colSpan={10} style={{ height: 6, backgroundColor: '#eee', border: '1px solid black' }} />
    </tr>
  );
}

export function DistintaSheet({ match, view, players, competition, opponentName, clubConfig }: DistintaSheetProps) {
  const markers = match.distintaMarkers ?? {};

  const getPlayer = (id: string) => players.find(p => p.id === id);

  const starterIds = Object.values(view.starters).filter(Boolean);
  const benchIds = view.bench.filter(Boolean);

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
      fontFamily: 'Arial, sans-serif',
      fontSize: 9,
      padding: '12mm 10mm',
      width: '210mm',
      minHeight: '297mm',
      boxSizing: 'border-box',
    }}>

      {/* HEADER */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
        <tbody>
          <tr>
            <td style={{ width: 60, textAlign: 'center', border: '1px solid black', padding: 4 }}>
              <SinagraLogo size={48} />
            </td>
            <td style={{ textAlign: 'center', border: '1px solid black', padding: 4 }}>
              <div style={{ fontSize: 16, fontWeight: 'bold', letterSpacing: 1 }}>
                F.I.G.C. LEGA NAZIONALE DILETTANTI
              </div>
              <div style={{ fontSize: 11, fontWeight: 'bold', marginTop: 4 }}>
                {cc.clubFullName} MATR. {cc.matricola}
              </div>
              <div style={{ fontSize: 9, color: '#555' }}>(denominazione società)</div>
            </td>
            <td style={{ width: 60, textAlign: 'center', border: '1px solid black', padding: 4 }}>
              {/* LND placeholder */}
              <div style={{ fontSize: 7, fontWeight: 'bold', textAlign: 'center', lineHeight: 1.2 }}>
                LND<br/>LEGA NAZ.<br/>DIL.
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Match info */}
      <div style={{ border: '1px solid black', borderTop: 'none', padding: '3px 6px', marginBottom: 4 }}>
        <div style={{ fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase' }}>{competition}</div>
        <div style={{ fontSize: 9 }}>
          DISTINTA DEI GIOCATORI PARTECIPANTI ALLA GARA:{' '}
          <strong>{homeTeam} - {awayTeam}</strong>
        </div>
        {(dateStr || timeStr || stadioStr) && (
          <div style={{ fontSize: 9 }}>
            DA DISPUTARE IL {dateStr} {timeStr}{stadioStr}
          </div>
        )}
      </div>

      {/* Player table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 4 }}>
        <thead>
          <tr>
            <th rowSpan={2} style={cell('text-align:center; background:#f0f0f0; width:28px')}>N°</th>
            <th colSpan={3} style={cell('text-align:center; background:#f0f0f0; white-space:nowrap')}>
              DATA DI NASCITA
            </th>
            <th rowSpan={2} style={cell('text-align:center; background:#f0f0f0')}>COGNOME E NOME</th>
            <th rowSpan={2} style={cell('text-align:center; background:#f0f0f0; width:32px')}>C/VK</th>
            <th rowSpan={2} style={cell('text-align:center; background:#f0f0f0; width:60px')}>N°MATRICOLA</th>
            <th colSpan={3} style={cell('text-align:center; background:#f0f0f0')}>
              DOCUMENTO DI IDENTIFICAZIONE
            </th>
          </tr>
          <tr>
            <th style={cell('text-align:center; background:#f0f0f0; width:20px')}>G</th>
            <th style={cell('text-align:center; background:#f0f0f0; width:20px')}>M</th>
            <th style={cell('text-align:center; background:#f0f0f0; width:20px')}>A</th>
            <th style={cell('text-align:center; background:#f0f0f0; width:36px')}>TIPO</th>
            <th style={cell('text-align:center; background:#f0f0f0; width:60px')}>NUMERO</th>
            <th style={cell('text-align:center; background:#f0f0f0; width:60px')}>RILASCIATO</th>
          </tr>
        </thead>
        <tbody>
          {/* Titolari */}
          {starterIds.map(id => {
            const p = getPlayer(id);
            if (!p) return null;
            return <PlayerRow key={id} player={p} marker={markers[id]} />;
          })}
          {/* Righe vuote titolari fino a 11 */}
          {Array.from({ length: Math.max(0, 11 - starterIds.length) }).map((_, i) => (
            <EmptyRow key={`e-s-${i}`} />
          ))}

          {/* Separatore panchina */}
          <SeparatorRow />

          {/* Panchina */}
          {benchIds.map(id => {
            const p = getPlayer(id);
            if (!p) return null;
            return <PlayerRow key={id} player={p} marker={markers[id]} />;
          })}
          {/* Righe vuote panchina fino a 9 */}
          {Array.from({ length: Math.max(0, 9 - benchIds.length) }).map((_, i) => (
            <EmptyRow key={`e-b-${i}`} />
          ))}
        </tbody>
      </table>

      {/* STAFF */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 4 }}>
        <tbody>
          {/* Dirigente accompagnatore */}
          <tr>
            <td style={cell('width:180px')}>Dirigente accompagnatore ufficiale della Squadra:</td>
            <td style={cell('font-weight:bold; text-transform:uppercase')}>{cc.dirigente.name ?? ''}</td>
          </tr>
          <tr>
            <td style={cell()}>Doc. Identità:</td>
            <td style={cell()}>{cc.dirigente.docIdentity ?? ''}</td>
          </tr>

          {/* Dirigente addetto gara */}
          <tr>
            <td style={cell()}>Dirigente addetto ufficiali di Gara:</td>
            <td style={{ ...cell(), display: 'flex', gap: 8 }}>
              <span style={{ fontWeight: 'bold', textTransform: 'uppercase', flex: 1 }}>
                {cc.direttoreGara.name ?? ''}
              </span>
              <span style={{ whiteSpace: 'nowrap' }}>
                Tessera Impersonale FIGC n°:{' '}
                <span style={{ display: 'inline-block', border: '1px solid black', width: 60, height: 12 }} />
              </span>
            </td>
          </tr>
          <tr>
            <td style={cell()}>Doc. Identità:</td>
            <td style={cell()}>{cc.direttoreGara.docIdentity ?? ''}</td>
          </tr>

          {/* Allenatore */}
          <tr>
            <td style={cell()}>Allenatore:</td>
            <td style={cell()}>
              <span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{cc.allenatore.name ?? ''}</span>
              {cc.allenatore.matricola && (
                <span style={{ marginLeft: 16 }}>Matricola tecnico: <strong>{cc.allenatore.matricola}</strong></span>
              )}
            </td>
          </tr>
          <tr>
            <td style={cell()}>Doc. Identità:</td>
            <td style={cell()}>{cc.allenatore.docIdentity ?? ''}</td>
          </tr>

          {/* Medico */}
          <tr>
            <td style={cell()}>Medico Sociale:</td>
            <td style={cell()}>
              <span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{cc.medicoSociale.name ?? ''}</span>
              {(cc.medicoSociale.tesseraFIGC !== undefined) && (
                <span style={{ marginLeft: 16 }}>
                  Tessera FIGC n°: <strong>{cc.medicoSociale.tesseraFIGC ?? ''}</strong>
                </span>
              )}
            </td>
          </tr>
          <tr>
            <td style={cell()}>Doc. Identità:</td>
            <td style={cell()}>{cc.medicoSociale.docIdentity ?? ''}</td>
          </tr>

          {/* Collaboratore */}
          <tr>
            <td style={cell()}>Collaboratore:</td>
            <td style={cell()}>
              <span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{cc.collaboratore.name ?? ''}</span>
              {cc.collaboratore.matricola && (
                <span style={{ marginLeft: 16 }}>Matricola: <strong>{cc.collaboratore.matricola}</strong></span>
              )}
            </td>
          </tr>
          <tr>
            <td style={cell()}>Doc. Identità:</td>
            <td style={cell()}>{cc.collaboratore.docIdentity ?? ''}</td>
          </tr>
        </tbody>
      </table>

      {/* Dirigenti Forza Pubblica */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 4 }}>
        <tbody>
          <tr>
            <td colSpan={4} style={cell('font-weight:bold')}>
              Dirigenti Addetti al Servizio Sostitutivo di Forza Pubblica
            </td>
          </tr>
          {cc.dirigentiForza.map((df, i) => (
            <tr key={i}>
              <td style={cell('width:28px')}>Sig:</td>
              <td style={cell('font-weight:bold; text-transform:uppercase; width:180px')}>
                {df.name ?? ''}
              </td>
              <td style={cell('width:80px; text-align:right')}>Doc. Identità:</td>
              <td style={cell()}>{df.docIdentity ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer firme */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
        <tbody>
          <tr>
            <td style={{ ...cell(), width: '50%', paddingTop: 20 }}>
              V° L&apos;arbitro
              <div style={{ borderTop: '1px solid black', marginTop: 16, paddingTop: 2 }} />
            </td>
            <td style={{ ...cell(), paddingTop: 20, textAlign: 'right' }}>
              Il Dirigente Accompagnatore Ufficiale
              <div style={{ borderTop: '1px solid black', marginTop: 16, paddingTop: 2 }} />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
