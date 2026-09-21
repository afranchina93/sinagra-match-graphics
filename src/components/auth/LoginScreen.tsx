import { useState } from 'react';
import { supabase } from '../../storage/supabaseClient';
import { AppIcon } from '../ui/AppIcon';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-app-canvas text-app-text font-body flex flex-col justify-between px-5 pb-8 pt-safe-top pt-7">

      <div>
        {/* Logo header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded border border-app-signal/50 text-app-signal font-condensed font-bold text-lg">
              S
            </div>
            <div>
              <div className="font-condensed text-[16px] font-bold uppercase leading-[0.9] tracking-[0.08em]">
                Sinagra Match<br />Graphics
              </div>
              <div className="mt-1 text-[8px] uppercase tracking-[0.12em] text-app-muted">
                match-day workspace
              </div>
            </div>
          </div>
        </div>

        {/* Hero */}
        <div className="mt-16">
          <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-app-signal mb-4">
            ASD Sinagra · Sicilia
          </div>
          <h1 className="font-condensed text-[52px] font-bold uppercase leading-[0.8] tracking-[-0.02em]">
            Gioca<br />la tua<br /><span className="text-app-signal">partita.</span>
          </h1>
          <p className="mt-5 max-w-[280px] text-[13px] leading-[1.55] text-app-muted">
            Documenti ufficiali, formazioni e grafiche pronte. Tutto quello che serve, a bordo campo.
          </p>
        </div>

        {/* Form */}
        <form className="mt-10 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-[9px] uppercase tracking-[0.14em] text-app-muted">
              Email
            </span>
            <input
              className="h-12 w-full rounded-md border border-white/10 bg-app-surface px-3 text-[13px] text-app-text outline-none focus:border-app-signal/60 transition-colors"
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@asdsinagra.it"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[9px] uppercase tracking-[0.14em] text-app-muted">
              Password
            </span>
            <span className="relative block">
              <input
                className="h-12 w-full rounded-md border border-white/10 bg-app-surface px-3 pr-12 text-[13px] text-app-text outline-none focus:border-app-signal/60 transition-colors"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                aria-label="Mostra password"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center text-app-muted hover:text-app-text transition-colors"
              >
                <AppIcon name="eye" size={16} />
              </button>
            </span>
          </label>

          {error && (
            <p className="text-[12px] text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full inline-flex min-h-[48px] items-center justify-center gap-2 rounded-md bg-app-signal text-[#111111] text-[13px] font-bold tracking-[-0.01em] transition-colors hover:bg-[#ffd740] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <AppIcon name="spinner" size={16} className="animate-spin" />
            ) : (
              <AppIcon name="lock" size={14} />
            )}
            {loading ? 'Accesso in corso…' : 'Entra nel workspace'}
          </button>
        </form>
      </div>

      <p className="text-[9px] uppercase tracking-[0.1em] leading-[1.7] text-app-dim mt-8">
        <strong className="text-app-muted">Accesso riservato</strong><br />
        Solo per lo staff autorizzato di ASD Sinagra.
      </p>
    </div>
  );
}
