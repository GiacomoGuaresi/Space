# 02 · Meccaniche

I valori numerici (durate, capacità, tassi) sono ancora da fissare ([Q&A](../Q&A.md)); qui c'è come funzionano le cose.

## Ciclo di gioco

```
esplora → scopri → raccogli → colonizza → torna a raccogliere → potenzia → esplora più lontano
```

## Nave

- **Una sola**, per sempre. Parte dalla **base** in `(0, 0, 0)`.
- Caratteristiche, tutte potenziabili ([Potenziamenti](#potenziamenti)): **velocità** del motore, **serbatoio**, **ricarica** del carburante, **stiva**, **raggio dello scanner**.

## Viaggio

- Si sceglie un settore di arrivo e si parte. Durante il viaggio la nave non può fare altro.
- **Durata** in funzione della distanza e della velocità: i salti vicini durano minuti, quelli lunghi ore. La scelta è del giocatore.
- **Distanza** euclidea tra le coordinate. La rotta è un segmento.
- **Carburante** consumato in proporzione alla distanza.
- **Carburante insufficiente**: si può partire lo stesso, ma la nave si ferma nel settore più vicino al punto della rotta in cui il serbatoio si svuota, e lì aspetta.
- **Ricarica**: il carburante si ricarica da solo nel tempo, fino al serbatoio pieno, anche durante la sosta.
- Annullare un viaggio a metà: da decidere ([Q&A](../Q&A.md)).

## Scanner

- Mostra il tipo dei corpi nei settori entro un certo raggio dalla nave.
- Il raggio dipende dal potenziamento e da alcuni corpi (ridotto nelle nebulose, doppio presso le pulsar).

## Scoperte

- La prima volta che la nave arriva in un settore non vuoto, il corpo entra nel **catalogo personale**.
- Il catalogo è la parte collezionabile: corpi scoperti per tipo e rarità, con nome, coordinate e data.

## Risorse

Nomi provvisori, usi da definire ([Q&A](../Q&A.md)):

| Risorsa | Da dove viene |
|---|---|
| **Metallo** | asteroidi, sistemi planetari |
| **Silicio** | asteroidi, sistemi planetari |
| **Idrogeno** | nebulose, giganti gassosi; si raffina in **carburante** alla base |
| **Ghiaccio** | comete, giganti gassosi, sistemi planetari |
| **Terre rare** | pulsar |
| **Materia oscura** *(speciale)* | buchi neri, relitti; rara |

- **Raccolta**: in un settore con risorse la nave le carica nella **stiva**, fino a riempirla.
- **Scarico**: alla base la stiva si svuota nel magazzino, e solo da lì le risorse si possono spendere.

## Colonie

Alla Spore:

- Si fondano sui corpi che lo permettono ([03](03-universo.md)): **colonie vere** sui sistemi planetari, **estrattori** e **raccoglitori di gas** su asteroidi, nebulose, giganti gassosi e pulsar.
- Producono risorse nel tempo **fino a un tetto di magazzino**, poi si fermano.
- Per incassare bisogna **tornare sul posto** con la nave e caricare la produzione nella stiva.
- La produzione si calcola alla lettura: `min(tetto, tasso × tempo dall'ultima raccolta)`.
- In futuro, con altri giocatori, chi arriva prima potrà rubare la produzione.

## Effetti dei corpi

Pochi e semplici, nessun pericolo:

| Corpo | Effetto |
|---|---|
| Stella solitaria | carburante ricaricato più in fretta durante la sosta |
| Nebulosa | scanner ridotto all'interno |
| Pulsar | scanner con raggio doppio durante la sosta |
| Buco nero | fionda: il viaggio che parte da qui è più veloce |
| Relitto alieno | si saccheggia una volta sola |
| Cometa | si raccoglie una volta sola |
| Wormhole | porta in un settore lontano, sempre lo stesso |

## Potenziamenti

Costano risorse e **tempo reale** di costruzione.

| Dove | Potenziamento |
|---|---|
| Nave | motore (velocità), serbatoio, ricarica, stiva, scanner |
| Base | raffineria (Idrogeno → carburante), magazzino, cantiere (tempi di costruzione) |
| Colonie | tasso di produzione, tetto di magazzino |

## Riepilogo all'apertura

Niente notifiche: all'apertura si vede cosa è successo dall'ultima volta (arrivi, soste forzate, colonie piene, costruzioni finite).
