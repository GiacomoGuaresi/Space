# 06 · Roadmap

## Come si procede

Sviluppo **agile a step piccoli**. Ogni step:

- è **piccolo**, da una a tre sessioni di lavoro, e aggiunge **una cosa sola** che si vede o si gioca;
- si chiude con test verdi, `npm run verifica-sql` (quando tocca il database), build, prova in locale, commit e push. **Il push pubblica**, quindi ogni step è un rilascio;
- **non lascia il gioco rotto**: una meccanica a metà resta nascosta o disattivata finché non è giocabile;
- aggiorna `doc/` se cambia una regola, e il registro [07](07-decisioni.md) se cambia una decisione;
- porta con sé **la sua interfaccia** ([11](11-interfaccia.md)): finestra su PC e sezione o scheda sul telefono, voci del diario, pallini, pagina della wiki, ⓘ sui valori calcolati.

I macro step (M3, M4…) raggruppano gli step per tema. Si chiudono con una riga in "Si consegna" e la documentazione allineata. Regole e numeri vengono da [02](02-meccaniche.md), [09](09-bilanciamento.md) e [10](10-ricerche.md).

## Fase 0 · Progettazione ✅
- [x] Bozza della documentazione
- [x] Catalogo dei corpi celesti e macro step
- [x] Giri di Q&A: meccaniche a lungo termine, numeri e simulazioni (giri 2-20, trasferiti il 2026-10-08)
- [x] Documentazione senza punti aperti sulle meccaniche; la sicurezza si decide step per step
- [x] Giri di UI/UX: stile, sezioni, wiki, diario e pallini, prototipo ([11](11-interfaccia.md), trasferiti il 2026-10-08)
- [x] Giri di UI per PC: plancia a finestre trascinabili, pubblico 80 % PC ([11](11-interfaccia.md#pc--plancia-a-finestre))

## M0 · Fondamenta ✅
- [x] `git init`, LICENSE MIT, repository pubblico `Space` su GitHub
- [x] GitHub Pages attivo, variabili del repository impostate
- [x] Scaffold Vite + React + TS + Tailwind, Vitest, three.js, PWA con icona
- [x] Workflow `pubblica.yml`
- [x] Accesso con l'account di casa, schema `space` creato ed esposto, URL nei redirect di Auth ([08](08-deploy.md))
- [x] Pagina provvisoria con un campo di stelle three.js

**Si consegna**: una pagina vuota online, dietro l'accesso.

## M1 · Universo e corpi celesti ✅
- [x] Hash delle coordinate e generatore casuale, con test sui settori noti (`src/dominio/casuale.ts`)
- [x] Catalogo: pesi, gradiente di distanza, sottotipi, ricchezza (`catalogo.ts`, `settore.ts`), con valori provvisori
- [x] Nomi per tipo (`nomi.ts`)
- [x] Scena three.js con bloom e sfondo comune seminato (`src/grafica/`)
- [x] Un generatore grafico per ogni corpo (11, più il vuoto)
- [x] **Osservatorio**: coordinate nell'indirizzo (`#/x,y,z`), spostamento per asse, ricerca del corpo più vicino di un tipo, scheda del corpo
- [ ] Qualità ridotta automatica sui dispositivi lenti: rimandata, da valutare provando sul telefono

**Si consegna**: l'universo si esplora a vista.

## M2 · Navigazione ✅
- [x] Nave alla base, `space.stato()` e `space.viaggia()` (`supabase/sql/002_navigazione.sql`), funzioni dell'universo in SQL identiche a quelle in TypeScript, verificate su un campione fisso (`npm run verifica-sql`)
- [x] Durata, arrivo calcolato alla lettura, conto alla rovescia corretto sull'orologio del database
- [x] Carburante: consumo, ricarica da fermi, fermata forzata
- [x] Scanner dei dintorni, come elenco dal più vicino (tipo e distanza; il nome si scopre arrivando)
- [x] Catalogo delle scoperte (`#/catalogo`), con i conti per tipo
- [x] Effetti dei corpi sulla navigazione: ricarica ×3 accanto alle stelle, scanner ridotto nelle nebulose e doppio presso le pulsar, fionda ×2 dai buchi neri
- [x] Riepilogo all'apertura e al ritorno sull'app
- [x] Scie di stelle durante il viaggio
- [x] Osservatorio solo in sviluppo (`#/osservatorio`)

**Si consegna**: il gioco di esplorazione in tempo reale.

## M3 · Navigazione ricalibrata ✅

Porta la navigazione di M2 sui valori v1 ([09](09-bilanciamento.md)).

- [x] **3.1 Valori in un posto solo**: `src/dominio/bilanciamento.ts` e `space.bilanciamento()` (`003_bilanciamento.sql`), confrontati da `verifica-sql`; il campione si rigenera con `npm run campione`. Nessun cambiamento visibile.
- [x] **3.2 Nave v1**: motore 0,25 settori/h, serbatoio 4, ricarica 0,4/h; `004_nave_v1.sql` aggiorna la nave esistente. *Si gioca: viaggi da ore, 1-2 corpi al giorno.*
- [x] **3.3 Ricarica al 50 %** fuori dalla base, 100 % in base o accanto a una stella (ricarica ×2). *Si gioca: le stelle diventano tappe.*
- [x] **3.4 Fionda v1**: ×1,5 e il 20 % dei settori percorsi gratis.
- [x] **3.5 Soglie dei rari** in `catalogo.ts` e in SQL (`005_soglie_rari.sql`), con il campione di `verifica-sql` rigenerato. *Si gioca: i rari compaiono ad anelli.*
- [x] **3.6 Scanner a livelli**: raggio 4, al livello 1 rileva solo i sistemi planetari, gli altri tipi sono invisibili anche nella rotta (livello nella colonna `nave.scanner`, fisso a 1 per ora; `006_scanner.sql`).
- [x] **3.7 Mappa dei settori scansionati** (tabella `scansione`, `007_scansione.sql`), visibile da subito: pagina `#/mappa` in 3D, si tocca un corpo e si imposta la rotta (`#/rotta/x,y,z`).

**Si consegna**: l'esplorazione con il ritmo definitivo.

## MI · Ossatura dell'interfaccia ✅

Porta l'interfaccia di M2-M3 nella struttura di [11](11-interfaccia.md), senza meccaniche nuove.

- [x] **I.1 Stile plancia**: colori ambra come variabili (`src/index.css`), IBM Plex Sans e Mono nel pacchetto (funzionano offline), componenti di base in `src/ui/plancia.tsx` (pannello, etichetta, numero abbreviato, simbolo di rarità, bottoni, ⓘ con formula). *Si vede: la plancia ambra.*
- [x] **I.2 Striscia di stato** al posto di StatoNave: luogo o rotta, conto alla rovescia, carburante con il tetto di ricarica (`StrisciaStato.tsx`), dentro la cornice comune delle pagine (`Cornice.tsx`).
- [x] **I.3 Barra in basso**: Ponte (schede Qui, Scanner, Rotta), Mappa (`#/mappa`, con forme di rarità, filtri e tasti Nave/Madre), Altro (`#/altro`: Catalogo; Impostazioni in I.5). Rete e Nave compaiono con le loro meccaniche in M4.
- [x] **I.4 Diario di bordo** al posto del riepilogo (`#/diario`, `src/ui/diario.ts`): novità evidenziate, "Già visti", 30 giorni, raggruppamento; si apre dalla striscia, da Altro e da solo all'apertura se ci sono novità. Voci di oggi: partenza, arrivo, sosta forzata, ricarica completata, corpo rilevato (rari e primo di un tipo), nuovo nel catalogo.
- [x] **I.5 Pallini** su Ponte, Mappa e Altro (`pallini.ts`); **Impostazioni** (`#/impostazioni`) con suoni sintetizzati (spenti all'inizio) e animazioni: come il sistema, ridotte o piene.
- [x] **I.6 Wiki** (`#/wiki`, `pagineWiki.tsx`): indice con le pagine chiuse e il suggerimento, Guida per ciò che esiste già (come si gioca, nave, viaggio, scanner, catalogo), Fionda gravitazionale, pagine dei corpi sbloccate alla prima rilevazione con i sottotipi coperti finché non li trovi, sezione Numeri raggiunta anche dalle ⓘ. Le pagine delle altre meccaniche arrivano con i loro step.

**Si consegna**: la plancia, pronta ad accogliere le meccaniche.

## MF · Plancia a finestre (PC) ✅

Porta l'interfaccia su PC nella [plancia a finestre](11-interfaccia.md#pc--plancia-a-finestre). Sotto i 1024 px di larghezza il telefono resta com'è, a ogni step.

- [x] **F.1 Cornice PC**: da 1024 px in su barra di stato su una riga, niente colonna centrale, dock in basso al posto della barra a schede (le voci aprono ancora le pagine di oggi). *Si vede: lo schermo intero usato.* (`schermo.ts`, `Dock.tsx`, `StrisciaStato` con `riga`)
- [x] **F.2 Finestre**: componente `Finestra` con react-rnd (titolo, trascina, ridimensiona, _ riduci nel dock, × chiudi, primo piano, dentro lo schermo). **Qui, Scanner, Rotta** diventano tre finestre; un clic nello scanner riempie la Rotta. *Si gioca: navigazione a colpo d'occhio.* (`Finestra.tsx`, `finestre.ts`; la ⓘ si apre sopra tutto, fuori dalle finestre)
- [x] **F.3 Archivio in finestra**: Diario, Wiki, Catalogo, Impostazioni come finestre; i link diretti (`#/wiki/…`, `#/rotta/…`, `#/diario`) aprono la finestra e l'indirizzo si pulisce; "Numeri ›" apre la Wiki. Pallini sulle voci del dock. (Su PC il `Ponte` ospita tutte le finestre; la Wiki in finestra ha l'indice a sinistra; dentro una finestra i pannelli perdono il bordo.)
- [x] **F.4 Mappa come sfondo**: ⇆ scena/mappa, barretta dei filtri, clic su un corpo → Rotta. (`useSfondoMappa` in `Mappa.tsx`; `#/mappa` su PC mostra la mappa dietro le finestre.)
- [x] **F.5 Memoria della disposizione** sul dispositivo, ↺ Riordina, finestre che rientrano quando lo schermo si restringe; nelle impostazioni si forza finestre o pagine. (`space_finestre` nella memoria locale, `leggiDisposizione` scarta i valori strani e aggiunge le finestre nuove.)
- [x] **F.6 Tastiera e densità**: lettere delle finestre, Tab, Esc, ? con l'elenco; bottoni compatti, tooltip al passaggio (anche ⓘ), menu col tasto destro sui corpi (`tastiera.tsx`, `MenuContesto.tsx`). Tab scambia lo sfondo solo se nessun comando ha il fuoco, per non togliere la navigazione da tastiera.
- [x] **F.7 Barra di stato completa**: ultima voce del diario con le novità, ora del server. Attività in corso e stiva in breve arrivano con M4-M5.

**Si consegna**: su PC la plancia a finestre, con tutto ciò che esiste oggi.

## M4 · Risorse e prima colonia ← *prossimo*

- [x] **4.1 Stiva per risorsa** (tabella `stiva`, sei risorse) e la **Nave** (finestra N su PC, sezione sul telefono), con la stiva; stiva in breve nella barra di stato del PC. (`008_stiva.sql`: `nave.stiva` è il livello, `space.capacita_stiva` confrontata da `verifica-sql`; `src/dominio/risorse.ts`, `SchedaNave.tsx`.)
- [ ] **4.2 Raccolta a mano**: sosta su un corpo con risorse, estrazione nel tempo fino alla stiva piena. *Si gioca: prime risorse.*
- [ ] **4.3 Comete**: raccolta una volta per giocatore (tabella `raccolto`).
- [ ] **4.4 Base madre come insediamento**: produzione delle 4 comuni nel suo magazzino, fino al tetto.
- [ ] **4.5 Raccolta di persona**: arrivando in un insediamento il magazzino passa da solo nella stiva; la **Rete** (finestra E su PC, sezione sul telefono).
- [ ] **4.6 Fondare la prima colonia** (gratis) su un sistema planetario, con il mix del pianeta. *Si gioca: il primo giro di raccolta.*
- [ ] **4.7 Fondare altre basi**, pagando dalla stiva, fino al limite di 2.
- [ ] **4.8 Eventi degli insediamenti nel diario** (pieno, fondazione) e pallino su Rete.

**Si consegna**: il ciclo esplora → fonda → raccogli.

## M5 · Cantiere e potenziamenti

- [ ] **5.1 Coda di costruzione** (tabella `costruzione`), con le ricette a gradini e il pagamento da stiva + magazzino della base.
- [ ] **5.2 Motore, serbatoio, ricarica** nel cantiere della base madre; la nave resta ferma. *Si gioca: il primo potenziamento.*
- [ ] **5.3 Stiva infinita**: 40 % della stiva, 1 h.
- [ ] **5.4 Scanner come potenziamento**: raggio e tipi a livelli alterni.
- [ ] **5.5 Livelli di produzione** degli insediamenti, nella coda della base.
- [ ] **5.6 Magazzino a livelli.**
- [ ] **5.7 Cantiere a livelli**: tempi più brevi e tetto della nave a 2 × livello.
- [ ] **5.8 Deposito carburante**: pieno istantaneo a 5 Idrogeno/unità, a livelli.

**Si consegna**: la progressione della nave.

## M6 · Laboratorio e ricerche

- [ ] **6.1 Motore delle ricerche** (tabella `ricerca`): una alla volta, nave ferma ≤ 1 h, gradino ≤ livello del laboratorio; laboratorio a livelli. Interfaccia dell'albero (finestra T su PC).
- [ ] **6.2 Ingegneria 1-4**: Automazione, Stiva modulare, Cantiere orbitale, Leghe.
- [ ] **6.3 Colonizzazione 1-4**: Astrofisica I (+2 basi), Estrattori minerari, Raccoglitori di gas, Magazzini modulari.
- [ ] **6.4 Sensori 1-4**: Scansione in volo, Spettrometria, Radar (solo lo sblocco), Telemetria.
- [ ] **6.5 Propulsione 1-2**: Raffinazione I, Iniettori.

**Si consegna**: le prime scelte nell'albero.

## M7 · Rete di basi ed estrattori

- [ ] **7.1 Estrattori** su asteroidi, nebulose e giganti, con il loro limite. *Si gioca: la rete di raccolta.*
- [ ] **7.2 Strutture nelle colonie**: magazzino e laboratorio subito, cantiere (I3) e deposito (I5) dopo la ricerca.
- [ ] **7.3 Radar** a livelli nelle basi.
- [ ] **7.4 Abbandono** di basi ed estrattori.
- [ ] **7.5 Ricerche fino al gradino 6** nei quattro rami (Astrofisica II, Riciclo, Filtri nebulari, Analisi stellare, Raffinazione II, Vele solari…).

**Si consegna**: l'infrastruttura.

## M8 · Ponte di curvatura e Terre rare

- [ ] **8.1 Ponte di curvatura** (P3): rete libera tra le basi, ×3 velocità e ⅓ carburante. *Si gioca: spostarsi nella propria rete.*
- [ ] **8.2 Terre rare**: raccolta a mano presso le pulsar, Estrattori stellari (C5).
- [ ] **8.3 Ricette fino al gradino 10-14** in gioco, con un controllo dei tempi reali contro [09](09-bilanciamento.md#ritmo-atteso).
- [ ] **8.4 Ricerche dei gradini 7-8**: Ponte risonante, Interferometria, Radar profondo, Automazione II, Estrazione profonda…

**Si consegna**: la frontiera si sposta in avanti con le basi.

## M9 · Materia oscura e rari

- [ ] **9.1 Buchi neri**: raccolta a mano, Contenimento gravitazionale (C7), estrattori di Materia oscura.
- [ ] **9.2 Fionda gravitazionale** (P6).
- [ ] **9.3 Relitti**: bottino una volta per giocatore, progetti.
- [ ] **9.4 Accelerare** viaggi, costruzioni e ricarica con la Materia oscura.
- [ ] **9.5 Wormhole**: Navigazione dei varchi (P9), 50 MO, senso unico; Sonda di varco (S9).
- [ ] **9.6 Ultime ricerche** (gradini 9-10) e i due **nodi infiniti**.

**Si consegna**: tutte le meccaniche.

## M10 · Traguardi e rifinitura

- [ ] **10.1 Traguardi** (tabella `traguardo`), medaglie (finestra G su PC, voce di Altro sul telefono), voci nel diario.
- [ ] **10.2 Rifinitura del bilanciamento** con i dati reali di gioco, aggiornando [09](09-bilanciamento.md) e `sim/`.
- [ ] **10.3 Qualità grafica ridotta** in automatico sui dispositivi lenti (rimandata da M1).

**Si consegna**: il gioco completo per un giocatore.

## Più avanti, se servirà
- Altri giocatori: insediamenti condivisi (RLS da rivedere), uso delle strutture altrui, prelievo dai magazzini altrui, eventi nel riepilogo
- Eventi e incontri
