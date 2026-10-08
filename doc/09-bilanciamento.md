# 09 · Bilanciamento

Formule e valori del gioco (modello **v1**), verificati con le simulazioni in [`sim/`](../sim/). Unità: distanza in **settori**, tempo in **ore**, carburante in **unità** (1 unità = 1 settore). Le regole stanno in [02](02-meccaniche.md).

```sh
python3 sim/rari.py                    # a che distanza si trova il primo corpo di ogni tipo
python3 sim/economia.py                # un giocatore simulato per 365 giorni, con i valori di questa pagina
python3 sim/economia.py gc=1.5 t0=2    # stessa cosa cambiando dei parametri
```

`sim/economia.py` è il caso migliore: il giocatore non sbaglia mai, e la raccolta è descritta in media (~1-2 visite al giorno), non giro per giro.

## Ritmo atteso

| Giorno | Livello nave | Settori al giorno | Frontiera | Basi | Estrattori | Ricerche | Livello più lungo |
|---|---|---|---|---|---|---|---|
| 1 | 1 | 3,5 | — | 1 (gratis) | 0 | 0 | — |
| 30 | 5-6 | 5,5 | **24** → primi pulsar | 2 | 3 | 2 | 5 h |
| 60 | 9 | 8,7 | 63 | 4 | 5 | 10 | 12 h |
| 90 | 13 | 13,6 | 128 → buchi neri, wormhole | 4 | 7 | 14 | 1,3 giorni |
| 180 | 17 | 21,5 | **502** → zona lontana | 6 | 9 | 22 | 3,3 giorni |
| 365 | 20 | 30 | 1.640 | 6 | 9 | 30 | **~6 giorni** |

Il freno cambia nel tempo: all'inizio il **Metallo**, dal mese 3-4 la **Materia oscura**. La **logistica** (quante visite si fanno) limita tutto il resto. Il ponte di curvatura non cambia i livelli, ma porta la frontiera ai 500 settori entro il mese 6.

## Nave

Ogni statistica vale `base × crescita^(livello − 1)`.

| Statistica | Base | Crescita | Liv. 10 | Liv. 20 |
|---|---|---|---|---|
| Motore (settori/h) | 0,25 | ×1,12 | 0,69 | 2,1 |
| Serbatoio (unità) | 4 | ×1,12 | 11 | 34 |
| Ricarica (unità/h) | 0,4 | ×1,12 | 1,1 | 3,4 |
| Stiva (per risorsa) | 25 | ×1,50 | 961 | 55.400 |

- **Stiva**: sempre sbloccata, costa il **40 % della stiva attuale** (60 % Metallo, 40 % Silicio) e si costruisce in **1 h** fissa. Cresce come i costi, quindi a livelli pari porta ~4 volte le Terre rare di un livello.
- **Tetto della nave**: nessuna statistica può superare il livello `2 × livello del cantiere` in cui si costruisce.

## Carburante

- Consumo: 1 unità per settore.
- Ricarica da fermi, alla velocità della statistica Ricarica, fino a un tetto: **50 %** del serbatoio fuori dalle basi, **100 %** in base o accanto a una **stella**, dove la ricarica è anche **×2** (×3 con *Vele solari*).
- **Deposito**: pieno istantaneo a **5 Idrogeno per unità**, che le ricerche Raffinazione I-IV portano a 4, 3, 2, 1. Ogni livello del deposito lo moltiplica per 0,9.
- **Ponte di curvatura**: velocità ×3 e carburante ×1/3 (×4 e ×1/4 con *Ponte risonante*).
- **Fionda** (partendo da un buco nero): velocità ×1,5 e il **20 %** dei settori percorsi senza consumo (×2 e 30 % con *Fionda gravitazionale*). Conta la rotta percorsa, non quella chiesta: se il carburante non basta, il tratto gratis non cresce allungando la meta.

## Distribuzione dei corpi

- **Un settore su dieci** non è vuoto, ovunque. Il corpo più vicino è in media a ~1,2 settori.
- I pesi dei comuni passano in modo lineare da "vicini" a "lontani" entro **500 settori** (valori attuali di `catalogo.ts`).
- I **rari** hanno una **soglia**: sotto quella distanza non esistono, sopra il peso sale in modo lineare fino al valore "lontano" a 500 settori.

| Tipo | Soglia | Peso lontano | 50 % di trovarne uno entro |
|---|---|---|---|
| Pulsar | 25 | 5 | ~29 settori |
| Buco nero | 80 | 4 | ~81 |
| Relitto | 80 | 4 | ~81 |
| Wormhole | 150 | 2 | ~151 |

- **Ricchezza** media `1 + √(d / 100)` (×2 a 100 settori, ×3 a 400); ogni corpo varia tra ×0,6 e ×1,4.

## Scanner

Raggio iniziale **4 settori** (~27 corpi, di cui ~3 sistemi planetari). I livelli sbloccano un **tipo** oppure danno **raggio ×1,2**; dopo il wormhole danno solo raggio. Dentro una nebulosa il raggio si dimezza (non più con *Filtri nebulari*), in sosta presso una pulsar raddoppia (×3 con *Interferometria*).

| Liv. | Sblocca | Raggio | Corpi nel raggio |
|---|---|---|---|
| 1 | **sistemi planetari** | 4,0 | ~27 |
| 2 | raggio | 4,8 | ~46 |
| 3 | **asteroidi** | 4,8 | ~46 |
| 4 | raggio | 5,8 | ~80 |
| 5 | **nebulose** | 5,8 | ~80 |
| 6 | raggio | 6,9 | ~138 |
| 7 | **stelle** | 6,9 | ~138 |
| 8 | raggio | 8,3 | ~239 |
| 9 | **giganti** | 8,3 | ~239 |
| 10 | raggio | 10,0 | ~413 |
| 11 | **comete** | 10,0 | ~413 |
| 12 | raggio | 11,9 | ~714 |
| 13 | **pulsar** | 11,9 | ~714 |
| 14-15 | raggio | 17,2 | ~2.100 |
| 16 | **buchi neri** | 17,2 | ~2.100 |
| 17 | raggio | 20,6 | ~3.700 |
| 18 | **relitti** | 20,6 | ~3.700 |
| 19-20 | raggio | 29,7 | ~11.000 |
| 21 | **wormhole** | 29,7 | ~11.000 |
| 22+ | raggio ×1,2 | | |

## Costi e tempi

- **Costo** di un livello: `base × 1,45^(livello − 1)`, diviso tra le risorse secondo la ricetta del gradino.
- **Tempo**: `3 h × 1,31^(livello − 2) / (1 + 0,12 × (cantiere − 1))`, ridotto del 10 % da *Automazione* e del 15 % da *Automazione II*. Per le strutture conta il cantiere della base, se c'è.
- Un livello si paga solo se, **per ogni risorsa**, il costo non supera **stiva + magazzino della base**.

| Cosa | Base del costo |
|---|---|
| Motore, serbatoio, ricarica, scanner | 60 |
| Produzione di un insediamento | 40 |
| Magazzino, deposito, radar | 40 |
| Cantiere | 50 |
| Laboratorio, livello `L` | come una ricerca di gradino `L` |
| Ponte di curvatura | come un livello 8 di base 40, una volta sola |

### Ricette

| Livello | Metallo | Silicio | Ghiaccio | Idrogeno | Terre rare | Materia oscura |
|---|---|---|---|---|---|---|
| 1-3 | 60 % | 40 % | | | | |
| 4-6 | 50 % | 30 % | 20 % | | | |
| 7-9 | 45 % | 25 % | 15 % | 15 % | | |
| 10-14 | 40 % | 25 % | 15 % | 10 % | 10 % | |
| 15+ | 38 % | 22 % | 12 % | 8 % | 10 % | 10 % |

## Produzione

- **Base madre**: 6/h in tutto, divisi in parti uguali tra Metallo, Silicio, Ghiaccio e Idrogeno; ×1,13 per livello di produzione.
- **Insediamento**: `ritmo × ricchezza × 1,13^(livello − 1)`, diviso secondo il mix del sottotipo. Il ritmo vale **7/h** per le risorse comuni, **3/h** per le Terre rare e **1,2/h** per la Materia oscura.
- **Tetto** del magazzino = **168 h** di produzione al livello 1, ×1,45 per livello di magazzino. Visto che la produzione cresce solo di ×1,13, alzare il magazzino allunga il tempo tra due visite.
- **Raccolta a mano**: in sosta su un corpo con risorse, **3 volte** un estrattore di livello 1 su quel corpo. Su un sistema planetario il mix è la media dei suoi pianeti.

| Corpo | Sottotipo | Mix |
|---|---|---|
| Asteroidi | metallici / silicei / misti | M 80 S 20 · M 20 S 80 · M 50 S 50 |
| Nebulosa | (la densità dà la ricchezza) | H 100 |
| Gigante gassoso | senza / con anelli | H 70 G 30 · H 50 G 50 |
| Sistema planetario | pianeta della colonia: roccioso / oceanico / ghiacciato / gassoso | M 50 S 50 · M 20 S 20 G 60 · G 80 S 20 · H 70 G 30 |
| Pulsar | — | Terre rare 100 |
| Buco nero | (la massa dà la ricchezza) | Materia oscura 100 |

## Insediamenti

- **Fondazione**, pagata dalla stiva: la prima base è **gratis**, le altre costano `150 × 1,6^(basi fondate − 1)` in parti uguali di Metallo, Silicio e Ghiaccio. Un estrattore costa `60 × 1,4^(estrattori)` in Metallo e Silicio.
- **Basi fondabili**: 2, +2 per ciascuna *Astrofisica* (I, II, III), +1 ogni 2 livelli di *Colonizzazione avanzata*.
- **Estrattori**: 3 con *Estrattori minerari*, +2 ciascuno con *Raccoglitori di gas*, *Estrattori stellari* e *Contenimento gravitazionale*, +1 per livello di *Colonizzazione avanzata*.

## Strutture

| Struttura | Effetto per livello |
|---|---|
| Magazzino | tetto ×1,45 |
| Laboratorio | ricerche fino al gradino = livello |
| Cantiere | tempi ÷ `(1 + 0,12 × (liv − 1))`; nave fino al livello `2 × liv` |
| Deposito | Idrogeno per unità ×0,9 |
| Radar | raggio `4 × 1,2^(liv − 1)`, con gli stessi tipi rilevati dallo scanner della nave |
| Ponte di curvatura | non ha livelli |

## Ricerche

- **Costo**: come un livello `2 × gradino` di base 60 (stessa ricetta), quindi Terre rare dal gradino 5 e Materia oscura dal gradino 8. I nodi infiniti costano come il livello `20 + livello del nodo`.
- **Durata**: `6 min × gradino`, al massimo 1 h. La nave resta ferma.
- **Laboratorio**: livello almeno pari al gradino.

## Materia oscura

Un estrattore su un buco nero a ~100 settori ne dà ~58 al giorno.

- **Accelerare**: `2 × ore^1,5` MO. 1 h → 2 · 6 h → 29 · 24 h → 235 · 1 settimana → 4.355. Vale per viaggi, costruzioni e ricarica.
- **Wormhole**: **50 MO** fissi. L'uscita sta in una direzione dal seed, a 300-1500 settori; senso unico.

## Comete e relitti

Una volta **per giocatore**; l'esito viene dal seed del settore, quindi è lo stesso per tutti.

- **Cometa**: `200 × ricchezza` di Ghiaccio, più `50 × ricchezza` di Idrogeno se la coda è almeno 0,8, fino a riempire la stiva; il resto si perde.
- **Relitto**: `30 × ricchezza` di Materia oscura e un carico di risorse pari al 50 % della stiva, con la ricetta del gradino raggiunto. Nel **30 %** dei casi c'è anche un **progetto**: la prossima ricerca costa la metà. Con *Recupero* il bottino raddoppia e il progetto esce nel 50 % dei casi.

## Traguardi

| Famiglia | Traguardi |
|---|---|
| Distanza | 10, 25, 50, 100, 250, 500, 1.000, 2.500, 5.000, 10.000 settori dalla base madre |
| Catalogo | primo corpo di ogni tipo · 10, 100, 1.000 corpi scoperti · tutti i sottotipi di un tipo · catalogo completo |
| Infrastruttura | prima base · 3, 5, 10 basi · primo estrattore di ogni tipo · primo ponte · rete di ponti lunga 100, 500 settori |
| Imprese | viaggio singolo di 10, 50, 200 settori · primo wormhole · 1.000, 10.000, 100.000 settori percorsi · una statistica al livello 10, 20, 30 · tutte le 42 ricerche |
