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
     * in poi; in mezzo si passa dagli uni agli altri in modo lineare. I rari
     * seguono invece `soglie`.
     */
    pesiVicini: {
      asteroidi: 30,
      nebulosa: 25,
      stella: 25,
      sistema: 12,
      gigante: 4,
      cometa: 4,
      pulsar: 0,
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
    /**
     * I rari non esistono sotto la loro soglia di distanza; sopra, il peso sale
     * in modo lineare da 0 fino a quello lontano, a `distanzaLontana`.
     */
    soglie: {
      pulsar: 25,
      buconero: 80,
      relitto: 80,
      wormhole: 150,
    },
  },
  nave: {
    /** La nave al livello 1: settori all'ora, unità di carburante, unità all'ora da ferma. */
    velocita: 0.25,
    serbatoio: 4,
    ricarica: 0.4,
  },
  carburante: {
    /** Fin dove si ricarica il serbatoio fuori dalle basi e lontano dalle stelle. */
    tettoFuori: 0.5,
    /** Accanto a una stella la ricarica è più veloce. */
    ricaricaStella: 2,
  },
  fionda: {
    /** Partendo da un buco nero la nave va più veloce… */
    velocita: 1.5,
    /**
     * …e questa parte dei settori percorsi non consuma carburante. Dei
     * percorsi, non della rotta chiesta: con una meta lontanissima la nave si
     * ferma prima, e il tratto gratis non cresce.
     */
    gratis: 0.2,
  },
  scanner: {
    /** Il raggio al livello 1, in settori. */
    raggio: 4,
    /** Ogni livello "raggio" lo moltiplica per tanto. */
    crescita: 1.2,
    /**
     * Cosa porta ogni livello, dal primo: un tipo rilevabile o più raggio, in
     * ordine di utilità. Oltre l'elenco ogni livello dà solo raggio.
     */
    livelli: [
      'sistema',
      'raggio',
      'asteroidi',
      'raggio',
      'nebulosa',
      'raggio',
      'stella',
      'raggio',
      'gigante',
      'raggio',
      'cometa',
      'raggio',
      'pulsar',
      'raggio',
      'raggio',
      'buconero',
      'raggio',
      'relitto',
      'raggio',
      'raggio',
      'wormhole',
    ],
    /** Dentro una nebulosa il raggio si riduce, in sosta presso una pulsar cresce. */
    nebulosa: 0.5,
    pulsar: 2,
  },
  stiva: {
    /** La capacità per ogni risorsa al livello 1… */
    capacita: 25,
    /** …moltiplicata per tanto a ogni livello. */
    crescita: 1.5,
  },
  produzione: {
    /** Risorse all'ora di un estrattore di livello 1 su un corpo di ricchezza 1. */
    ritmo: { comune: 7, terreRare: 3, materiaOscura: 1.2 },
    /** La raccolta a mano, in sosta, vale tanti estrattori di livello 1 su quel corpo. */
    mano: 3,
  },
  /**
   * Come si divide la produzione di un corpo tra le risorse, per sottotipo
   * (doc/09-bilanciamento.md#produzione). Un sistema planetario segue il
   * pianeta: la raccolta a mano fa la media dei suoi pianeti.
   */
  mix: {
    asteroidi: {
      metallica: { metallo: 0.8, silicio: 0.2 },
      silicea: { metallo: 0.2, silicio: 0.8 },
      mista: { metallo: 0.5, silicio: 0.5 },
    },
    nebulosa: { idrogeno: 1 },
    gigante: {
      senza: { idrogeno: 0.7, ghiaccio: 0.3 },
      anelli: { idrogeno: 0.5, ghiaccio: 0.5 },
    },
    pianeti: {
      roccioso: { metallo: 0.5, silicio: 0.5 },
      oceanico: { metallo: 0.2, silicio: 0.2, ghiaccio: 0.6 },
      ghiacciato: { ghiaccio: 0.8, silicio: 0.2 },
      gassoso: { idrogeno: 0.7, ghiaccio: 0.3 },
    },
  },
} as const
