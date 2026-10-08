# 02 · Meccaniche

Qui c'è **come funzionano le cose**; formule e valori stanno in [09](09-bilanciamento.md), l'albero delle ricerche in [10](10-ricerche.md). I valori già nel codice stanno in `src/dominio/` e nelle funzioni SQL, e vanno cambiati in entrambi i posti.

## Pilastri e ritmo

- Il giocatore si sente più forte quando **va più lontano**, quando **riempie il catalogo** e quando **allarga la rete di basi**. L'economia è un mezzo, non un fine.
- Si gioca **2-3 volte al giorno**: l'azione tipica (un viaggio, una costruzione) dura qualche ora e sta tra due sessioni.
- La progressione dura **più di un anno**: costi e tempi crescono in modo esponenziale.
- Il gioco è **aperto**: nessuna fine, solo **traguardi** (medaglie con data).

| Bersaglio | Quando |
|---|---|
| 1-2 corpi nuovi visitati al giorno | all'inizio |
| Primo corpo raro (pulsar) | mese 1 |
| Zona lontana (500 settori) | mese 6 |
| Un livello di nave dura ~1 settimana | dopo un anno |

## Ciclo di gioco

```
esplora → scopri → fonda insediamenti → giri di raccolta → potenzia la nave → esplora più lontano
                                      ↘ ricerche → nuove strutture e nuovi insediamenti ↗
```

## Nave

- **Una sola**, per sempre. Parte dalla **base madre** in `(0, 0, 0)`.
- È **il centro della progressione**. Le statistiche crescono in modo esponenziale col livello: **motore** (velocità), **serbatoio**, **ricarica**, **stiva** (una capacità **per risorsa**), **scanner**.
- Si potenzia solo in una **base con cantiere**, e per tutta la costruzione **resta ferma lì**. Il livello della nave non può superare il **doppio del livello del cantiere**.
- La **stiva** si può potenziare all'infinito ed è sempre pagabile: costa una parte della stiva attuale, solo in Metallo e Silicio, e la costruzione dura sempre 1 h.

## Viaggio

- Si sceglie un settore di arrivo e si parte. Durante il viaggio la nave non può fare altro; il viaggio non si annulla.
- **Durata** = distanza / velocità. **Distanza** euclidea, la rotta è un segmento.
- **Carburante**: un'unità per settore. Se finisce a metà rotta la nave si ferma nel settore più vicino al punto in cui si svuota, e lì aspetta.
- **Ricarica**: solo da fermi. **Fuori dalle basi si riempie solo fino al 50 %** del serbatoio. **In una base o accanto a una stella si arriva al 100 %**, e accanto a una stella anche più in fretta. Si può quindi andare lontano dalle basi, ma a metà passo, e le stelle diventano tappe.
- **Deposito carburante** (struttura di base): il pieno è istantaneo e si paga in Idrogeno. All'inizio costa caro, poi le ricerche lo rendono più economico.
- **Ponte di curvatura**: tra due basi che lo hanno si viaggia **3 volte più veloci con un terzo del carburante**. Tutte le basi con il ponte formano una rete libera.

## Scanner

- Mostra i corpi entro un raggio dalla nave, dal più vicino.
- I livelli alternano un **nuovo tipo rilevabile** e uno o due aumenti di **raggio**, in ordine di utilità: sistemi planetari → asteroidi → nebulose → stelle → giganti → comete → pulsar → buchi neri → relitti → wormhole.
- I tipi non ancora rilevabili sono **invisibili**: il settore sembra vuoto finché non ci si arriva.
- I settori scansionati **restano sulla mappa**.
- Il raggio si dimezza dentro una nebulosa e raddoppia in sosta presso una pulsar.

## Scoperte e catalogo

- La prima volta che la nave arriva in un settore non vuoto, il corpo entra nel **catalogo personale**, con nome, coordinate e data.
- Il catalogo è la parte collezionabile: corpi per tipo, sottotipo e rarità.

## Risorse

| Risorsa | Da dove viene | Entra nelle ricette |
|---|---|---|
| **Metallo** | asteroidi, sistemi planetari, base madre | dal livello 1 |
| **Silicio** | asteroidi, sistemi planetari, base madre | dal livello 1 |
| **Ghiaccio** | sistemi planetari, giganti, comete, base madre | dal livello 4 |
| **Idrogeno** | nebulose, giganti, base madre; anche per il pieno al deposito | dal livello 7 |
| **Terre rare** | pulsar | dal livello 10 |
| **Materia oscura** | buchi neri, relitti | dal livello 15 |

- **Ricette a rarità crescente**: ogni gradino di livello **aggiunge** una risorsa e le precedenti restano. Per salire bisogna andare dove si trovano le rare.
- **Stiva**: una capacità per ogni risorsa.
- **Nessuno scarico.** Un potenziamento si paga con **la stiva più il magazzino della base in cui si costruisce**. Il magazzino di una base contiene solo ciò che quella base produce.
- **Raccolta a mano**: in sosta su un corpo con risorse, la nave le estrae da sola, lentamente. Serve per i primi carichi di una risorsa nuova, prima di avere l'estrattore.

## Insediamenti

Due tipi:

| | Dove | Cosa fa |
|---|---|---|
| **Base** (colonia vera) | sistemi planetari | produce; ospita strutture; fa da punto di partenza, ricarica e potenziamento |
| **Estrattore** | asteroidi, nebulose, giganti, pulsar, buchi neri | produce e basta |

- La **base madre** in `(0, 0, 0)` produce poco delle quattro risorse comuni e parte con cantiere, laboratorio, magazzino e deposito.
- **Fondazione**: si paga sul posto **dalla stiva**. La **prima colonia è gratis**.
- **Limiti**: le basi fondabili partono da 2 e crescono con le ricerche di *Astrofisica*. Gli estrattori hanno un limite a parte e i loro tipi si sbloccano con le ricerche di Colonizzazione.
- **Produzione**: è un mix di risorse che dipende dal **sottotipo** del corpo (es. asteroidi metallici 80 % Metallo e 20 % Silicio) e cresce con la distanza (ricchezza). Si accumula nel magazzino dell'insediamento **fino al tetto, ~1 settimana** di produzione, poi si ferma. La produzione persa non si mostra.
- **Raccolta solo di persona**: la nave va sul posto e carica nella stiva. I **giri di raccolta** sono il cuore dell'economia.
- **Abbandono**: solo il fondatore può abbandonare un insediamento. Strutture e scorte spariscono e il corpo torna subito libero.

## Strutture di base

| Struttura | Effetto | Nelle colonie |
|---|---|---|
| Magazzino | alza il tetto | subito |
| Laboratorio | apre le ricerche; il livello decide il gradino massimo | subito |
| Cantiere | potenzia la nave; i livelli accorciano i tempi e alzano il tetto della nave | ricerca |
| Deposito carburante | pieno istantaneo con Idrogeno; i livelli lo rendono più economico | ricerca |
| Radar | scanner fisso attorno alla base; il raggio cresce col livello | ricerca |
| Ponte di curvatura | collega la base alla rete dei ponti | ricerca |

- Ogni base ha la sua **coda di costruzione** per strutture e produzione. La nave ha la sua coda, nel cantiere in cui è attraccata.

## Ricerche

- Un albero di **42 ricerche** in 4 rami: Propulsione, Colonizzazione, Sensori, Ingegneria ([10](10-ricerche.md)). Ci sono soprattutto sblocchi singoli, più due nodi infiniti in fondo a Propulsione e Colonizzazione.
- **Una ricerca alla volta**, in una base con laboratorio. La nave **resta ferma** per la durata, che è al massimo **1 h**. Le ricerche si frenano con il **costo** e con il **livello del laboratorio**, non col tempo.

## Materia oscura

Serve alle funzioni avanzate:

- **Livelli alti** e **ricerche avanzate**, attraverso le ricette;
- **accelerare** un viaggio, una costruzione o la ricarica: più tempo si salta, più costa, in modo più che proporzionale;
- **attraversare un wormhole**: costo fisso.

## Effetti dei corpi

| Corpo | Effetto |
|---|---|
| Stella solitaria | ricarica fino al 100 % e più veloce |
| Nebulosa | scanner dimezzato all'interno |
| Pulsar | scanner doppio in sosta |
| Buco nero | **fionda**: il viaggio che parte da qui è più veloce e il primo tratto non consuma carburante |
| Cometa | si raccoglie **una volta per giocatore** |
| Relitto alieno | si saccheggia **una volta per giocatore**: Materia oscura, risorse, a volte un progetto (ricerca scontata) |
| Wormhole | **senso unico** verso un settore lontano 300-1500 settori, in una direzione qualsiasi; costa Materia oscura |

## Traguardi

Medaglie con data, senza ricompense, in quattro famiglie: **distanza**, **catalogo**, **infrastruttura**, **imprese** (elenco in [09](09-bilanciamento.md)).

## Altri giocatori (più avanti)

Le basi non appartengono davvero a nessuno: il fondatore è solo un'**etichetta**. Un altro giocatore che arriva in una base può **usarne le strutture**, **prenderne le risorse** e **potenziarla**, ma non abbandonarla. Il limite delle basi conta quelle fondate da sé.

## Riepilogo all'apertura

Niente notifiche: all'apertura c'è una **cronologia** di ciò che è successo dall'ultima volta. Contiene la nave (arrivi, soste forzate, potenziamenti e ricerche finiti), gli insediamenti (pieni, costruzioni finite), le scoperte (corpi rilevati, traguardi) e, in futuro, i passaggi di altri giocatori.
