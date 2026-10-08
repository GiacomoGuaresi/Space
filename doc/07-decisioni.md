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
| 2026-10-08 | Sviluppo a **macro step stabili**: M0 fondamenta, M1 universo, M2 navigazione, M3 risorse e colonie, M4 potenziamenti, M5 rarità | deciso |
| 2026-10-08 | Seed dal **finalizzatore di MurmurHash3** in catena sulle coordinate, generatore **Mulberry32**, sequenze separate per ogni parte del settore; in SQL identico dal M2 | deciso |
| 2026-10-08 | Azioni solo tramite **funzioni Postgres** (`stato`, `viaggia`), tabelle in sola lettura, stato calcolato alla lettura senza job | deciso |
| 2026-10-08 | Palette provvisoria **scura** (fondo spazio, accento blu nebula), icona: pianeta con anello | deciso |
| 2026-10-08 | Valori provvisori: **un settore su dieci** non vuoto, pesi che cambiano fino a **500 settori** dalla base, ricchezza media `1 + √(d / 100)`; la base è vuota | proposta |
| 2026-10-08 | Sottotipi: classe stellare (M, K, G, F, B), pianeti (roccioso, oceanico, ghiacciato, gassoso), generi di nebulosa, forme di relitto | deciso |
| 2026-10-08 | **Osservatorio** come strumento di M1: coordinate nell'indirizzo, ricerca del corpo più vicino; in M2 resterà solo in sviluppo | deciso |
| 2026-10-08 | Grafica con **bloom**; camera libera attorno al corpo con rotazione automatica lenta | deciso |
| 2026-10-08 | Valori provvisori della nave: **12 settori all'ora**, **serbatoio 20**, consumo 1 a settore, **ricarica 2,5 all'ora** solo da fermi | proposta |
| 2026-10-08 | Effetti: ricarica **×3** accanto alle stelle, scanner **3 settori** (1 nelle nebulose, 6 presso le pulsar), fionda **×2** dai buchi neri | proposta |
| 2026-10-08 | Distanze con `√(dx²+dy²+dz²)` e arrotondamenti con `floor(v + 0,5)`, uguali in JavaScript e Postgres; campione fisso e `npm run verifica-sql` per controllarlo | deciso |
| 2026-10-08 | Scanner come **elenco** (tipo e distanza, il nome si scopre arrivando); mappa 3D rimandata | deciso |
| 2026-10-08 | In viaggio niente scanner né rotta; il viaggio non si annulla, per ora | proposta |
| 2026-10-08 | Scoperta registrata alla partenza con l'istante d'arrivo, nascosta dalla policy finché la nave non arriva | deciso |
| 2026-10-08 | Riepilogo dall'ultima visita salvata sul dispositivo; gli arrivi visti dal vivo non ci finiscono | deciso |
