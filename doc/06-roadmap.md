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

## M4 · Risorse e prima colonia ✅

- [x] **4.1 Stiva per risorsa** (tabella `stiva`, sei risorse) e la **Nave** (finestra N su PC, sezione sul telefono), con la stiva; stiva in breve nella barra di stato del PC. (`008_stiva.sql`: `nave.stiva` è il livello, `space.capacita_stiva` confrontata da `verifica-sql`; `src/dominio/risorse.ts`, `SchedaNave.tsx`.)
- [x] **4.2 Raccolta a mano**: sosta su un corpo con risorse, estrazione nel tempo fino alla stiva piena. *Si gioca: prime risorse.* (`009_raccolta.sql`: ricchezza, sottotipo, pianeti e `ritmo_mano` in SQL, verificati su 240 corpi; la stiva si scrive alla partenza. Per ora solo le risorse comuni: Terre rare e Materia oscura con M8-M9.)
- [x] **4.3 Comete**: raccolta una volta per giocatore (tabella `raccolto`). (`010_comete.sql`: `space.assesta` sistema gli eventi dell'arrivo in `stato` e `viaggia`; voce del diario e riquadro in Qui.)
- [x] **4.4 Base madre come insediamento**: produzione delle 4 comuni nel suo magazzino, fino al tetto. (`011_insediamenti.sql`, `insediamenti.ts`; la base madre nasce alla prima lettura di `stato`, il magazzino si vede in Qui.)
- [x] **4.5 Raccolta di persona**: arrivando in un insediamento il magazzino passa da solo nella stiva; la **Rete** (finestra E su PC, sezione sul telefono). (`012_raccolta_di_persona.sql`: `space.preleva` all'arrivo e alla partenza, `nave.assestato`, tabella `prelievo` per il diario; `Rete.tsx`.)
- [x] **4.6 Fondare la prima colonia** (gratis) su un sistema planetario, con il mix del pianeta. *Si gioca: il primo giro di raccolta.* (`013_colonie.sql`: `space.fonda(pianeta)`, il pianeta lo sceglie il giocatore in Qui; produzione delle colonie verificata da `verifica-sql`.)
- [x] **4.7 Fondare altre basi**, pagando dalla stiva, fino al limite di 2. (`014_altre_basi.sql`; con la stiva di livello 1 la seconda base non è ancora pagabile: lo diventa potenziando la stiva in M5.)
- [x] **4.8 Eventi degli insediamenti nel diario** (pieno, fondazione) e pallino su Rete. (Anche i prelievi dai magazzini e i bottini delle comete sono nel diario.)

**Si consegna**: il ciclo esplora → fonda → raccogli.

## M5 · Cantiere e potenziamenti ✅

- [x] **5.1 Coda di costruzione** (tabella `costruzione`), con le ricette a gradini e il pagamento da stiva + magazzino della base. (`015_cantiere.sql`: `space.potenzia(lavoro)`, una coda per la nave e una per base, lavori applicati alla lettura in `assesta`; costi e tempi verificati da `verifica-sql`.)
- [x] **5.2 Motore, serbatoio, ricarica** nel cantiere della base madre; la nave resta ferma. *Si gioca: il primo potenziamento.*
- [x] **5.3 Stiva infinita**: 40 % della stiva, 1 h.
- [x] **5.4 Scanner come potenziamento**: raggio e tipi a livelli alterni.
- [x] **5.5 Livelli di produzione** degli insediamenti, nella coda della base. (La **Base**: finestra B su PC, nel dock solo da attraccati e aperta da sola all'arrivo; scheda BASE nel Ponte sul telefono. `SchedaBase.tsx`.)
- [x] **5.6 Magazzino a livelli.** (Il magazzino si chiude all'istante in cui il lavoro finisce, poi il tetto sale.)
- [x] **5.7 Cantiere a livelli**: tempi più brevi e tetto della nave a 2 × livello. (Solo nella base madre: nelle colonie arriva con la ricerca, M7.)
- [x] **5.8 Deposito carburante**: pieno istantaneo a 5 Idrogeno/unità, a livelli. (`016_deposito.sql`: `space.pieno()`, sempre fino al 100 %, Idrogeno prima dal magazzino.)

**Si consegna**: la progressione della nave.

## M6 · Laboratorio e ricerche ✅

- [x] **6.1 Motore delle ricerche** (tabella `ricerca`): una alla volta, nave ferma ≤ 1 h, gradino ≤ livello del laboratorio; laboratorio a livelli. Interfaccia dell'albero (finestra T su PC). (`017_ricerche.sql`: `space.ricerca(nodo)`, nodi in `bilanciamento.ricerche` con l'elenco `attive`; `AlberoRicerche.tsx`, voce Ricerche in Altro; laboratorio nella Base; ricerche e lavori finiti nel diario.)
- [x] **6.2 Ingegneria 1-4**: Automazione, Stiva modulare, Cantiere orbitale, Leghe. (`018_ingegneria.sql`: `space.capacita_di`, `space.con_leghe`; in TypeScript le funzioni ricevono le ricerche completate.)
- [x] **6.3 Colonizzazione 1-4**: Astrofisica I (+2 basi), Estrattori minerari, Raccoglitori di gas, Magazzini modulari. (`019_colonizzazione.sql`; Estrattori minerari e Raccoglitori di gas si ricercano già, l'effetto arriva con gli estrattori in M7.)
- [x] **6.4 Sensori 1-4**: Scansione in volo, Spettrometria, Radar (solo lo sblocco), Telemetria. (`020_sensori.sql`: con S1 `viaggia` scansiona lungo la rotta, un punto per raggio dello scanner, all'istante del passaggio.)
- [x] **6.5 Propulsione 1-2**: Raffinazione I, Iniettori. (`021_propulsione.sql`: `space.costo_pieno_di`, consumo con `quotaConsumo` in TypeScript e in `viaggia`.)

**Si consegna**: le prime scelte nell'albero.

## M7 · Rete di basi ed estrattori ✅

- [x] **7.1 Estrattori** su asteroidi, nebulose e giganti, con il loro limite. *Si gioca: la rete di raccolta.* (`022_estrattori.sql`: `space.fonda_estrattore()`, `space.estrattori_fondabili`; sblocchi e limiti in `bilanciamento.fondazione.estrattore`. Si fondano da Qui; un estrattore ha solo produzione e magazzino, e la sua produzione è verificata da `verifica-sql`.)
- [x] **7.2 Strutture nelle colonie**: magazzino e laboratorio subito, cantiere (I3) e deposito (I5) dopo la ricerca. (`023_strutture_colonie.sql`: *Deposito* ricercabile; in ogni base, non solo nella madre, il serbatoio si ricarica fino al pieno, con `Dintorni` in `navigazione.ts`. I5 è di gradino 5 e chiede Terre rare: si paga da M8.2.)
- [x] **7.3 Radar** a livelli nelle basi. (`024_radar.sql`: colonna `insediamento.radar`, si costruisce con S3 in ogni base, non negli estrattori. Il database tiene solo il livello: le bolle le ricava il browser in `useNave` con `sosteRadar`, coi tipi dello scanner della nave, e mappa, diario e pallini le vedono come le soste.)
- [x] **7.4 Abbandono** di basi ed estrattori. (`025_abbandono.sql`: `space.abbandona(id)`, dalla Rete con conferma; non la base madre, né quella dove la nave sta lavorando. La fondazione resta in `insediamento.costo`, per il rimborso di *Riciclo*, già pronto.)
- [x] **7.5 Ricerche fino al gradino 6** nei quattro rami (Astrofisica II, Riciclo, Filtri nebulari, Analisi stellare, Raffinazione II, Vele solari…). (`026_ricerche_6.sql`: attivi P3 (solo lo sblocco, il ponte arriva con 8.1), P4, P5, C5 (+2 estrattori, quelli sulle pulsar con 8.2), C6, S5, S6, I6. `space.raggio_di` e `raggioQui` danno il raggio con le ricerche. Dal gradino 5 le ricerche chiedono Terre rare: si pagano da 8.2.)

**Si consegna**: l'infrastruttura.

## M8 · Ponte di curvatura e Terre rare ✅

- [x] **8.1 Ponte di curvatura** (P3): rete libera tra le basi, ×3 velocità e ⅓ carburante. *Si gioca: spostarsi nella propria rete.* (`027_ponte.sql`: colonne `insediamento.ponte` e `viaggio.ponte`; il ponte si costruisce una volta sola, come un livello 8 di base 40, ~15 h col cantiere 1. Il viaggio da una base col ponte a un'altra ha `fattore` 3, 4 con P8 (già pronto); Rotta, Rete e diario lo mostrano.)
- [x] **8.2 Terre rare**: raccolta a mano presso le pulsar, Estrattori stellari (C5). (`028_terre_rare.sql`: `mix.pulsar`, raccolta a mano e produzione al ritmo di ogni risorsa (`ritmoRisorsa`, `space.ritmo_risorsa`); le pulsar entrano nel campione di `verifica-sql`.)
- [x] **8.3 Ricette fino al gradino 10-14** in gioco, con un controllo dei tempi reali contro [09](09-bilanciamento.md#ritmo-atteso). (Con le Terre rare di 8.2 i livelli 10-14 si pagano; `cantiere.test.ts` controlla che i tempi del codice siano quelli della simulazione ai giorni 30, 60, 90 e 180, col cantiere a ⌈livello / 2⌉, e che le ricette 10-14 stiano nella stiva di quei giorni.)
- [x] **8.4 Ricerche dei gradini 7-8**: Ponte risonante, Interferometria, Radar profondo, Automazione II, Estrazione profonda… (`029_ricerche_8.sql`: attivi P6-P8, C7-C8, S7-S8, I7-I8. P6 arriva da 9.2 perché la chiede C7; C7 dà +2 estrattori, quelli sui buchi neri con 9.1. `space.ritmo_insediamento` ora legge le ricerche del giocatore (C8), `space.con_leghe` fa tutti gli sconti. Dal gradino 8 le ricerche chiedono Materia oscura: si pagano da M9.)

**Si consegna**: la frontiera si sposta in avanti con le basi.

## M9 · Materia oscura e rari ← *prossimo*

- [x] **9.1 Buchi neri**: raccolta a mano, Contenimento gravitazionale (C7), estrattori di Materia oscura. (`030_buchi_neri.sql`: `mix.buconero`, al ritmo della Materia oscura; i buchi neri entrano nel campione di `verifica-sql`.)
- [x] **9.2 Fionda gravitazionale** (P6). (Anticipata in 8.4: la chiede *Contenimento gravitazionale*. `fiondaDi` e `space.viaggia` usano `fionda.gravitazionale`, ×2 e 30 % gratis.)
- [x] **9.3 Relitti**: bottino una volta per giocatore, progetti. (`031_relitti.sql`: `space.bottino_relitto` dentro `assesta`, l'esito dalla quinta sequenza del seed (`esitoRelitto`, confrontato da `verifica-sql`); i progetti in `nave.progetti` dimezzano la prossima ricerca. Il raddoppio di *Recupero* su relitti e comete è già pronto, la ricerca arriva con 9.6.)
- [x] **9.4 Accelerare** viaggi, costruzioni e ricarica con la Materia oscura. (`032_accelera.sql`: `space.accelera(cosa, lavoro)`, pagato dalla stiva da dove si vuole; il lavoro accelerato anticipa quelli dopo nella sua coda. I tasti (`Accelera.tsx`) compaiono in Qui, nel volo e nella coda solo con Materia oscura a bordo.)
- [x] **9.5 Wormhole**: Navigazione dei varchi (P9), 50 MO, senso unico; Sonda di varco (S9). (`033_wormhole.sql`: `space.uscita_varco`, identica a `uscitaVarco` (40 varchi in `verifica-sql`, 1000 controllati una volta), e `space.attraversa()`: salto istantaneo, `viaggio.wormhole`. Il riquadro Varco sta in Qui; senza S9 l'uscita non si vede.)
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
