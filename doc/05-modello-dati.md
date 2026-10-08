# 05 · Modello dati (bozza)

Schema `space`. Ogni tabella ha un riferimento al giocatore (`auth.users`) e la RLS limitata a lui. Le colonne arrivano con il macro step che le usa ([06](06-roadmap.md)); questa è solo la mappa d'insieme.

**I settori non si salvano**: un settore esiste nel database solo quando il giocatore ci fa qualcosa (scoperta, colonia, saccheggio).

| Tabella | Contenuto | Macro step |
|---|---|---|
| `nave` | una riga per giocatore: livelli dei potenziamenti, carburante all'ultimo aggiornamento con il suo istante | M2 |
| `viaggio` | partenza (coordinate, istante), arrivo previsto (coordinate, istante), arrivo effettivo se si ferma prima per il carburante | M2 |
| `scoperta` | coordinate, tipo di corpo, istante della prima visita | M2 |
| `stiva` | quantità per risorsa a bordo | M3 |
| `magazzino` | quantità per risorsa alla base | M3 |
| `colonia` | coordinate, tipo (colonia, estrattore, raccoglitore), istante dell'ultima raccolta, livelli | M3 |
| `esaurito` | settori a raccolta una tantum già svuotati (comete, relitti) | M3 |
| `costruzione` | potenziamento in corso: cosa, dove, fine prevista | M4 |

Regole:
- La **posizione della nave** è l'arrivo dell'ultimo viaggio, se l'istante di arrivo è passato. Altrimenti la nave è in viaggio.
- Il **carburante** è `min(serbatoio, carburante_salvato + ricarica × tempo trascorso)`.
- La **produzione di una colonia** è `min(tetto, tasso × tempo dall'ultima raccolta)`.
- Le scritture passano solo dalle funzioni Postgres ([04](04-architettura.md)).
