# 11 · Interfaccia

Come si presenta e si usa il gioco. Le regole del gioco stanno in [02](02-meccaniche.md), i numeri in [09](09-bilanciamento.md).
Prototipo approvato, con le 7 schermate del telefono: [Space · Prototipo interfaccia](https://claude.ai/artifact/79XXi2Bakn9k9Gp9J6K3So).

## Principi

- **Telefono e desktop alla pari**, con la stessa struttura; il desktop è solo più largo.
- La **scena 3D è sempre di fondo** e i pannelli stanno sopra.
- **Tutto si fa dal Ponte**: le azioni del luogo, e la scheda BASE quando si è attraccati. Le altre sezioni servono a consultare.
- **Costruzioni solo sul posto**: a distanza si consulta e basta.
- **Niente notifiche**: c'è il diario di bordo, e i pallini segnalano dove c'è qualcosa.
- È un gioco tattico: i numeri si mostrano, con le formule a portata di tocco.

## Stile · plancia ambra

| Elemento | Valore |
|---|---|
| Fondo | nero, campo di stelle |
| Accento | ambra `#ffb547`, ambra scura `#b97a22` |
| Linee | `#5a4220`, separatori `#2e2312` |
| Testo | `#f2e6cc`, secondario `#a8926b` |
| Pannelli | `rgba(12, 9, 5, .84-.96)`, bordo di 1 px, angoli di 2-3 px |
| Font | IBM Plex Sans; numeri in IBM Plex Mono a cifre tabulari |
| Etichette | maiuscole, spaziate (`.18em`), 10 px |

- **HUD vivo**: linee che si disegnano, numeri che scorrono. Tutto si spegne con **riduci movimento**.
- **Suoni** discreti e disattivabili: clic, partenza, arrivo, scoperta.
- **Accessibilità**: la rarità si distingue per **forma e colore** (● comune, ◆ non comune, ★ raro, ✦ leggendario); ARIA su barre e pannelli.

## Ossatura

```
┌──────────────────────────────────┐
│ ◉ FERMA  12 · −3 · 4   KUMION    │  ← striscia di stato (sempre)
│ CARB ▰▰▰▱▱ 2,1/4       TETTO 50% │
├──────────────────────────────────┤
│        scena 3D del settore      │  ← sempre di fondo
│        (mappa 3D in Mappa)       │
│  ┌────────────────────────────┐  │
│  │ pannello della sezione     │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│ PONTE  MAPPA  RETE  NAVE  ALTRO  │  ← barra, con i pallini
└──────────────────────────────────┘
```

- **Striscia di stato**: in viaggio `▲ VERSO 40 · 2 · −7   03:12:44`, con il carburante e l'ora di arrivo. In sosta mostra il luogo, il carburante con il tetto di ricarica e l'attività in corso (potenziamento, ricerca, raccolta a mano) con il conto alla rovescia. Un tocco apre il diario.
- **Barra**: Ponte · Mappa · Rete · Nave · Altro.

## Sezioni

### Ponte

Schede **QUI · SCANNER · ROTTA**, più **BASE** quando la nave è attraccata a una base. In cima ci sono le azioni del luogo:

| Dove sei | Azioni |
|---|---|
| Corpo con risorse | RACCOGLI A MANO · FONDA (se si può) |
| Insediamento | nessuna: la raccolta avviene da sola all'arrivo e finisce nel diario |
| Base | scheda **BASE**: cantiere (potenziamenti e coda), strutture (costruisci), laboratorio (avvia una ricerca), PIENO al deposito |
| Wormhole | ATTRAVERSA (50 MO, con conferma) |

**ROTTA**: la meta arriva dallo scanner, dalla mappa, da un insediamento o dalle coordinate. L'anteprima è essenziale: durata, arrivo, carburante e avviso di sosta forzata. Poi PARTI.

### Mappa

Mappa 3D dei settori scansionati, che si apre **centrata sulla nave**.
- Un dito ruota; due dita zoomano e spostano.
- Un tocco apre la scheda del corpo (tipo, coordinate, distanza) con IMPOSTA ROTTA.
- I punti hanno la forma e il colore della rarità: pieni se visitati, vuoti se solo rilevati. Gli insediamenti hanno un simbolo proprio.
- Ci sono filtri per tipo e tasti per ricentrare sulla nave e sulla base madre.
- Non mostra ponti, viaggi né anelli.

### Rete

Elenco degli insediamenti (⬢ basi, ◇ estrattori), ordinabile per **riempimento** o per distanza.
- Ogni riga mostra le barre del magazzino per risorsa, lo stato ("Pieno", "Pieno tra 1 g 8 h") e il tasto **VAI**, che imposta la rotta.
- Niente pianificazione automatica dei giri.
- Un tocco apre la scheda: livelli, magazzino e strutture. COSTRUISCI compare solo se si è attraccati.

### Nave

- **Statistiche**: livello, valore attuale e prossimo valore di motore, serbatoio, ricarica, scanner e stiva.
- **Stiva**: una barra per ognuna delle 6 risorse.
- **Potenziamenti**: sempre visibili. Mostrano il costo per risorsa (in ambra quanto manca), il tempo e il **motivo** se non si possono fare ("serve un cantiere di livello ≥ 5").
- **Coda del cantiere**.

### Altro

Ricerche · Catalogo · Wiki · Traguardi · Diario di bordo · Impostazioni.

- **Ricerche**: grafo zoomabile dei 4 rami, da consultare. Si avviano dalla scheda BASE.
- **Catalogo**: un album con una pagina per tipo. I sottotipi non ancora trovati sono sagome scure.
- **Traguardi**: medaglie con data, divise per famiglia.
- **Impostazioni**: suoni, animazioni (riduci movimento), account.

## Wiki

Il manuale, separato dal catalogo: il catalogo dice cosa hai trovato, la wiki come funziona. Ha 29 pagine.

**A · Guida**, aperta dall'inizio:
1. Come si gioca
2. La nave
3. Viaggio e carburante
4. Scanner
5. Risorse e ricette
6. Basi e fondazione
7. Raccolta
8. Strutture di base
9. Ricerche
10. Catalogo e traguardi

**B · Meccaniche**, si sbloccano facendo:

| Pagina | Si sblocca quando… | Suggerimento |
|---|---|---|
| Estrattori | completi la prima ricerca che sblocca un estrattore | ricerca di Colonizzazione |
| Deposito carburante | completi la sua ricerca | nome della ricerca |
| Radar | completi la sua ricerca | nome della ricerca |
| Ponte di curvatura | completi la sua ricerca | nome della ricerca |
| Terre rare | raccogli le prime Terre rare | trova una pulsar (oltre 25 sett.) |
| Materia oscura e accelerazione | ottieni la prima Materia oscura | buco nero o relitto (oltre 80 sett.) |
| Fionda gravitazionale | parti da un buco nero | parti da un buco nero |
| Viaggio nel wormhole | attraversi un wormhole | trova un wormhole (oltre 150 sett.) |
| Progetti alieni | trovi un progetto in un relitto | saccheggia un relitto |

**C · Corpi celesti**: una pagina per ognuno dei 10 tipi. Si sblocca alla **prima rilevazione** dello scanner. Da chiusa suggerisce il livello di scanner necessario e la distanza minima.
- Ogni pagina descrive l'aspetto, la rarità e la distanza minima, l'insediamento possibile e l'effetto.
- C'è una sezione per ogni sottotipo, con il mix di risorse, che resta coperta ■■■ finché il sottotipo non viene trovato.

**Regole**
- L'indice mostra tutte le pagine; quelle chiuse hanno il titolo coperto ■■■ e il suggerimento.
- Ogni pagina finisce con una sezione **Numeri**: le formule con i valori attuali del giocatore.
- Uno sblocco produce una voce nel diario e accende il pallino su Altro → Wiki, che resta finché la pagina non viene aperta.

## Diario di bordo

La cronologia di ciò che succede, dal più recente. All'apertura dell'app si apre da solo se ci sono novità. Le novità sono evidenziate e separate dalle voci "Già visti". Si apre anche dalla striscia di stato o da Altro.

| Famiglia | Eventi |
|---|---|
| **Nave** | partenza · arrivo (con la raccolta automatica) · sosta forzata · ricarica completata · potenziamento finito · ricerca finita · fionda, wormhole, accelerazione |
| **Rete** | insediamento pieno · costruzione finita · fondazione e abbandono |
| **Scoperte** | corpo rilevato (solo le novità: rari, il primo di un tipo o di un sottotipo) · nuovo nel catalogo · cometa raccolta, relitto saccheggiato · nuova pagina della wiki · traguardo |
| **Altri** (più avanti) | passaggio di un altro giocatore |

- Le voci consecutive dello stesso tipo si **raggruppano** ("3 insediamenti pieni: Kumion, Talir, Odressa"); un tocco le espande.
- Il diario conserva gli **ultimi 30 giorni**. I traguardi restano comunque nella loro pagina.

## Pallini

I pallini segnalano sia ciò che è **successo** sia ciò che è **possibile** adesso.

| Voce | Si accende quando… | Si spegne quando… |
|---|---|---|
| Ponte | la nave è arrivata o si è fermata, e non l'hai ancora vista | apri il Ponte |
| Mappa | è stato rilevato un corpo raro non ancora visitato | apri la sua scheda |
| Rete | un insediamento è pieno o una costruzione è finita | lo raccogli, o apri la Rete |
| Nave | un potenziamento è finito, o uno è pagabile dove sei | apri Nave, o non è più pagabile |
| Altro | c'è un pallino dentro: Ricerche (finita o pagabile qui), Wiki, Traguardi, Diario | si spengono quelli interni |

## Regole trasversali

- **Numeri** in monospazio e **abbreviati** (1,2 k · 55,4 k · 2,68 M).
- Accanto ai valori calcolati c'è un **ⓘ**. Mostra la formula con i numeri attuali e il valore esatto, e porta alla sezione Numeri della wiki.
- **Conferme** solo per le azioni costose o definitive: abbandono, spesa di Materia oscura, wormhole.
- **Offline**: schermata di errore con Riprova.
