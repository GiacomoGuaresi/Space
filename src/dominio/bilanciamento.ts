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
    /** Motore, serbatoio e ricarica crescono di tanto a livello. */
    crescita: 1.12,
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
    /** La base madre produce tanto all'ora, diviso in parti uguali tra le quattro comuni. */
    madre: 6,
    /** Ogni livello di produzione moltiplica il ritmo per tanto. */
    crescita: 1.13,
  },
  fondazione: {
    /** Le basi fondabili, oltre alla base madre (le ricerche le aumenteranno). */
    basi: 2,
    /** La prima base è gratis; le altre costano tanto… */
    costo: 150,
    /** …per tanto alla (basi già fondate − 1), in parti uguali di queste risorse. */
    crescita: 1.6,
    risorse: ['metallo', 'silicio', 'ghiaccio'],
    /** Gli estrattori (doc/09-bilanciamento.md#insediamenti), pagati dalla stiva. */
    estrattore: {
      /** Costano `costo × crescita^(estrattori già fondati)`, in parti uguali di queste risorse. */
      costo: 60,
      crescita: 1.4,
      risorse: ['metallo', 'silicio'],
      /** La ricerca che apre gli estrattori su ogni tipo di corpo (pulsar e buchi neri arrivano con M8-M9). */
      tipi: { asteroidi: 'C2', nebulosa: 'C3', gigante: 'C3' } as Record<string, string>,
      /** Quanti estrattori in più dà ogni ricerca. */
      limite: { C2: 3, C3: 2, C5: 2, C7: 2 } as Record<string, number>,
    },
  },
  cantiere: {
    /** Il costo di un livello è `base × crescita^(livello − 1)`, diviso secondo la ricetta. */
    crescita: 1.45,
    base: {
      motore: 60,
      serbatoio: 60,
      ricarica: 60,
      scanner: 60,
      produzione: 40,
      magazzino: 40,
      deposito: 40,
      cantiere: 50,
    },
    /** Il tempo: `ore × crescitaTempo^(livello − 2) / (1 + riduzione × (cantiere − 1))`. */
    ore: 3,
    crescitaTempo: 1.31,
    riduzione: 0.12,
    /** La nave non supera `tetto × livello del cantiere`. */
    tetto: 2,
    /** Le ricette: dal livello `da`, come si divide il costo (doc/09-bilanciamento.md#ricette). */
    ricette: [
      { da: 1, mix: { metallo: 0.6, silicio: 0.4 } },
      { da: 4, mix: { metallo: 0.5, silicio: 0.3, ghiaccio: 0.2 } },
      { da: 7, mix: { metallo: 0.45, silicio: 0.25, ghiaccio: 0.15, idrogeno: 0.15 } },
      { da: 10, mix: { metallo: 0.4, silicio: 0.25, ghiaccio: 0.15, idrogeno: 0.1, terreRare: 0.1 } },
      { da: 15, mix: { metallo: 0.38, silicio: 0.22, ghiaccio: 0.12, idrogeno: 0.08, terreRare: 0.1, materiaOscura: 0.1 } },
    ],
    /** La stiva: costa questa parte della stiva attuale, con questo mix, e dura sempre tanto. */
    stiva: { quota: 0.4, mix: { metallo: 0.6, silicio: 0.4 }, ore: 1 },
  },
  ricerche: {
    /** Una ricerca di gradino `g` costa come un livello `costo × g` di base `base`, con la stessa ricetta. */
    base: 60,
    costo: 2,
    /** Dura `minuti × gradino`, al massimo `oreMassime`. */
    minuti: 6,
    oreMassime: 1,
    /**
     * I nodi dell'albero (doc/10-ricerche.md): gradino e prerequisiti, cioè il
     * nodo prima nello stesso ramo più gli eventuali altri. P, C, S, I sono
     * Propulsione, Colonizzazione, Sensori, Ingegneria.
     */
    nodi: {
      P1: { gradino: 1, richiede: [] },
      P2: { gradino: 2, richiede: ['P1'] },
      P3: { gradino: 3, richiede: ['P2', 'I3'] },
      P4: { gradino: 4, richiede: ['P3'] },
      P5: { gradino: 5, richiede: ['P4'] },
      P6: { gradino: 6, richiede: ['P5'] },
      P7: { gradino: 7, richiede: ['P6'] },
      P8: { gradino: 8, richiede: ['P7'] },
      P9: { gradino: 9, richiede: ['P8', 'S7'] },
      P10: { gradino: 10, richiede: ['P9'] },
      C1: { gradino: 1, richiede: [] },
      C2: { gradino: 2, richiede: ['C1'] },
      C3: { gradino: 3, richiede: ['C2'] },
      C4: { gradino: 4, richiede: ['C3'] },
      C5: { gradino: 5, richiede: ['C4'] },
      C6: { gradino: 6, richiede: ['C5'] },
      C7: { gradino: 7, richiede: ['C6', 'P6'] },
      C8: { gradino: 8, richiede: ['C7'] },
      C9: { gradino: 9, richiede: ['C8'] },
      C10: { gradino: 10, richiede: ['C9'] },
      S1: { gradino: 1, richiede: [] },
      S2: { gradino: 2, richiede: ['S1'] },
      S3: { gradino: 3, richiede: ['S2'] },
      S4: { gradino: 4, richiede: ['S3'] },
      S5: { gradino: 5, richiede: ['S4'] },
      S6: { gradino: 6, richiede: ['S5'] },
      S7: { gradino: 7, richiede: ['S6'] },
      S8: { gradino: 8, richiede: ['S7', 'S3'] },
      S9: { gradino: 9, richiede: ['S8'] },
      S10: { gradino: 10, richiede: ['S9'] },
      I1: { gradino: 1, richiede: [] },
      I2: { gradino: 2, richiede: ['I1'] },
      I3: { gradino: 3, richiede: ['I2'] },
      I4: { gradino: 4, richiede: ['I3'] },
      I5: { gradino: 5, richiede: ['I4'] },
      I6: { gradino: 6, richiede: ['I5'] },
      I7: { gradino: 7, richiede: ['I6'] },
      I8: { gradino: 8, richiede: ['I7'] },
      I9: { gradino: 9, richiede: ['I8'] },
      I10: { gradino: 10, richiede: ['I9'] },
    },
    /** I nodi che si possono già ricercare: gli altri arrivano con le loro meccaniche (doc/06-roadmap.md). */
    attive: ['I1', 'I2', 'I3', 'I4', 'I5', 'C1', 'C2', 'C3', 'C4', 'S1', 'S2', 'S3', 'S4', 'P1', 'P2'] as string[],
    /** Gli effetti, con i loro numeri. */
    effetti: {
      /** Automazione: tempi di costruzione −10 %. */
      I1: 0.1,
      /** Stiva modulare: +15 %. */
      I2: 0.15,
      /** Leghe: Metallo e Silicio nelle ricette −10 %. */
      I4: 0.1,
      /** Astrofisica I: basi fondabili in più. */
      C1: 2,
      /** Magazzini modulari: tetto +20 %. */
      C4: 0.2,
      /** Raffinazione I: Idrogeno per unità di carburante in meno al deposito. */
      P1: 1,
      /** Iniettori: consumo −10 %. */
      P2: 0.1,
    },
  },
  deposito: {
    /** Il pieno al deposito: tanto Idrogeno per unità di carburante, per tanto a ogni livello. */
    idrogeno: 5,
    crescita: 0.9,
  },
  magazzino: {
    /** Il tetto di un magazzino: tante ore della produzione di livello 1… */
    ore: 168,
    /** …moltiplicate per tanto a ogni livello del magazzino. */
    crescita: 1.45,
  },
  cometa: {
    /** Arrivando su una cometa, una volta sola: tanto Ghiaccio per la ricchezza… */
    ghiaccio: 200,
    /** …e, se la coda è lunga almeno così, anche Idrogeno. */
    codaLunga: 0.8,
    idrogeno: 50,
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
