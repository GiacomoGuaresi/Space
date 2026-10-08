# Space

Piccolo gioco di esplorazione spaziale in tempo reale, nello spirito di OGame, che si gioca dal browser. Lo spazio è una griglia infinita di **settori a tre coordinate**: ogni settore genera da solo, a partire dalle coordinate, il corpo celeste che contiene, il suo nome e la sua grafica. La nave parte dalla base in `(0, 0, 0)`, e ogni viaggio richiede **tempo reale** e carburante.

Si esplora, si fondano basi ed estrattori che producono fino a riempire il magazzino, si fanno i giri di raccolta e si potenzia la nave, che è il centro della progressione. Le ricerche sbloccano strutture come il ponte di curvatura, che collega le basi. I rari compaiono ad anelli allontanandosi da casa. La progressione dura più di un anno e il gioco non finisce: ci sono solo traguardi.

> **Stato: MI completato.** Online su [giacomoguaresi.github.io/Space](https://giacomoguaresi.github.io/Space/), con la plancia ambra: striscia di stato in cima, barra Ponte · Mappa · Altro in fondo. Dal **ponte** si scelgono le mete e si parte, la **mappa** mostra i settori scansionati; in Altro ci sono il **diario di bordo**, la **wiki**, il **catalogo** e le impostazioni. Prossimo: M4, risorse e prima colonia ([roadmap](doc/06-roadmap.md)).

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

`npm run icone` rigenera le icone della PWA da `public/icona.svg`; il risultato è versionato. `npm run verifica-sql` controlla che il database calcoli l'universo come il browser (doc/08). `python3 sim/economia.py` simula un anno di gioco con i valori di [doc/09](doc/09-bilanciamento.md). In sviluppo c'è anche l'osservatorio libero, su `#/osservatorio`. A ogni push su `main` il workflow [`pubblica.yml`](.github/workflows/pubblica.yml) esegue i test e pubblica su GitHub Pages.

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
| [doc/02-meccaniche.md](doc/02-meccaniche.md) | Pilastri, nave, viaggio, scanner, risorse, insediamenti, strutture, ricerche, Materia oscura |
| [doc/03-universo.md](doc/03-universo.md) | Coordinate, seed, catalogo dei corpi celesti, grafica |
| [doc/04-architettura.md](doc/04-architettura.md) | Stack, regole nel database, convivenza con le altre app |
| [doc/05-modello-dati.md](doc/05-modello-dati.md) | Tabelle previste (bozza) |
| [doc/06-roadmap.md](doc/06-roadmap.md) | Macro step e step piccoli di sviluppo |
| [doc/07-decisioni.md](doc/07-decisioni.md) | Registro delle decisioni |
| [doc/08-deploy.md](doc/08-deploy.md) | Pubblicazione, variabili, configurazione di Supabase |
| [doc/09-bilanciamento.md](doc/09-bilanciamento.md) | Formule, valori, ritmo atteso; simulazioni in [`sim/`](sim/) |
| [doc/10-ricerche.md](doc/10-ricerche.md) | Albero tecnologico (42 ricerche) |
| [doc/11-interfaccia.md](doc/11-interfaccia.md) | Interfaccia: finestre su PC, pagine sul telefono, stile, wiki, diario, pallini |
| [Q&A.md](Q&A.md) | Domande ancora aperte |
