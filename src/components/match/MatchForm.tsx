import type { MatchConfig } from '../../domain/types';
import { FORMATIONS } from '../../domain/types';

interface MatchFormProps {
  config: MatchConfig;
  onChange: (config: MatchConfig) => void;
}

const labelCls = 'block text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1';
const inputCls =
  'w-full bg-gray-800 border border-gray-700 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-yellow-400 transition-colors';

export function MatchForm({ config, onChange }: MatchFormProps) {
  const set = <K extends keyof MatchConfig>(key: K, val: MatchConfig[K]) =>
    onChange({ ...config, [key]: val });

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-bold text-yellow-400 uppercase tracking-widest border-b border-gray-700 pb-2">
        Configurazione Partita
      </h2>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelCls}>Avversario</label>
          <input
            className={inputCls}
            type="text"
            placeholder="Nome avversario"
            value={config.opponent}
            onChange={(e) => set('opponent', e.target.value)}
          />
        </div>

        <div>
          <label className={labelCls}>Competizione</label>
          <input
            className={inputCls}
            type="text"
            placeholder="es. Promozione"
            value={config.competition}
            onChange={(e) => set('competition', e.target.value)}
          />
        </div>

        <div>
          <label className={labelCls}>Giornata</label>
          <input
            className={inputCls}
            type="text"
            placeholder="es. Giornata 5"
            value={config.matchday}
            onChange={(e) => set('matchday', e.target.value)}
          />
        </div>

        <div>
          <label className={labelCls}>Data e ora</label>
          <input
            className={inputCls}
            type="datetime-local"
            value={config.date}
            onChange={(e) => set('date', e.target.value)}
          />
        </div>

        <div>
          <label className={labelCls}>Modulo</label>
          <select
            className={inputCls}
            value={config.formation}
            onChange={(e) => set('formation', e.target.value)}
          >
            {FORMATIONS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        <div className="col-span-2">
          <label className={labelCls}>Stadio</label>
          <input
            className={inputCls}
            type="text"
            placeholder="es. Campo Sportivo Sinagra"
            value={config.stadium ?? ''}
            onChange={(e) => set('stadium', e.target.value)}
          />
        </div>

        <div className="col-span-2">
          <label className={labelCls}>Logo avversario (filename in /assets/logos/)</label>
          <input
            className={inputCls}
            type="text"
            placeholder="es. real-palermo.png"
            value={config.opponentLogo ?? ''}
            onChange={(e) => set('opponentLogo', e.target.value)}
          />
        </div>

        <div className="col-span-2">
          <label className={labelCls}>Sede</label>
          <div className="flex gap-3">
            {[
              { val: true, label: 'Casa' },
              { val: false, label: 'Trasferta' },
            ].map(({ val, label }) => (
              <button
                key={label}
                type="button"
                onClick={() => set('isHome', val)}
                className={`flex-1 py-2 rounded text-sm font-bold uppercase tracking-wide transition-colors ${
                  config.isHome === val
                    ? 'bg-yellow-400 text-gray-900'
                    : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-yellow-400'
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
