# 03 · Universo

## Coordinate

- Un settore è `(x, y, z)`, tre interi con segno.
- L'universo è **infinito** in pratica (interi a 32 bit). La **base** è in `(0, 0, 0)`.
- **Un corpo per settore**: un sistema planetario conta come corpo unico.

## Seed

```
seed = hash(seedUniverso, x, y, z)   → intero a 32 bit senza segno
```

- `hash` è il finalizzatore di **MurmurHash3** applicato in catena alle tre coordinate, a 32 bit (`src/dominio/casuale.ts`). Dal M2 è riscritto **identico in SQL**, così il database potrà verificare cosa c'è in un settore (risorse, colonizzabilità).
- Dal seed si ricava un generatore pseudo-casuale, **Mulberry32**. Ogni parte del settore (tipo, nome, ricchezza, dettagli, grafica, sfondo) ha una sua sequenza derivata dal seed: aggiungere un dettaglio a un tipo non cambia nulla degli altri. **Mai `Math.random()`.**
- `seedUniverso` è una costante: cambiarla vuol dire un universo nuovo.
- I test fissano alcuni settori noti, così un cambiamento involontario si vede subito.

## Distanza dall'origine

Allontanandosi dalla base, i corpi rari compaiono **ad anelli** e tutti i corpi diventano **più ricchi** (valori in [09](09-bilanciamento.md#distribuzione-dei-corpi), codice in `src/dominio/catalogo.ts`):

- **un settore su dieci** non è vuoto, ovunque;
- i pesi dei comuni passano in modo lineare da quelli "vicini" a quelli "lontani", raggiunti a **500 settori** dalla base;
- ogni raro ha una **soglia** sotto la quale non esiste: pulsar da 25 settori, buchi neri e relitti da 80, wormhole da 150. Sopra la soglia il peso sale fino a 500. *Da applicare al codice ([06](06-roadmap.md)): oggi i rari compaiono subito, con peso crescente, e tutti stanno entro 30 settori;*
- la **ricchezza** media vale `1 + √(d / 100)`: ×2 a 100 settori, ×3 a 400; ogni corpo varia tra ×0,6 e ×1,4 attorno alla media.

La base, in `(0, 0, 0)`, è sempre vuota.

## Catalogo dei corpi celesti

| # | Corpo | Rarità | Risorse | Colonia | Effetto | Grafica |
|---|---|---|---|---|---|---|
| 0 | **Vuoto** | ~90 % | — | — | — | campo di stelle, polvere |
| 1 | **Campo di asteroidi** | comune | Metallo, Silicio | estrattore | — | rocce a rumore in rotazione |
| 2 | **Nebulosa** | comune | Idrogeno | raccoglitore di gas | scanner ridotto | volumi di rumore colorato |
| 3 | **Stella solitaria** | comune | — | — | ricarica al 100 % e più veloce | sfera con corona, colore dalla classe (rossa → blu) |
| 4 | **Sistema planetario** | non comune | dal pianeta della colonia | **base** | — | stella e pianeti in orbita con atmosfera |
| 5 | **Gigante gassoso errante** | non comune | Idrogeno, Ghiaccio | raccoglitore di gas | — | pianeta a bande |
| 6 | **Cometa** | non comune | Ghiaccio | — | raccolta una volta per giocatore | nucleo e coda |
| 7 | **Pulsar** | rara (da 25) | Terre rare | estrattore | scanner doppio | punto brillante con fasci rotanti |
| 8 | **Buco nero** | rara (da 80) | Materia oscura | estrattore | fionda | disco di accrescimento, lente gravitazionale |
| 9 | **Relitto alieno** | rara (da 80) | Materia oscura, risorse, progetti | — | saccheggio una volta per giocatore | relitto illuminato |
| 10 | **Wormhole** | leggendaria (da 150) | — | — | senso unico verso un settore lontano | tunnel distorto |

### Sottotipi

- **Stella solitaria** e **sistema planetario**: classe della stella (nana rossa, gialla, bianca, gigante blu), che cambia colore, dimensioni e ricchezza.
- **Sistema planetario**: da 1 a N pianeti, ognuno con un tipo (roccioso, oceanico, ghiacciato, gassoso). La colonia sorge sul pianeta migliore, e il suo tipo decide il mix di risorse ([09](09-bilanciamento.md#produzione)).
- **Nebulosa**: colore e densità.
- **Campo di asteroidi**: composizione (metallica, silicea, mista) e numero di rocce grandi.
- **Gigante gassoso**: raggio, tinta, anelli; qualche luna.
- **Pulsar**: periodo, da millisecondi a qualche secondo. **Buco nero**: massa. **Relitto**: forma (nave, stazione, sonda) ed età.
- **Wormhole**: il settore di uscita deriva dal seed, in una direzione qualsiasi, tra 300 e 1500 settori più in là. **Senso unico**: per tornare si viaggia normalmente.

## Nomi

- Generati dal seed, con schemi diversi per tipo (`src/dominio/nomi.ts`): nomi "pronunciabili" di due o tre sillabe per stelle, sistemi e giganti (*Kumion*, *Codura*); *Nebulosa di …*, *Fascia di …*, *Varco di …*; comete come `C/4073 Razux`; sigle per pulsar (`PSR J4570+99`) e buchi neri (`PV-4438`); relitti evocativi (*Relitto «Veglia Muta»*). I pianeti prendono il nome del sistema con un numero romano.
- Il nome generato è quello ufficiale.

## Grafica

- **three.js** con shader GLSL procedurali (rumore simplex, fbm, domain warping), particelle calcolate nel vertex shader e **bloom** sulle luci forti (`src/grafica/`).
- Un **generatore per corpo** (`src/grafica/corpi/`), che riceve solo il settore e un caso seminato: lo stesso settore appare sempre uguale. Si può girare attorno al corpo e zoomare; da ferma la camera gira piano.
- Uno sfondo comune per tutti i settori: campo di stelle con una fascia galattica e un velo di polvere, anch'esso seminato.
- Su schermi stretti la camera si allontana, così il corpo entra in larghezza.
- Da fare: qualità ridotta automaticamente se il dispositivo fatica.
