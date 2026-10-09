# Space

Piccolo gioco di esplorazione spaziale in tempo reale, nello spirito di OGame, che si gioca dal browser. Lo spazio è una griglia infinita di **settori a tre coordinate**: ogni settore genera da solo, a partire dalle coordinate, il corpo celeste che contiene, il suo nome e la sua grafica. La nave parte dalla base in `(0, 0, 0)`, e ogni viaggio richiede **tempo reale** e carburante.

Si esplora, si fondano basi ed estrattori che producono fino a riempire il magazzino, si fanno i giri di raccolta e si potenzia la nave, che è il centro della progressione. Le ricerche sbloccano strutture come il ponte di curvatura, che collega le basi. I rari compaiono ad anelli allontanandosi da casa. La progressione dura più di un anno e il gioco non finisce: ci sono solo traguardi.

> **Stato: M9 completato.** Online su [giacomoguaresi.github.io/Space](https://giacomoguaresi.github.io/Space/), con la plancia ambra: su PC (da 1024 px) finestre trascinabili Qui, Scanner, Rotta, Diario, Wiki e Catalogo sopra la scena o la mappa, con dock e scorciatoie da tastiera; sul telefono striscia di stato in cima e barra Ponte · Mappa · Rete · Nave · Altro in fondo. Dal **ponte** si scelgono le mete e si parte, la **mappa** mostra i settori scansionati; in Altro ci sono il **diario di bordo**, la **wiki**, il **catalogo** e le impostazioni. Si raccolgono risorse a mano e dalle comete, la base madre produce, si fonda la prima colonia e si fanno i giri di raccolta dalla **Rete**. Nel **cantiere** della base madre si potenziano motore, serbatoio, ricarica, scanner e stiva e si costruiscono le strutture, con il pieno al deposito. Nel **laboratorio** si fanno le ricerche dei quattro rami fino al gradino 6. Si fondano **estrattori** su asteroidi, nebulose, giganti e pulsar, le colonie costruiscono le loro strutture (radar compreso) e si possono abbandonare. Il **ponte di curvatura** collega le basi, le pulsar danno le **Terre rare** e i buchi neri la **Materia oscura**, che serve ad accelerare e ad attraversare i **wormhole**; i **relitti** si saccheggiano e nascondono progetti. Tutte le 42 ricerche, nodi infiniti compresi. Prossimo: M10, traguardi e rifinitura ([roadmap](doc/06-roadmap.md)).

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
