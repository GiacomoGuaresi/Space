# 07 · Decisioni

| Data | Decisione | Esito |
|---|---|---|
| 2026-10-08 | Nuova app di casa chiamata **Space**, repository pubblico, licenza **MIT** | deciso |
| 2026-10-08 | Di **DeepSpace** si tiene **solo l'idea**: viaggio tra coordinate `(x, y, z)` in tempo reale. Corpi, grafica, meccaniche e codice ripartono da zero | deciso |
| 2026-10-08 | ~~Catalogo, pesi e nomi ereditati da DeepSpace~~ | superata |
| 2026-10-08 | **Stessa struttura e tecnologia** delle altre app: Vite + React + TypeScript, PWA, Vitest, GitHub Pages, Supabase con schema `space` | deciso |
| 2026-10-08 | Per ora gioca **solo il proprietario**; dati per giocatore, pronti per altri | deciso |
| 2026-10-08 | Universo **infinito** e **deterministico**, base in `(0, 0, 0)`; rarità e ricchezza crescono con la distanza | deciso |
| 2026-10-08 | **Un corpo per settore**; il sistema planetario conta come corpo unico | deciso |
| 2026-10-08 | Catalogo di **11 corpi**: vuoto, asteroidi, nebulosa, stella solitaria, sistema planetario, gigante gassoso, cometa, pulsar, buco nero, relitto, wormhole | deciso |
| 2026-10-08 | Corpi con **effetti di gioco pochi e semplici**, nessun pericolo | deciso |
| 2026-10-08 | **Una sola nave**, per sempre | deciso |
| 2026-10-08 | Durata del viaggio in funzione della distanza: **da minuti a ore**, sceglie il giocatore | deciso |
| 2026-10-08 | **Carburante** consumato dai viaggi e ricaricato col tempo; se finisce, la nave si ferma nel settore più vicino e aspetta | deciso |
| 2026-10-08 | **5 risorse + 1 speciale**: Metallo, Silicio, Idrogeno, Ghiaccio, Terre rare, Materia oscura (nomi provvisori) | deciso |
| 2026-10-08 | **Colonie alla Spore**: produzione fino a un tetto, poi si torna a raccogliere | deciso |
| 2026-10-08 | Potenziamenti di **nave, base e colonie**, con costi e tempi reali | deciso |
| 2026-10-08 | Niente notifiche push: **riepilogo all'apertura** | deciso |
| 2026-10-08 | Grafica **procedurale ricca** con **three.js** e shader | deciso |
| 2026-10-08 | ~~Sviluppo a **macro step stabili**: M0 fondamenta, M1 universo, M2 navigazione, M3 risorse e colonie, M4 potenziamenti, M5 rarità~~ | superata |
| 2026-10-08 | Seed dal **finalizzatore di MurmurHash3** in catena sulle coordinate, generatore **Mulberry32**, sequenze separate per ogni parte del settore; in SQL identico dal M2 | deciso |
| 2026-10-08 | Azioni solo tramite **funzioni Postgres** (`stato`, `viaggia`), tabelle in sola lettura, stato calcolato alla lettura senza job | deciso |
| 2026-10-08 | Palette provvisoria **scura** (fondo spazio, accento blu nebula), icona: pianeta con anello | deciso |
| 2026-10-08 | ~~Valori provvisori: **un settore su dieci** non vuoto, pesi che cambiano fino a **500 settori** dalla base, ricchezza media `1 + √(d / 100)`; la base è vuota~~ | superata |
| 2026-10-08 | Sottotipi: classe stellare (M, K, G, F, B), pianeti (roccioso, oceanico, ghiacciato, gassoso), generi di nebulosa, forme di relitto | deciso |
| 2026-10-08 | **Osservatorio** come strumento di M1: coordinate nell'indirizzo, ricerca del corpo più vicino; in M2 resterà solo in sviluppo | deciso |
| 2026-10-08 | Grafica con **bloom**; camera libera attorno al corpo con rotazione automatica lenta | deciso |
| 2026-10-08 | ~~Valori provvisori della nave: **12 settori all'ora**, **serbatoio 20**, consumo 1 a settore, **ricarica 2,5 all'ora** solo da fermi~~ | superata |
| 2026-10-08 | ~~Effetti: ricarica **×3** accanto alle stelle, scanner **3 settori** (1 nelle nebulose, 6 presso le pulsar), fionda **×2** dai buchi neri~~ | superata |
| 2026-10-08 | Distanze con `√(dx²+dy²+dz²)` e arrotondamenti con `floor(v + 0,5)`, uguali in JavaScript e Postgres; campione fisso e `npm run verifica-sql` per controllarlo | deciso |
| 2026-10-08 | Scanner come **elenco** (tipo e distanza, il nome si scopre arrivando) | deciso |
| 2026-10-08 | In viaggio niente scanner né rotta; **il viaggio non si annulla** | deciso |
| 2026-10-08 | Scoperta registrata alla partenza con l'istante d'arrivo, nascosta dalla policy finché la nave non arriva | deciso |
| 2026-10-08 | Riepilogo dall'ultima visita salvata sul dispositivo; gli arrivi visti dal vivo non ci finiscono | deciso |
| 2026-10-08 | **Pilastri**: distanza, collezione, infrastruttura; l'economia è un mezzo. Gioco **aperto** con traguardi (solo medaglie), 2-3 sessioni al giorno, progressione **oltre un anno** | deciso |
| 2026-10-08 | Bersagli di ritmo: 1-2 corpi al giorno all'inizio, primo raro al **mese 1**, 500 settori al **mese 6**, livello più lungo **~1 settimana** a un anno | deciso |
| 2026-10-08 | Modello numerico **v1** ([09](09-bilanciamento.md)), verificato con le simulazioni in `sim/`; sostituisce i valori provvisori di M1 e M2 | deciso |
| 2026-10-08 | Rari **ad anelli**: soglie di distanza (pulsar 25, buchi neri e relitti 80, wormhole 150), poi peso crescente fino a 500 | deciso |
| 2026-10-08 | **Nave al centro della progressione**: statistiche esponenziali; si potenzia solo in una base con **cantiere** e resta ferma; tetto della nave = 2 × livello del cantiere | deciso |
| 2026-10-08 | Ricarica solo da fermi, **tetto 50 %** fuori dalle basi, **100 %** in base o accanto a una stella | deciso |
| 2026-10-08 | Scanner a livelli che alternano **raggio** e **tipi rilevabili** (per utilità, dai sistemi planetari ai wormhole); i tipi non rilevati sono **invisibili**; la mappa dei settori scansionati c'è da subito | deciso |
| 2026-10-08 | **Colonie vere = basi**, con strutture: magazzino, laboratorio, cantiere, deposito, radar, **ponte di curvatura** (rete libera, ×3 velocità, ⅓ carburante) | deciso |
| 2026-10-08 | **Estrattori** su asteroidi, nebulose, giganti, pulsar e **buchi neri**: producono ma non sono basi; limite separato | deciso |
| 2026-10-08 | **Nessuno scarico**: si paga con stiva + magazzino della base; stiva **per risorsa**, infinita, sempre pagabile, 1 h | deciso |
| 2026-10-08 | ~~Scarico della stiva nel magazzino della base~~ | superata |
| 2026-10-08 | **Ricette a rarità crescente**: ogni gradino di livello aggiunge una risorsa | deciso |
| 2026-10-08 | Produzione per **sottotipo**, tetto di ~**1 settimana**, raccolta **solo di persona**; produzione persa non mostrata | deciso |
| 2026-10-08 | **Raccolta a mano** dai corpi in sosta, per spezzare i circoli chiusi (serve una risorsa per sbloccarne l'estrattore) | deciso |
| 2026-10-08 | Base madre: produce poco delle 4 comuni, parte con cantiere, laboratorio, magazzino, deposito; **prima colonia gratis**; fondazione pagata dalla stiva | deciso |
| 2026-10-08 | Basi fondabili: 2, +2 per ogni Astrofisica; abbandono possibile solo per il fondatore, non resta nulla | deciso |
| 2026-10-08 | Carburante: rigenerazione gratuita + **deposito** (pieno in Idrogeno, prezzo ridotto da ricerche e livelli) | deciso |
| 2026-10-08 | **Albero di 42 ricerche** in 4 rami ([10](10-ricerche.md)), una alla volta, nave ferma ≤ 1 h, gradino ≤ livello del laboratorio; nodi infiniti solo in Propulsione e Colonizzazione | deciso |
| 2026-10-08 | **Materia oscura**: livelli alti, ricerche avanzate, accelerare (costo ∝ ore^1,5), wormhole (costo fisso) | deciso |
| 2026-10-08 | **Wormhole a senso unico**, uscita in direzione qualsiasi a 300-1500 settori | deciso |
| 2026-10-08 | **Fionda**: ×1,5 e il primo tratto della rotta senza consumo | deciso |
| 2026-10-08 | Comete e relitti una volta **per giocatore**; il relitto dà Materia oscura, risorse, a volte un progetto | deciso |
| 2026-10-08 | Basi **condivise** in futuro: il fondatore è un'etichetta; gli altri usano, prelevano, potenziano | deciso |
| 2026-10-08 | Riepilogo all'apertura come **cronologia** | deciso |
| 2026-10-08 | Sviluppo **agile a step piccoli**, ognuno pubblicato; macro step M3-M10 ([06](06-roadmap.md)) | deciso |
| 2026-10-08 | Valori del bilanciamento **solo in `bilanciamento.ts`**; `bilanciamento.sql` è generato e `verifica-sql` confronta i due | deciso |
| 2026-10-08 | Il tratto gratis della fionda si calcola sui **settori percorsi**, non sulla rotta chiesta: una meta lontanissima non allunga il viaggio gratis | deciso |
| 2026-10-08 | Il carburante oltre il tetto di ricarica (arrivando da una base piena) **non cala**: smette solo di salire | deciso |
| 2026-10-08 | **Mappa 3D** (`#/mappa`): corpi noti colorati per rarità, pieni se scoperti, ad anello se solo rilevati; bolle delle soste, griglia di un settore; si tocca un corpo e si imposta la rotta | deciso |
| 2026-10-08 | **Interfaccia** ([11](11-interfaccia.md)): telefono e desktop con la stessa struttura, scena 3D sempre di fondo, striscia di stato in alto, barra Ponte · Mappa · Rete · Nave · Altro; stile plancia ambra con IBM Plex | deciso |
| 2026-10-08 | **Tutto dal Ponte**: azioni del luogo e scheda BASE quando attraccati; costruzioni solo sul posto | deciso |
| 2026-10-08 | **Raccolta automatica all'arrivo** in un insediamento; a mano sui corpi liberi | deciso |
| 2026-10-08 | **Wiki** di 29 pagine a sblocco, separata dal catalogo; **ⓘ** con le formule accanto ai valori calcolati | deciso |
| 2026-10-08 | **Diario di bordo** al posto del riepilogo (30 giorni, voci raggruppate) e **pallini** sulla barra, anche per ciò che è pagabile | deciso |
| 2026-10-08 | Macro step **MI · Ossatura dell'interfaccia** prima di M4; poi ogni step porta la sua interfaccia | deciso |
| 2026-10-08 | Il **diario** non si salva: si ricostruisce da viaggi, scoperte, scansioni e stato della nave. Sul dispositivo resta solo fin dove l'hai letto | deciso |
| 2026-10-08 | Nel diario le **partenze** non sono mai novità (le hai decise tu), e nemmeno gli arrivi visti dal vivo; alla primissima apertura non c'è nulla da raccontare | deciso |
| 2026-10-08 | **Suoni** sintetizzati al momento (niente file), **spenti** finché non li accendi; impostazioni e pallini già visti valgono per dispositivo | deciso |
| 2026-10-08 | Nelle impostazioni niente "esci": l'account è quello di casa, condiviso con le altre app | deciso |
