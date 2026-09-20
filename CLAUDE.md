# Sinagra Match Graphics — Note per Claude

## Database

**Supabase project:** `bvuewrmrtficrhyccnrp`
**URL diretta:** `postgresql://postgres:TTSwLZoN9imRGmp3@db.bvuewrmrtficrhyccnrp.supabase.co:5432/postgres`
**Pooler URL (fallback se la diretta non risolve):** `postgresql://postgres.bvuewrmrtficrhyccnrp:TTSwLZoN9imRGmp3@aws-0-eu-west-2.pooler.supabase.com:5432/postgres`

### Eseguire migration
```bash
npx supabase db push --db-url "postgresql://postgres:TTSwLZoN9imRGmp3@db.bvuewrmrtficrhyccnrp.supabase.co:5432/postgres" --include-all
```

## Stack
- React + TypeScript + Vite + Tailwind CSS
- Supabase (PostgreSQL) via `@supabase/supabase-js`
- `@napi-rs/canvas` per generazione immagini server-side
- Deploy su Vercel

## Struttura navigazione
- **Main tabs:** Partite | Rosa | Partita
- **Sub-tabs (sotto Partita):** Info | Formazione | Distinta | Risultato | Sostituzioni
- Preview (poster grafico) visibile solo nelle sub-tab: Formazione, Risultato, Sostituzioni
