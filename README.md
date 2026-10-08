# Space

Piccolo gioco di esplorazione spaziale in tempo reale, nello spirito di OGame, che si gioca dal browser. Lo spazio è una griglia infinita di **settori a tre coordinate**: ogni settore genera da solo, a partire dalle coordinate, il corpo celeste che contiene, il suo nome e la sua grafica. La nave parte dalla base in `(0, 0, 0)`, e ogni viaggio richiede **tempo reale** e carburante.

Si esplora, si raccolgono risorse, si fondano colonie che producono fino a riempire il magazzino (poi bisogna tornare a svuotarle) e si potenziano nave e base.

> **Stato: M0 completato.** Online su [giacomoguaresi.github.io/Space](https://giacomoguaresi.github.io/Space/), per ora solo una pagina dietro l'accesso. Domande aperte in [Q&A.md](Q&A.md).

## Per iniziare

Serve Node 22.12 o più recente; la CI usa Node 24, indicato in [`.nvmrc`](.nvmrc).

```sh
nvm use                      # o `nvm install` la prima volta
cp .env.example .env.local   # e riempi le variabili (doc/08)
npm install
npm run dev                  # http://localhost:5173/Space/
npm test
npm run build
```

`npm run icone` rigenera le icone della PWA da `public/icona.svg`; il risultato è versionato. A ogni push su `main` il workflow [`pubblica.yml`](.github/workflows/pubblica.yml) esegue i test e pubblica su GitHub Pages.

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
| [doc/08-deploy.md](doc/08-deploy.md) | Pubblicazione, variabili, configurazione di Supabase |
| [Q&A.md](Q&A.md) | Domande ancora aperte |
