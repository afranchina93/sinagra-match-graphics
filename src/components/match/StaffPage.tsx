import { useState } from 'react';
import { AppIcon } from '../ui/AppIcon';
import type { StaffPerson } from '../../domain/types';

interface StaffPageProps {
  person: StaffPerson;
  onBack: () => void;
  onUpsert: (p: Omit<StaffPerson, 'id'> & { id?: string }) => Promise<StaffPerson>;
}

const STAFF_ROLES: { value: string; label: string }[] = [
  { value: 'allenatore',     label: 'Allenatore' },
  { value: 'direttore_gara', label: 'Dir. addetto gara' },
  { value: 'dirigente',      label: 'Dirigente' },
  { value: 'medico_sociale', label: 'Medico Sociale' },
  { value: 'collaboratore',  label: 'Collaboratore' },
  { value: 'forza_pubblica', label: 'Forza Pubblica' },
];

const roleLabel = (role: string) =>
  STAFF_ROLES.find(r => r.value === role)?.label ?? role;

const inputCls =
  'w-full bg-app-surface border border-white/10 text-app-text text-[13px] rounded-md px-3 py-2.5 focus:outline-none focus:border-app-signal/60 transition-colors';
const labelCls = 'block text-[9px] uppercase tracking-[0.14em] text-app-muted mb-1.5';

export function StaffPage({ person, onBack, onUpsert }: StaffPageProps) {
  const [fields, setFields] = useState({
    role: person.role,
    dob: person.dateOfBirth ?? '',
    matricola: person.matricola ?? '',
    docIdentity: person.docIdentity ?? '',
    tesseraFIGC: person.tesseraFIGC ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await onUpsert({
        id: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
        role: fields.role,
        dateOfBirth: fields.dob || undefined,
        matricola: fields.matricola || undefined,
        docIdentity: fields.docIdentity || undefined,
        tesseraFIGC: fields.tesseraFIGC || undefined,
        active: person.active,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  }

  function handleBlur() {
    save();
  }

  return (
    <div className="space-y-5">
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[12px] text-app-muted hover:text-app-text transition-colors"
        >
          <AppIcon name="arrow-left" size={14} />
          Rosa
        </button>
      </div>

      {/* Staff card */}
      <div className="bg-app-surface border border-white/10 rounded-lg p-4 flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-app-raised border border-white/10 flex items-center justify-center shrink-0">
          <AppIcon name="user" size={22} className="text-app-muted" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-condensed text-[17px] font-bold text-app-text uppercase truncate">
            {person.lastName} {person.firstName}
          </h2>
          <span className="text-[12px] text-purple-400">{roleLabel(person.role)}</span>
        </div>
        {saved && (
          <span className="text-[11px] text-app-signal flex items-center gap-1">
            <AppIcon name="check" size={12} /> Salvato
          </span>
        )}
      </div>

      {/* Editable fields */}
      <div className="space-y-4">
        <h3 className="font-condensed text-[13px] font-bold uppercase text-app-text border-b border-white/10 pb-2">
          Dati personali
        </h3>

        <div>
          <label className={labelCls}>Ruolo</label>
          <select
            className={inputCls}
            value={fields.role}
            onChange={e => setFields(f => ({ ...f, role: e.target.value }))}
            onBlur={handleBlur}
          >
            {STAFF_ROLES.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Data nascita (GG/MM/AA)</label>
            <input
              className={inputCls}
              type="text"
              placeholder="es. 15/04/75"
              value={fields.dob}
              onChange={e => setFields(f => ({ ...f, dob: e.target.value }))}
              onBlur={handleBlur}
            />
          </div>
          <div>
            <label className={labelCls}>N° Matricola FIGC</label>
            <input
              className={inputCls}
              type="text"
              placeholder="es. 112403"
              value={fields.matricola}
              onChange={e => setFields(f => ({ ...f, matricola: e.target.value }))}
              onBlur={handleBlur}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>N° Carta d&apos;identità</label>
            <input
              className={inputCls}
              type="text"
              placeholder="es. CA15790TF"
              value={fields.docIdentity}
              onChange={e => setFields(f => ({ ...f, docIdentity: e.target.value }))}
              onBlur={handleBlur}
            />
          </div>
          <div>
            <label className={labelCls}>Tessera FIGC n°</label>
            <input
              className={inputCls}
              type="text"
              placeholder="n° tessera"
              value={fields.tesseraFIGC}
              onChange={e => setFields(f => ({ ...f, tesseraFIGC: e.target.value }))}
              onBlur={handleBlur}
            />
          </div>
        </div>
      </div>

      {saving && (
        <p className="text-[11px] text-app-dim flex items-center gap-1.5">
          <AppIcon name="spinner" size={12} className="animate-spin" />
          Salvataggio...
        </p>
      )}
    </div>
  );
}
