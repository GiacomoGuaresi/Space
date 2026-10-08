// I numeri del gioco (doc/09-bilanciamento.md) in un posto solo. Il database
// ha la stessa tabella in `space.bilanciamento()` (supabase/sql/): se cambia un
// valore qui, cambia anche là, e `npm run verifica-sql` controlla che siano
// uguali. Solo dati semplici, così il confronto è un confronto di JSON.

export const BILANCIAMENTO = {
  universo: {
    /** La probabilità che un settore non sia vuoto, uguale ovunque. */
    pienezza: 0.1,
    /** Oltre questa distanza dalla base i pesi sono quelli "lontani" e non cambiano più. */
    distanzaLontana: 500,
    /**
     * Pesi dei corpi tra i settori non vuoti, alla base e da `distanzaLontana`
     * in poi; in mezzo si passa dagli uni agli altri in modo lineare.
     */
    pesiVicini: {
      asteroidi: 30,
      nebulosa: 25,
      stella: 25,
      sistema: 12,
      gigante: 4,
      cometa: 4,
      pulsar: 0.5,
      buconero: 0,
      relitto: 0,
      wormhole: 0,
    },
    pesiLontani: {
      asteroidi: 22,
      nebulosa: 18,
      stella: 18,
      sistema: 14,
      gigante: 7,
      cometa: 6,
      pulsar: 5,
      buconero: 4,
      relitto: 4,
      wormhole: 2,
    },
  },
  nave: {
    /** La nave al livello 1: settori all'ora, unità di carburante, unità all'ora da ferma. */
    velocita: 12,
    serbatoio: 20,
    ricarica: 2.5,
  },
  carburante: {
    /** Fin dove si ricarica il serbatoio fuori dalle basi e lontano dalle stelle. */
    tettoFuori: 1,
    /** Accanto a una stella la ricarica è più veloce. */
    ricaricaStella: 3,
  },
  fionda: {
    /** Partendo da un buco nero la nave va più veloce… */
    velocita: 2,
    /** …e questa parte della rotta non consuma carburante. */
    gratis: 0,
  },
  scanner: {
    /** Il raggio al livello 1, in settori. */
    raggio: 3,
  },
} as const
