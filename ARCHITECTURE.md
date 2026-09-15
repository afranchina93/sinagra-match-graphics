# Sinagra Match Graphics — Documentazione Tecnica

## Panoramica

Applicazione web per generare grafiche di formazione (poster 1080×1350 px, formato Instagram 4:5) per l'ASD Sinagra. Permette di configurare la partita, selezionare la formazione e i giocatori, e scaricare il poster come PNG.

**Stack:** React + TypeScript + Vite · Tailwind CSS · Supabase (PostgreSQL + Storage) · Vercel

---

## Struttura del progetto

```
src/
├── App.tsx                        # Root: state globale, routing tab, autosave
├── poster-config.ts               # Geometria canvas 1080×1350 e campo prospettico
│
├── domain/
│   ├── types.ts                   # Tutti i tipi TypeScript
│   ├── formations.ts              # Definizione slot per ogni modulo tattico
│   ├── formationEngine.ts         # Calcolo coordinate assolute dei marker
│   └── roster.ts                  # Dati statici legacy (non usato in produzione)
│
├── storage/
│   ├── supabaseClient.ts          # Singleton client Supabase
│   ├── db.ts                      # CRUD completo verso Supabase
│   └── localStorage.ts            # Solo currentMatchId (cache locale)
│
├── components/
│   ├── graphics/
│   │   └── FormationPoster.tsx    # Poster SVG/HTML (canvas fisso 1080×1350)
│   └── match/
│       ├── MatchList.tsx          # Lista storico partite
│       ├── MatchForm.tsx          # Form configurazione partita
│       ├── LineupSelector.tsx     # Selezione titolari e panchina
│       └── RosterManager.tsx      # CRUD rosa giocatori
│
├── export/
│   └── exportImage.ts             # html2canvas → PNG download
│
public/assets/poster/
├── background.webp                # Sfondo 1080×1350
├── pitch.png                      # Campo prospettico 1080×685 (con sponsor)
├── player-shirt.png               # Maglia giocatore di movimento
├── goalkeeper-shirt.png           # Maglia portiere
├── sinagra-logo.png               # Stemma club
└── footer-panel.png               # Pannello footer pennellato

supabase/
└── migration.sql                  # Schema DB completo + seed dati iniziali
```

---

## Database Supabase

### Schema (6 tabelle)

```
teams              — squadre avversarie (nome + logo)
players            — rosa Sinagra (numero, nome, ruolo, active)
competitions       — campionati/coppe
matches            — partite (FK → teams, competitions)
match_starters     — titolari: (match_id, slot_id) → player_id
match_bench        — panchina: (match_id, player_id, sort_order)
```

### Relazioni

```
matches.opponent_id    → teams.id
matches.competition_id → competitions.id
match_starters.match_id → matches.id  (ON DELETE CASCADE)
match_starters.player_id → players.id
match_bench.match_id    → matches.id  (ON DELETE CASCADE)
match_bench.player_id   → players.id
```

### RLS

Tutte le tabelle hanno RLS abilitato con policy `for all using (true)` — accesso pubblico in lettura/scrittura. L'app è single-user (nessuna autenticazione).

### Storage

Bucket `logos` (public) per i loghi delle squadre avversarie.
- Path file: `{teamId}.{ext}` (es. `uuid-del-team.png`)
- URL pubblico restituito da `getPublicUrl()` e salvato in `teams.logo_url`

---

## Migration SQL

Per applicare lo schema su un nuovo progetto Supabase, eseguire `supabase/migration.sql` nell'SQL Editor:

```sql
-- Contenuto completo in supabase/migration.sql
-- 1. Drop tabella legacy app_state (se presente)
-- 2. Crea le 6 tabelle con chiavi primarie UUID
-- 3. Abilita RLS + policy pubbliche
-- 4. Crea bucket Storage "logos" con policy pubbliche
-- 5. Seed: 1 competizione + 26 giocatori
```

> **Nota:** lo script è idempotente per competitions (ON CONFLICT DO NOTHING) e per il bucket (ON CONFLICT DO NOTHING), ma le tabelle vanno create su un DB vuoto. In caso di reset completo, eseguire prima `DROP TABLE ... CASCADE` sulle tabelle esistenti.

---

## Variabili d'ambiente

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

- File locale: `.env.local` (gitignored)
- Produzione: impostare su Vercel → Settings → Environment Variables

---

## Flusso dati (`App.tsx`)

```
Mount
  └─ Promise.all([loadPlayers, loadTeams, loadCompetitions, loadMatches])
       └─ setState → rendering

Selezione partita
  └─ loadMatchView(id) → MatchView { match, opponent, starters, bench }

Autosave (debounce 1.5s)
  └─ su ogni cambio di currentView →
       updateMatch(match) + saveMatchLineup(id, starters, bench)
       [saltato durante il caricamento iniziale via isInitialLoad ref]

Cambio modulo
  └─ setMatch() rileva v.match.formation !== match.formation
       → filtra starters rimuovendo slot non presenti nel nuovo modulo
```

---

## Tipi principali (`src/domain/types.ts`)

```typescript
// Entità DB
interface Player      { id, number, firstName, lastName, role, active }
interface Team        { id, name, logoUrl }
interface Competition { id, name, season }
interface Match       { id, opponentId, isHome, matchDate, competitionId,
                        matchday, formation, stadium, coach, createdAt, updatedAt }
interface MatchView   { match, opponent, starters: Record<slotId, playerId>, bench: string[] }

// Usati da FormationPoster (invariati)
interface MatchConfig { opponent, isHome, date, competition, matchday,
                        formation, stadium, opponentLogo? }
interface Lineup      { starters: Record<slotId, playerId>, bench: string[], coach }
```

---

## Geometria del poster (`src/poster-config.ts`)

### Canvas fisso: 1080 × 1350 px

```
0    ┌──────────────────┐
     │  HEADER          │  h: 245 (logo + matchday)
245  ├──────────────────┤
     │  TITLE           │  h: 60  ("LINE UP")
305  ├──────────────────┤
     │                  │
     │  PITCH  1080×820 │  h: 820
     │                  │
1125 ├──────────────────┤
     │  BENCH + COACH   │  h: 225
1350 └──────────────────┘
```

### Campo prospettico (`PITCH_VERTICES`)

Il file `pitch.png` (1080×685) contiene il campo con prospettiva. I vertici della superficie di gioco (in coordinate file PNG) sono:

```typescript
PITCH_VERTICES = {
  TL: { x: 252, y: 52  },   // top-left
  TR: { x: 820, y: 52  },   // top-right
  BL: { x: 30,  y: 515 },   // bottom-left
  BR: { x: 1041, y: 515 },  // bottom-right
}
```

> I valori BL/BR `y=515` tengono conto delle tavole pubblicitarie degli sponsor presenti nella parte bassa del `pitch.png` (BORRELLO al centro, LA DISTRIBUZIONE a sinistra, AUTO TINDIGLIA a destra). I giocatori vengono posizionati sopra la linea di fondo reale del campo, non sopra le tavole.

### Conversione slot → pixel canvas

Il `formationEngine` calcola le coordinate assolute di ogni slot tramite interpolazione bilineare dei 4 vertici PITCH_VERTICES. Le coordinate relative `(rx, ry) ∈ [0,1]²` vengono trasformate considerando la scalatura `PITCH_IMG_H/685` e l'offset verticale `PITCH_IMG_OFFSET_Y`.

---

## Moduli tattici (`src/domain/formations.ts`)

Ogni formazione ha slot con `id` univoci e coordinate relative `(rx, ry)`:

| Modulo    | Slot IDs                                                       |
|-----------|----------------------------------------------------------------|
| 4-3-3     | gk, def1–4, mid1–3, fwd1–3                                    |
| 4-2-3-1   | gk, def1–4, mid1–5, fwd1                                      |
| 4-4-2     | gk, def1–4, mid1–4, fwd1–2                                    |
| 3-5-2     | gk, def1–3, mid1–5, fwd1–2                                    |
| 3-4-3     | gk, def1–3, mid1–4, fwd1–3                                    |
| 4-3-1-2   | gk, def1–4, mid1–4, fwd1–2                                    |
| 4-3-2-1   | gk, def1–4, mid1–5, fwd1                                      |
| 3-4-2-1   | gk, def1–3, mid1–6, fwd1                                      |
| 3-5-1-1   | gk, def1–3, mid1–6, fwd1                                      |
| 5-3-2     | gk, def1–5, mid1–3, fwd1–2                                    |
| 5-4-1     | gk, def1–5, mid1–4, fwd1                                      |

**Convenzione assi:**
- `rx`: 0 = sinistra poster, 1 = destra poster (punto di vista spettatore)
- `ry`: 0 = zona attacco, 1 = porta propria / portiere

---

## localStorage

Usato **solo** per ricordare la partita aperta tra sessioni:

```typescript
getCurrentMatchId(): string | null
setCurrentMatchId(id: string): void
clearCurrentMatchId(): void
```

Tutti gli altri dati (rosa, formazioni, partite) vengono sempre letti da Supabase.

---

## Export PNG

`exportImage.ts` usa `html2canvas` sul `div` del `FormationPoster` (dimensioni reali 1080×1350, non scalato nella preview). Il file viene scaricato come `sinagra-vs-{avversario}.png`.

---

## Deploy

- **Hosting:** Vercel (auto-deploy da push su `main`)
- **Supabase project:** `bvuewrmrtficrhyccnrp`
- **Variabili Vercel:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

Per aggiungere le variabili da CLI:
```bash
npx vercel env add VITE_SUPABASE_URL production --type config
npx vercel env add VITE_SUPABASE_ANON_KEY production --type config
```

### Accesso pubblico

Il sito è accessibile senza login. Il **Deployment Protection** di Vercel va disabilitato:
`Vercel Dashboard → progetto → Settings → Deployment Protection → Vercel Authentication → Disabled`

---

## Come aggiungere una nuova formazione

1. Aprire `src/domain/formations.ts`
2. Aggiungere una voce in `formationLayouts` con gli slot desiderati
3. Aggiungere il nome della formazione in `FORMATIONS` (`src/domain/types.ts`)

I nuovi slot ID devono seguire la convenzione esistente (`gk`, `def1`…`defN`, `mid1`…`midN`, `fwd1`…`fwdN`) per garantire la compatibilità con il filtraggio automatico al cambio di modulo.

---

## Layout responsive (mobile)

Su schermi piccoli il layout affiancato non è usabile. Soluzione adottata:

- **Mobile (< md):** il pannello controlli occupa tutto lo schermo; il pulsante grigio **"Anteprima"** (bottom bar) mostra il poster a schermo intero; **"← Torna"** (in alto a sinistra nel pannello preview) riporta ai controlli
- **Desktop (≥ md):** layout affiancato invariato; i due pulsanti sopra non vengono mostrati

Implementazione in `App.tsx`: stato `showMobilePreview: boolean` + classi Tailwind condizionali `md:flex` / `hidden`.

---

## Template Result Poster (`src/components/graphics/ResultPoster.tsx`)

Secondo template grafico 1080×1350px per i risultati delle partite.

### Background statico
`public/assets/poster/result-background.png` — foto stadio Sinagra con sfondo giallo,
pennellate rosse, montagna, tribune, fumogeni giallo-rossi, ringhiera con i 3 sponsor
(LA DISTRIBUZIONE | BORRELLO | AUTO TINDIGLIA).

### Layout (coordinate canvas px)

```
y:  22-175   ResultHeader  — MATCHDAY n / competizione / data·ora / stadio (centrato)
y: 185-295   PhaseSection  — FULL TIME o HALF TIME (FULL/HALF nero, TIME rosso, 96px)
y: 310-490   ScoreSection  — [logo+nome casa]  [2 — 1]  [logo+nome ospiti]
y: 505-680   ScorersSection — due colonne: casa sx, ospiti dx; minuto rosso, nome nero
y:1285-1335  SocialFooter  — [IG] [FB] sinagra calcio
```

### Nuovi tipi (`src/domain/types.ts`)

```typescript
export interface Scorer { minute: number; playerName: string; }
export type ResultPhase = 'HALF TIME' | 'FULL TIME';
export interface ResultConfig { phase, matchday, competition, date, stadium,
  homeTeam, awayTeam, homeLogo?, awayLogo?,
  homeGoals, awayGoals, homeScorers, awayScorers }
```

### Campi aggiuntivi in `Match`
`homeGoals`, `awayGoals`, `homeScorers[]`, `awayScorers[]`

### SQL da eseguire (una tantum su Supabase)
Vedere `supabase/migration_result.sql`:
```sql
alter table matches add column if not exists home_goals integer default 0;
alter table matches add column if not exists away_goals integer default 0;
alter table matches add column if not exists home_scorers jsonb default '[]';
alter table matches add column if not exists away_scorers jsonb default '[]';
```

### Integrazione App

- Nuova tab **Risultato** (icona Trophy) → mostra `ResultForm`
- Preview panel: mostra `ResultPoster` quando tab = 'result', altrimenti `FormationPoster`
- Toggle HALF TIME / FULL TIME (stato locale `resultPhase`) — non persistito in DB
- Export: usa `resultPreviewRef` per il poster risultato
- Autosave: campi result inclusi nel payload di `updateMatch`

### Form (`src/components/match/ResultForm.tsx`)
- Toggle HALF TIME / FULL TIME
- Contatori `[−] [n] [+]` per gol casa e ospiti
- Lista marcatori per squadra: minuto + nome, aggiunta inline, rimozione, ordinati per minuto

---

## Storico modifiche

| Data | Modifica |
|------|----------|
| 2025-07 | Setup iniziale — poster statico con localStorage |
| 2025-07 | Integrazione Supabase con JSON blob (`app_state`) |
| 2025-07 | Fix: schermata nera al primo caricamento (stato Supabase vuoto) |
| 2025-07 | Fix: cambio formazione — giocatori non selezionabili dopo switch |
| 2025-07 | Migrazione a DB relazionale (6 tabelle + Storage bucket loghi) |
| 2025-07 | Nuova UI multi-tab: Partite / Partita / Formazione / Rosa |
| 2025-07 | Sostituzione `pitch.png` con versione con tavole sponsor |
| 2025-07 | Calibrazione `PITCH_VERTICES` per tavole sponsor (BL/BR y=515) |
| 2025-07 | Fix: cambio modulo pulisce slot non validi dagli starters |
| 2025-07 | Fix build: campo `active` mancante in `roster.ts` legacy |
| 2025-07 | Layout responsive mobile con toggle anteprima |
| 2025-07 | Vercel Deployment Protection disabilitato (accesso pubblico) |
| 2026-09 | Nuovo template Result Poster (FULL TIME / HALF TIME) |
| 2026-09 | Nuovi campi Match: homeGoals, awayGoals, homeScorers, awayScorers |
| 2026-09 | Nuova tab Risultato con ResultForm e toggle fase |
