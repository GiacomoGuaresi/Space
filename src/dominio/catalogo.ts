// Il catalogo dei corpi celesti (doc/03-universo.md): un solo posto per tipi,
// rarità, risorse, colonie ed effetti, condiviso da grafica, scanner e test.

import { BILANCIAMENTO } from './bilanciamento'

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
    effetto: 'In sosta il serbatoio si ricarica fino al pieno, e più in fretta',
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
    effetto: 'Fionda: il viaggio che parte da qui è più veloce e consuma meno',
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

// Distribuzione (doc/09-bilanciamento.md#distribuzione-dei-corpi) --------------

const { distanzaLontana, pesiVicini, pesiLontani, soglie } = BILANCIAMENTO.universo
const SOGLIE: Partial<Record<TipoCorpo, number>> = soglie

export const PIENEZZA = BILANCIAMENTO.universo.pienezza
export const DISTANZA_LONTANA = distanzaLontana

/**
 * I pesi dei corpi alla distanza `d` dalla base: i comuni passano dai vicini
 * ai lontani, i rari compaiono ad anelli oltre la loro soglia.
 */
export function pesi(d: number): Record<TipoCorpo, number> {
  const t = Math.min(1, Math.max(0, d / distanzaLontana))
  const risultato = {} as Record<TipoCorpo, number>
  for (const tipo of TIPI) {
    const soglia = SOGLIE[tipo]
    risultato[tipo] =
      soglia === undefined
        ? pesiVicini[tipo] + (pesiLontani[tipo] - pesiVicini[tipo]) * t
        : d < soglia
          ? 0
          : pesiLontani[tipo] * Math.min(1, (d - soglia) / (distanzaLontana - soglia))
  }
  return risultato
}

/**
 * Il moltiplicatore medio della ricchezza alla distanza `d`: 1 alla base,
 * poi cresce senza limite ma sempre più piano (×2 a 100 settori, ×3 a 400).
 */
export function ricchezzaMedia(d: number): number {
  return 1 + Math.sqrt(Math.max(0, d) / 100)
}
