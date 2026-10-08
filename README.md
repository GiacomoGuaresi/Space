# Space

Piccolo gioco di esplorazione spaziale in tempo reale, nello spirito di OGame, che si gioca dal browser. Lo spazio è una griglia infinita di **settori a tre coordinate**: ogni settore genera da solo, a partire dalle coordinate, il corpo celeste che contiene, il suo nome e la sua grafica. La nave parte dalla base in `(0, 0, 0)`, e ogni viaggio richiede **tempo reale** e carburante.

Si esplora, si raccolgono risorse, si fondano colonie che producono fino a riempire il magazzino (poi bisogna tornare a svuotarle) e si potenziano nave e base.

> **Stato: progettazione.** Documentazione di base scritta, domande aperte in [Q&A.md](Q&A.md). Nessuna riga di codice ancora.

## In breve

- **Frontend**: Vite + React + TypeScript, sito statico installabile come PWA
- **Grafica**: three.js con shader procedurali
- **Dati e accesso**: [Supabase](https://supabase.com), stesso progetto e account delle altre app di casa, schema dedicato `space`
- **Hosting**: GitHub Pages → `giacomoguaresi.github.io/Space/`
- **Lingua**: italiano · **Costo**: 0 € · **Licenza**: MIT

## Documentazione

| Documento | Contenuto |
|---|---|
| [doc/01-visione.md](doc/01-visione.md) | Scopo, origine, principi, cosa non è |
| [doc/02-meccaniche.md](doc/02-meccaniche.md) | Viaggio, carburante, scoperte, risorse, colonie, potenziamenti |
| [doc/03-universo.md](doc/03-universo.md) | Coordinate, seed, catalogo dei corpi celesti, grafica |
| [doc/04-architettura.md](doc/04-architettura.md) | Stack, regole nel database, convivenza con le altre app |
| [doc/05-modello-dati.md](doc/05-modello-dati.md) | Tabelle previste (bozza) |
| [doc/06-roadmap.md](doc/06-roadmap.md) | Macro step di sviluppo |
| [doc/07-decisioni.md](doc/07-decisioni.md) | Registro delle decisioni |
| [Q&A.md](Q&A.md) | Domande ancora aperte |
