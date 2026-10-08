# 11 · Interfaccia

Come si presenta e si usa il gioco. Le regole del gioco stanno in [02](02-meccaniche.md), i numeri in [09](09-bilanciamento.md).
Prototipo approvato delle 7 schermate del telefono: [Space · Prototipo interfaccia](https://claude.ai/artifact/79XXi2Bakn9k9Gp9J6K3So). Per il PC non c'è un prototipo: vale lo schema qui sotto.

## Principi

- Pubblico **80 % PC, 20 % telefono**. Da **1024 px** di larghezza in su c'è la **plancia a finestre** ([PC](#pc--plancia-a-finestre)); sotto resta l'interfaccia a pagine del [telefono](#telefono--pagine-e-barra). Nelle impostazioni si può forzare l'una o l'altra.
- Le due interfacce mostrano **gli stessi contenuti** (Qui, Scanner, Rotta, Diario, Wiki…): cambia solo il contenitore, finestra o pagina.
- La **scena 3D è sempre di fondo** e i pannelli o le finestre stanno sopra.
- **Le azioni si fanno sul posto**: le azioni del luogo stanno in Qui, quelle della base nella scheda BASE quando si è attraccati. Il resto serve a consultare.
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
- **Densità su PC**: bottoni da ~32 px invece di 44-48, tooltip al passaggio del mouse (anche per le ⓘ), menu col tasto destro sui corpi (*Imposta rotta · Apri nella wiki*). Sul telefono restano i bersagli da dito.
- **Accessibilità**: la rarità si distingue per **forma e colore** (● comune, ◆ non comune, ★ raro, ✦ leggendario); ARIA su barre e pannelli.

## PC · plancia a finestre

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│ ◉ FERMA 14·−2·9 FASCIA DI ORAN │ CARB ▰▰▰▰▰▱▱▱ 4,9/9,9 TETTO 50% │ ⚙ MOTORE 10 2:14 │ M▰S▰G▰H▰ │ ARRIVO Fascia… ●3 │ 18:40 │
├───────────────────────────────────────────────────────────────────────────────────────┤
│ ┌ SCANNER ─────────── _ × ┐                                    ┌ ROTTA ────────── _ × ┐ │
│ │ ● Kumion       4,1      │                                    │ meta 3 · −1 · 2       │ │
│ │ ◆ Talir        6,0      │          scena 3D del settore      │ 12 h · arrivo 18:40   │ │
│ └─────────────────────────┘             oppure mappa 3D        │ [ PARTI ]             │ │
│ ┌ QUI ─────────────── _ × ┐                                    └───────────────────────┘ │
│ │ FASCIA DI ORAN …        │                                                              │
│ └─────────────────────────┘                                                              │
├───────────────────────────────────────────────────────────────────────────────────────┤
│ Q S R │ N Nave  E Rete  B Base  T Ricerche │ D Diario● W Wiki C Catalogo G Traguardi │ ⇆ ↺ ⚙ ? │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

- **Barra di stato** in alto, su una riga: stato e luogo · carburante con il tetto · **attività in corso** con conto alla rovescia (potenziamento, ricerca, raccolta a mano) · **stiva in breve** (sei mini barre) · **ultima voce del diario** con le novità (clic → Diario) · **ora del server**. Attività e stiva compaiono con le loro meccaniche.
- **Sfondo**: la scena del settore **oppure** la mappa 3D, scambiate con ⇆ o **Tab**; le finestre restano aperte sopra. Con la mappa, i filtri per tipo e i tasti per ricentrare stanno in una barretta sotto la barra di stato; un clic su un corpo lo mette nella Rotta (e la apre).
- **Dock** in basso, alto ~40 px, in quattro gruppi: *Navigazione* (Qui, Scanner, Rotta) · *Nave e rete* (Nave, Rete, Base, Ricerche) · *Archivio* (Diario, Wiki, Catalogo, Traguardi) · *comandi* (⇆ Scena/Mappa, ↺ Riordina, ⚙ Impostazioni, ? scorciatoie). Finestra aperta = accesa, ridotta = contorno, chiusa = spenta; i **pallini** stanno sulle voci del dock. Su PC non c'è la voce Altro.

### Finestre

| Tasto | Finestra | Contenuto | Da | Misura iniziale |
|---|---|---|---|---|
| Q | **Qui** | scheda del settore dove sta la nave, azioni del luogo (raccogli, fonda, attraversa) | ora | 340 × 300 |
| S | **Scanner** | elenco dal più vicino; clic → Rotta | ora | 340 × 420 |
| R | **Rotta** | meta, anteprima, PARTI | ora | 340 × 320 |
| D | **Diario di bordo** | cronologia, novità evidenziate | ora | 420 × 520 |
| W | **Wiki** | indice a sinistra, pagina a destra | ora | 720 × 560 |
| C | **Catalogo** | album per tipo | ora | 640 × 520 |
| , | **Impostazioni** | suoni, movimento, interfaccia (finestre o pagine) | ora | 380 × 360 |
| N | **Nave** | statistiche, stiva, potenziamenti, coda del cantiere | M4-M5 | 420 × 560 |
| E | **Rete** | insediamenti per riempimento, VAI → Rotta | M4 | 460 × 480 |
| B | **Base** | strutture, cantiere, laboratorio, pieno; nel dock **solo quando si è attraccati**, si apre da sola all'arrivo | M5 | 460 × 560 |
| T | **Ricerche** | grafo dei 4 rami | M6 | 800 × 600 |
| G | **Traguardi** | medaglie per famiglia | M10 | 520 × 480 |

Una finestra compare nel dock quando esiste la sua meccanica.

### Regole delle finestre

- **Una finestra per tipo**: riaprirla la porta in primo piano.
- Titolo maiuscolo spaziato; **_** la riduce nel dock, **×** la chiude. Si **trascina** dal titolo e si **ridimensiona** dall'angolo, con misure minime (react-rnd). Clic → primo piano.
- Le finestre non escono dallo schermo: se la finestra del browser si restringe, rientrano.
- Un'azione che riguarda un'altra finestra la apre o la riporta su: scegliere una meta (scanner, mappa, Rete) apre la Rotta; "Numeri ›" di una ⓘ apre la Wiki su quella pagina.
- In viaggio Scanner e Rotta restano aperte e mostrano "disponibile all'arrivo".
- **Disposizione**: alla prima apertura Qui, Scanner e Rotta. Poi si ricordano **sul dispositivo** le finestre aperte e ridotte, la posizione e la dimensione. **↺ Riordina** torna alla disposizione iniziale.
- **Tastiera**: la lettera della finestra la apre o la chiude, **Tab** scambia scena e mappa, **Esc** chiude la finestra in primo piano, **?** mostra l'elenco. Le lettere non valgono mentre si scrive in un campo.
- **Indirizzo**: solo link diretti. `#/wiki/pulsar`, `#/rotta/x,y,z`, `#/diario` aprono la finestra, poi l'indirizzo si pulisce. La disposizione non va nell'URL.

## Telefono · pagine e barra

Sotto i 1024 px resta l'interfaccia di MI: una pagina alla volta.

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

## Contenuti

I contenuti sono gli stessi su PC e telefono. Sul telefono ognuno è una sezione della barra (o una voce di Altro); su PC è una finestra.

### Ponte

Sul telefono è un pannello con le schede **QUI · SCANNER · ROTTA**, più **BASE** quando la nave è attraccata a una base; su PC sono le finestre Qui, Scanner, Rotta e Base. In cima ci sono le azioni del luogo:

| Dove sei | Azioni |
|---|---|
| Corpo con risorse | RACCOGLI A MANO · FONDA (se si può) |
| Insediamento | nessuna: la raccolta avviene da sola all'arrivo e finisce nel diario |
| Base | scheda **BASE**: cantiere (potenziamenti e coda), strutture (costruisci), laboratorio (avvia una ricerca), PIENO al deposito |
| Wormhole | ATTRAVERSA (50 MO, con conferma) |

**ROTTA**: la meta arriva dallo scanner, dalla mappa, da un insediamento o dalle coordinate. L'anteprima è essenziale: durata, arrivo, carburante e avviso di sosta forzata. Poi PARTI.

### Mappa

Mappa 3D dei settori scansionati, che si apre **centrata sulla nave**. Sul telefono è una sezione; su PC è il secondo sfondo.
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

I pallini segnalano sia ciò che è **successo** sia ciò che è **possibile** adesso. Sul telefono stanno sulla barra, su PC sulle voci del dock (Altro si scompone nelle sue voci).

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
