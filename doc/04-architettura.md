# 04 · Architettura

## Schema generale

```mermaid
flowchart LR
  U[Browser / PWA] -->|HTML, JS statici| GP[GitHub Pages<br/>giacomoguaresi.github.io/Space]
  U -->|supabase-js + JWT| SB
  subgraph SB[Supabase · progetto di produzione di Grocery]
    AUTH[Auth · account condiviso]
    S[(schema space)]
    ALTRI[(schemi delle altre app)]
  end
  GH[GitHub Actions] -->|test, build, deploy| GP
```

## Come funziona

1. **GitHub Pages** serve solo file statici.
2. L'**universo si calcola nel browser**: seed, corpo, nome e grafica di ogni settore ([03](03-universo.md)). Per guardare lo spazio non serve nessuna chiamata.
   - Le **scansioni** sono il calcolo più pesante: allo scanner 25 una sosta è una sfera di ~1 milione di settori, ~100 mila corpi, ~0,6 s (~2,7 s con *Rilevamento gravitazionale*). Le fa un **Web Worker** (`src/dominio/scansioni.worker.ts`): lo scanner, il radar, i corpi noti della mappa e le novità del diario.
   - Gli arriva un lavoro alla volta dalla **coda** `src/ui/scansioni.ts`. Lo scanner e il radar, che si stanno guardando, hanno la priorità alta; la mappa e il diario aspettano.
   - Un lavoro chiesto più volte si fa una volta sola. Uno nuovo sullo stesso canale scarta quelli ancora in coda: la nave si è spostata. Gli ultimi risultati restano in memoria, e il worker tiene una copia delle ultime soste.
   - Intanto l'interfaccia mostra una barra di avanzamento, e lo scanner elenca i corpi 100 alla volta.
3. Il **database** conserva solo lo stato del gioco: nave, viaggi, scoperte, risorse, colonie, potenziamenti ([05](05-modello-dati.md)).
4. **Le azioni passano da funzioni Postgres** (`space.viaggia`, `space.raccogli`, `space.colonizza`, `space.potenzia`…). Le funzioni controllano le regole e scrivono il risultato; il browser non scrive mai direttamente posizione, carburante o risorse. Per sapere cosa c'è in un settore usano l'hash scritto in SQL.
5. **Tutto si calcola alla lettura, senza job programmati**: posizione della nave (arrivata se `arrivo <= now()`), carburante ricaricato, produzione delle colonie, costruzioni finite. Si salvano gli istanti di partenza e di ultima raccolta, il resto si ricava da `now()`.
6. **Row Level Security**: ognuno vede e modifica solo i propri dati. Quando arriveranno altri giocatori, gli insediamenti diventeranno condivisi ([02](02-meccaniche.md#altri-giocatori-più-avanti)) e la RLS andrà rivista.

## Convivenza con le altre app

Come Projects e Trekking:

- **Schema Postgres dedicato `space`**, aggiunto agli *Exposed schemas*; il client si crea con `db: { schema: 'space' }`.
- **Autenticazione condivisa**: stesso account delle altre app.
- **Migrazioni** in `supabase/sql/NNN_descrizione.sql`, numerate e applicate a mano. Lo storico della CLI resta a Grocery.
- **Keep-alive**: non serve.

## Stack

| Livello | Scelta | Note |
|---|---|---|
| Linguaggio | TypeScript | |
| UI | React 19 | finestre su PC, pagine sul telefono ([11](11-interfaccia.md)) |
| Finestre | react-rnd | trascinare e ridimensionare le finestre su PC |
| Build | Vite, `base: '/Space/'` | |
| Routing | hash router | |
| Stile | Tailwind CSS | plancia ambra, IBM Plex |
| Grafica | three.js + shader GLSL | generatori procedurali per corpo |
| Dati e accesso | @supabase/supabase-js | |
| PWA | vite-plugin-pwa | |
| Test | Vitest, sulla logica pura | hash, casuale, catalogo, nomi, distanze, tempi, carburante, produzione |
| CI/CD | GitHub Actions | |

## Struttura cartelle (prevista)

```
Space/
├── README.md · Q&A.md · LICENSE
├── doc/
├── src/
│   ├── dominio/          # hash, casuale, catalogo, nomi, viaggi: logica pura con test
│   ├── grafica/          # scena three.js e un generatore per corpo
│   ├── dati/             # chiamate a Supabase
│   └── pagine/
└── supabase/sql/
```
