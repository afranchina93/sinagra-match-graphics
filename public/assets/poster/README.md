# Asset grafici — FormationPoster

Posizionare qui i file grafici definitivi con i nomi esatti indicati.
L'applicazione li rileva automaticamente: finché non esistono usa il fallback CSS/SVG.

---

## Canvas di riferimento

**1080 × 1350 px** (Instagram 4:5)
Tutti gli asset devono essere prodotti in rapporto a questa dimensione.

---

## File richiesti

### `background.webp`
- **Ruolo**: sfondo completo del poster (texture, pennellate, decorazioni, castello)
- **Dimensioni**: 1080 × 1350 px
- **Formato**: WebP (preferito) o PNG
- **Trasparenza**: NON necessaria (opaco)
- **Nota**: deve includere SOLO elementi statici. Nessun testo, nessun giocatore.

---

### `pitch.webp`
- **Ruolo**: campo da calcio con eventuale prospettiva e decorazioni grafiche
- **Dimensioni**: 1080 × 685 px
  - Corrisponde alla regione `PITCH_REGION = { x: 0, y: 275, width: 1080, height: 685 }`
  - del canvas 1080 × 1350
- **Formato**: WebP (preferito) o PNG
- **Trasparenza**: SÌ (PNG-24 o WebP con alpha)
  - L'area intorno al campo deve essere trasparente
  - così lo sfondo background.webp è visibile intorno al campo
- **Nota prospettiva**:
  - Se il campo ha una prospettiva trapezoidale, comunicare le coordinate
    della "zona di gioco effettiva" (dove vengono posizionati i giocatori)
    in modo da aggiornare `PITCH_REGION` e/o `slotToAbsPx()` in `poster-config.ts`

---

### `player-shirt.png`
- **Ruolo**: maglia giocatore di movimento (difensori, centrocampisti, attaccanti)
- **Dimensioni**: 72 × 78 px (oppure multiplo 2×: 144 × 156 px per display HiDPI)
- **Formato**: PNG-24 con alpha
- **Trasparenza**: SÌ (sfondo trasparente)
- **Nota**: il numero verrà sovrapposto dinamicamente via HTML/CSS.
  Lasciare area centrale del petto libera o con placeholder visibile.

---

### `goalkeeper-shirt.png`
- **Ruolo**: maglia portiere
- **Dimensioni**: 72 × 78 px (o 144 × 156 px per HiDPI)
- **Formato**: PNG-24 con alpha
- **Trasparenza**: SÌ
- **Nota**: stessa struttura di player-shirt.png, colore diverso.

---

## Integrazione con l'app

Le coordinate sono gestite in `src/poster-config.ts`.

Dopo aver consegnato gli asset, se le posizioni dei giocatori non sono corrette:
1. Verificare `PITCH_REGION` (dove inizia il campo nel canvas)
2. Verificare `slotToAbsPx()` (mappatura coordinate relative → px assoluti)
3. Se il campo ha prospettiva, aggiornare `slotToAbsPx()` con la formula trapezoidale

Le coordinate dei singoli slot di formazione (es. 4-3-3) sono in `src/domain/formations.ts`
e possono essere aggiustate senza modificare la logica.
