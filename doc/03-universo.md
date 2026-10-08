# 03 · Universo

## Coordinate

- Un settore è `(x, y, z)`, tre interi con segno.
- L'universo è **infinito** in pratica (interi a 32 bit). La **base** è in `(0, 0, 0)`.
- **Un corpo per settore**: un sistema planetario conta come corpo unico.

## Seed

```
seed = hash(seedUniverso, x, y, z)   → intero a 32 bit senza segno
```

- `hash` è una funzione di mescolamento di interi (tipo *splitmix32*), scritta da noi in TypeScript e **identica in SQL**, così il database può verificare cosa c'è in un settore (risorse, colonizzabilità).
- Dal seed si ricava un generatore pseudo-casuale (tipo *mulberry32*). Tipo, sottotipo, ricchezza, nome e grafica leggono da lì in un ordine fisso. **Mai `Math.random()`.**
- `seedUniverso` è una costante: cambiarla vuol dire un universo nuovo.
- I test fissano alcuni settori noti, così un cambiamento involontario si vede subito.

## Distanza dall'origine

Allontanandosi dalla base, i corpi rari diventano **più frequenti** e tutti i corpi **più ricchi**. La curva è da definire ([Q&A](../Q&A.md)): vicino alla base ci sono soprattutto corpi comuni, lontano anche i rari e i leggendari.

## Catalogo dei corpi celesti

| # | Corpo | Rarità | Risorse | Colonia | Effetto | Grafica |
|---|---|---|---|---|---|---|
| 0 | **Vuoto** | ~90 % | — | — | — | campo di stelle, polvere |
| 1 | **Campo di asteroidi** | comune | Metallo, Silicio | estrattore | — | rocce a rumore in rotazione |
| 2 | **Nebulosa** | comune | Idrogeno | raccoglitore di gas | scanner ridotto | volumi di rumore colorato |
| 3 | **Stella solitaria** | comune | — | — | ricarica più veloce | sfera con corona, colore dalla classe (rossa → blu) |
| 4 | **Sistema planetario** | non comune | dai pianeti | **colonia vera** | — | stella e pianeti in orbita con atmosfera |
| 5 | **Gigante gassoso errante** | non comune | Idrogeno, Ghiaccio | raccoglitore di gas | — | pianeta a bande |
| 6 | **Cometa** | non comune | Ghiaccio | — | raccolta una tantum | nucleo e coda |
| 7 | **Pulsar** | rara | Terre rare | estrattore | scanner doppio | punto brillante con fasci rotanti |
| 8 | **Buco nero** | rara | Materia oscura (poca) | — | fionda | disco di accrescimento, lente gravitazionale |
| 9 | **Relitto alieno** | rara | Materia oscura, bottino | — | saccheggio una tantum | relitto illuminato |
| 10 | **Wormhole** | leggendaria | — | — | porta in un settore lontano | tunnel distorto |

### Sottotipi

- **Stella solitaria** e **sistema planetario**: classe della stella (nana rossa, gialla, bianca, gigante blu), che cambia colore, dimensioni e ricchezza.
- **Sistema planetario**: da 1 a N pianeti, ognuno con un tipo (roccioso, oceanico, ghiacciato, gassoso) che decide le risorse. La colonia sorge sul pianeta migliore.
- **Nebulosa**: colore e densità.
- **Wormhole**: il settore di uscita deriva dal seed. Il collegamento vale nei due sensi? Da decidere ([Q&A](../Q&A.md)).

## Nomi

- Generati dal seed, con schemi diversi per tipo: nomi "pronunciabili" per stelle e sistemi, sigle di catalogo per pulsar e buchi neri (es. `PSR-4821`), nomi evocativi per relitti e wormhole.
- Il nome generato è quello ufficiale.

## Grafica

- **three.js** con shader GLSL procedurali (rumore, gradienti, particelle).
- Un **generatore per corpo**, che riceve solo il seed: lo stesso settore appare sempre uguale.
- Uno sfondo comune per tutti i settori (campo di stelle, polvere), anch'esso seminato.
- Attenzione al telefono: qualità ridotta automaticamente se il dispositivo fatica.
