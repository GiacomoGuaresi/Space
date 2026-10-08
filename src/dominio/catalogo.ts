// Il catalogo dei corpi celesti (doc/03-universo.md): un solo posto per tipi,
// rarità, risorse, colonie ed effetti, condiviso da grafica, scanner e test.

export type TipoCorpo =
  | 'asteroidi'
  | 'nebulosa'
  | 'stella'
  | 'sistema'
  | 'gigante'
  | 'cometa'
  | 'pulsar'
  | 'buconero'
  | 'relitto'
  | 'wormhole'

export type Rarita = 'comune' | 'non comune' | 'rara' | 'leggendaria'

export type Risorsa = 'metallo' | 'silicio' | 'idrogeno' | 'ghiaccio' | 'terreRare' | 'materiaOscura'

export type Colonia = 'colonia' | 'estrattore' | 'raccoglitore'

export interface VoceCatalogo {
  nome: string
  rarita: Rarita
  risorse: readonly Risorsa[]
  colonia: Colonia | null
  /** L'effetto sul gioco, a parole (doc/02-meccaniche.md). */
  effetto: string | null
}

export const CATALOGO: Readonly<Record<TipoCorpo, VoceCatalogo>> = {
  asteroidi: {
    nome: 'Campo di asteroidi',
    rarita: 'comune',
    risorse: ['metallo', 'silicio'],
    colonia: 'estrattore',
    effetto: null,
  },
  nebulosa: {
    nome: 'Nebulosa',
    rarita: 'comune',
    risorse: ['idrogeno'],
    colonia: 'raccoglitore',
    effetto: 'Scanner ridotto all’interno',
  },
  stella: {
    nome: 'Stella solitaria',
    rarita: 'comune',
    risorse: [],
    colonia: null,
    effetto: 'Carburante ricaricato più in fretta durante la sosta',
  },
  sistema: {
    nome: 'Sistema planetario',
    rarita: 'non comune',
    risorse: ['metallo', 'silicio', 'ghiaccio'],
    colonia: 'colonia',
    effetto: null,
  },
  gigante: {
    nome: 'Gigante gassoso errante',
    rarita: 'non comune',
    risorse: ['idrogeno', 'ghiaccio'],
    colonia: 'raccoglitore',
    effetto: null,
  },
  cometa: {
    nome: 'Cometa',
    rarita: 'non comune',
    risorse: ['ghiaccio'],
    colonia: null,
    effetto: 'Si raccoglie una volta sola',
  },
  pulsar: {
    nome: 'Pulsar',
    rarita: 'rara',
    risorse: ['terreRare'],
    colonia: 'estrattore',
    effetto: 'Scanner con raggio doppio durante la sosta',
  },
  buconero: {
    nome: 'Buco nero',
    rarita: 'rara',
    risorse: ['materiaOscura'],
    colonia: null,
    effetto: 'Fionda: il viaggio che parte da qui è più veloce',
  },
  relitto: {
    nome: 'Relitto alieno',
    rarita: 'rara',
    risorse: ['materiaOscura'],
    colonia: null,
    effetto: 'Si saccheggia una volta sola',
  },
  wormhole: {
    nome: 'Wormhole',
    rarita: 'leggendaria',
    risorse: [],
    colonia: null,
    effetto: 'Porta in un settore lontano, sempre lo stesso',
  },
}

export const TIPI = Object.keys(CATALOGO) as TipoCorpo[]

export const NOMI_RISORSE: Readonly<Record<Risorsa, string>> = {
  metallo: 'Metallo',
  silicio: 'Silicio',
  idrogeno: 'Idrogeno',
  ghiaccio: 'Ghiaccio',
  terreRare: 'Terre rare',
  materiaOscura: 'Materia oscura',
}

export const NOMI_COLONIE: Readonly<Record<Colonia, string>> = {
  colonia: 'Colonia',
  estrattore: 'Estrattore',
  raccoglitore: 'Raccoglitore di gas',
}

// Valori provvisori (Q&A, giro 2, domanda 3) ---------------------------------

/** La probabilità che un settore non sia vuoto, uguale ovunque. */
export const PIENEZZA = 0.1

/** Oltre questa distanza dalla base i pesi sono quelli "lontani" e non cambiano più. */
export const DISTANZA_LONTANA = 500

/**
 * Pesi dei corpi tra i settori non vuoti, alla base e da `DISTANZA_LONTANA` in
 * poi; in mezzo si passa dagli uni agli altri in modo lineare. Vicino alla base
 * ci sono quasi solo corpi comuni.
 */
const PESI_VICINI: Readonly<Record<TipoCorpo, number>> = {
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
}

const PESI_LONTANI: Readonly<Record<TipoCorpo, number>> = {
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
}

/** I pesi dei corpi alla distanza `d` dalla base. */
export function pesi(d: number): Record<TipoCorpo, number> {
  const t = Math.min(1, Math.max(0, d / DISTANZA_LONTANA))
  const risultato = {} as Record<TipoCorpo, number>
  for (const tipo of TIPI) risultato[tipo] = PESI_VICINI[tipo] + (PESI_LONTANI[tipo] - PESI_VICINI[tipo]) * t
  return risultato
}

/**
 * Il moltiplicatore medio della ricchezza alla distanza `d`: 1 alla base,
 * poi cresce senza limite ma sempre più piano (×2 a 100 settori, ×3 a 400).
 */
export function ricchezzaMedia(d: number): number {
  return 1 + Math.sqrt(Math.max(0, d) / 100)
}
