# 05 · Modello dati (bozza)

Schema `space`. Le colonne arrivano con lo step che le usa ([06](06-roadmap.md)); questa è solo la mappa d'insieme. Ogni tabella ha un riferimento al giocatore (`auth.users`) e la RLS è limitata a lui, tranne gli insediamenti, che in futuro saranno condivisi ([02](02-meccaniche.md#altri-giocatori-più-avanti)).

**I settori non si salvano**: un settore esiste nel database solo quando il giocatore ci fa qualcosa (scoperta, insediamento, raccolta una tantum).

| Tabella | Contenuto | Step |
|---|---|---|
| `nave` ✅ | una riga per giocatore: dove si trova o arriverà (`x`, `y`, `z`), da quando (`dal`), il carburante a quell'istante; poi i livelli di motore, serbatoio, ricarica, stiva e scanner, e l'eventuale attività in corso (raccolta a mano, potenziamento, ricerca) | M2, M3, M5 |
| `viaggio` ✅ | da, meta, a (dove si arriva davvero), partenza, arrivo, consumo, fionda; poi ponte e wormhole | M2, M8, M9 |
| `scoperta` ✅ | coordinate, tipo di corpo, istante della prima visita (nascosta finché la nave non arriva) | M2 |
| `scansione` | centro, raggio e livello dello scanner di ogni sosta: da qui si ricalcola la mappa dei settori scansionati | M3 |
| `stiva` | quantità per risorsa a bordo | M4 |
| `insediamento` | coordinate, tipo (base, estrattore), fondatore (etichetta), fondazione, ultima raccolta, scorte a quell'istante, livelli di produzione e magazzino; la base madre è la prima riga | M4 |
| `struttura` | insediamento, tipo (cantiere, laboratorio, deposito, radar, ponte), livello | M5, M7, M8 |
| `costruzione` | coda: cosa (statistica della nave, struttura, produzione), dove, inizio, fine | M5 |
| `ricerca` | nodo, livello (1 per gli sblocchi, N per i nodi infiniti), completamento | M6 |
| `raccolto` | settori a raccolta una tantum già svuotati da questo giocatore (comete, relitti) | M4, M9 |
| `traguardo` | codice, istante | M10 |

Le tabelle si leggono e basta. Si scrive solo con le funzioni Postgres (`space.stato()`, `space.viaggia(x, y, z)` e, man mano, `raccogli`, `fonda`, `potenzia`, `ricerca`, `abbandona`, `accelera`…), che rifiutano con un codice (`in_viaggio`, `carburante_insufficiente`, `risorse_insufficienti`, `nave_occupata`…).

Regole, tutte calcolate alla lettura:
- La **posizione della nave** è l'arrivo dell'ultimo viaggio, se l'istante di arrivo è passato. Altrimenti la nave è in viaggio.
- Il **carburante** è `min(tetto, carburante_salvato + ricarica × tempo trascorso)`, dove il tetto è il 50 % del serbatoio fuori dalle basi e il 100 % in base o accanto a una stella.
- La **produzione di un insediamento** per ogni risorsa è `min(tetto, scorta_salvata + ritmo × tempo dall'ultima raccolta)`.
- Una **costruzione** è finita se `fine <= now()`. Il livello si legge applicando le costruzioni finite.
- Le scritture passano solo dalle funzioni Postgres ([04](04-architettura.md)).
