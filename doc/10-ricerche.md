# 10 · Ricerche

L'albero tecnologico: **42 ricerche** in 4 rami. In ogni ramo i nodi sono in ordine di **gradino** (1-10): ogni nodo richiede quello prima nello stesso ramo, più gli eventuali prerequisiti indicati. Solo **Propulsione** e **Colonizzazione** finiscono con un nodo a livelli infiniti (∞).

- Una ricerca alla volta, in una base con **laboratorio** di livello almeno pari al gradino; la nave resta ferma, al massimo 1 h.
- Costi e durate in [09](09-bilanciamento.md#ricerche).
- La base madre ha già cantiere, laboratorio, magazzino e deposito. Nelle colonie magazzino e laboratorio si costruiscono subito, il resto si sblocca qui.

## Propulsione

| # | Ricerca | Effetto | Prerequisiti |
|---|---|---|---|
| P1 | Raffinazione I | Pieno al deposito: 5 → 4 Idrogeno/unità | |
| P2 | Iniettori | Consumo −10 % | |
| P3 | Ponte di curvatura | Sblocca la struttura Ponte | I3 |
| P4 | Raffinazione II | 4 → 3 Idrogeno/unità | |
| P5 | Vele solari | Presso una stella la ricarica è ×3 invece di ×2 | |
| P6 | Fionda gravitazionale | Fionda dei buchi neri: velocità da ×1,5 a ×2, tratto gratis da 20 % a 30 % | |
| P7 | Raffinazione III | 3 → 2 Idrogeno/unità | |
| P8 | Ponte risonante | Ponte: velocità ×4, carburante 1/4 | |
| P9 | Navigazione dei varchi | Permette di attraversare i wormhole | S7 |
| P10 | Raffinazione IV | 2 → 1 Idrogeno/unità | |
| P∞ | Propulsione avanzata | +4 % velocità per livello | |

## Colonizzazione

| # | Ricerca | Effetto | Prerequisiti |
|---|---|---|---|
| C1 | Astrofisica I | +2 basi fondabili | |
| C2 | Estrattori minerari | Estrattori sugli asteroidi; limite estrattori 3 | |
| C3 | Raccoglitori di gas | Raccoglitori su nebulose e giganti; +2 estrattori | |
| C4 | Magazzini modulari | Tetto dei magazzini +20 % | |
| C5 | Estrattori stellari | Estrattori sulle pulsar (Terre rare); +2 estrattori | |
| C6 | Astrofisica II | +2 basi fondabili | |
| C7 | Contenimento gravitazionale | Estrattori sui buchi neri (Materia oscura); +2 estrattori | P6 |
| C8 | Estrazione profonda | Produzione +15 % | |
| C9 | Recupero | Relitti e comete rendono il doppio | |
| C10 | Astrofisica III | +2 basi fondabili | |
| C∞ | Colonizzazione avanzata | +1 base ogni 2 livelli, +1 estrattore e +3 % produzione per livello | |

## Sensori

| # | Ricerca | Effetto | Prerequisiti |
|---|---|---|---|
| S1 | Scansione in volo | Lo scanner funziona anche in viaggio: rivela i settori lungo la rotta | |
| S2 | Spettrometria | Si vede la ricchezza dei corpi rilevati | |
| S3 | Radar | Sblocca la struttura Radar (scanner fisso attorno alla base) | |
| S4 | Telemetria | Si vedono a distanza produzione e riempimento di basi ed estrattori | |
| S5 | Filtri nebulari | Le nebulose non riducono più lo scanner | |
| S6 | Analisi stellare | Si vedono i sottotipi (classe stellare, pianeti) | |
| S7 | Interferometria | Presso le pulsar lo scanner è ×3 invece di ×2 | |
| S8 | Radar profondo | Raggio del radar ×2 | S3 |
| S9 | Sonda di varco | Si vede dove porta un wormhole prima di entrarci | |
| S10 | Rilevamento gravitazionale | Buchi neri e wormhole visibili al doppio del raggio | |

## Ingegneria

| # | Ricerca | Effetto | Prerequisiti |
|---|---|---|---|
| I1 | Automazione | Tempi di costruzione −10 % | |
| I2 | Stiva modulare | Stiva +15 % | |
| I3 | Cantiere orbitale | Sblocca il Cantiere nelle colonie | |
| I4 | Leghe | Metallo e Silicio nelle ricette −10 % | |
| I5 | Deposito | Sblocca la struttura Deposito carburante nelle colonie | |
| I6 | Riciclo | Abbandonare una base restituisce il 25 % di quanto vi si è speso | |
| I7 | Automazione II | Tempi −15 % | |
| I8 | Superleghe | Terre rare nelle ricette −15 % | |
| I9 | Doppia coda | La coda di una base costruisce 2 cose insieme | |
| I10 | Materia esotica | Materia oscura nelle ricette −15 % | |
