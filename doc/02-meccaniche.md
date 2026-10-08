# 02 · Meccaniche

I valori numerici sono provvisori ([Q&A](../Q&A.md)): quelli della navigazione stanno in `src/dominio/navigazione.ts` e nei default di `space.nave`, e vanno cambiati in entrambi i posti.

## Ciclo di gioco

```
esplora → scopri → raccogli → colonizza → torna a raccogliere → potenzia → esplora più lontano
```

## Nave

- **Una sola**, per sempre. Parte dalla **base** in `(0, 0, 0)`.
- Caratteristiche, tutte potenziabili ([Potenziamenti](#potenziamenti)): **velocità** del motore, **serbatoio**, **ricarica** del carburante, **stiva**, **raggio dello scanner**.

## Viaggio

- Si sceglie un settore di arrivo e si parte. Durante il viaggio la nave non può fare altro.
- **Durata** = distanza / velocità. La nave iniziale fa **12 settori all'ora** (5 minuti a settore): i salti vicini durano minuti, quelli lunghi ore.
- **Distanza** euclidea tra le coordinate. La rotta è un segmento.
- **Carburante** consumato in proporzione alla distanza: un'unità per settore. Il **serbatoio** iniziale ne contiene **20**.
- **Carburante insufficiente**: si può partire lo stesso, ma la nave si ferma nel settore della rotta più vicino al punto in cui il serbatoio si svuota (senza superarlo), e lì aspetta. Se non basta nemmeno per un settore, non si parte.
- **Ricarica**: solo da fermi, **2,5 unità all'ora** (da vuoto a pieno in 8 ore).
- Durante il viaggio lo scanner e la rotta non sono disponibili; la meta non si cambia e il viaggio non si annulla ([Q&A](../Q&A.md), domanda 9).

## Scanner

- Mostra il tipo dei corpi entro **3 settori** dalla nave (distanza euclidea), dal più vicino; il nome si scopre solo arrivando.
- Il raggio dipende dal potenziamento e da alcuni corpi (ridotto nelle nebulose, doppio presso le pulsar).

## Scoperte

- La prima volta che la nave arriva in un settore non vuoto, il corpo entra nel **catalogo personale**. Il database la registra alla partenza con l'istante d'arrivo, e la mostra solo da quel momento.
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
