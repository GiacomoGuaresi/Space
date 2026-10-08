// Il caso dell'universo (doc/03-universo.md): tutto quello che c'è in un
// settore nasce dalle sue coordinate, con funzioni nostre e a 32 bit, così si
// potranno riscrivere identiche in SQL (M2). Mai Math.random() per generare.

/**
 * Cambiarlo vuol dire un universo nuovo: tutti i settori cambiano contenuto.
 * Con giocatori e scoperte nel database non si tocca più.
 */
export const SEED_UNIVERSO = 0x5ea_ce01

/** Il finalizzatore di MurmurHash3: mescola bene i bit di un intero a 32 bit. */
export function mescola(h: number): number {
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return h >>> 0
}

/**
 * Il seed di un settore: le tre coordinate mescolate in catena, una dopo
 * l'altra, così l'ordine conta e `(1, 2, 3)` non vale come `(3, 2, 1)`.
 */
export function seedSettore(x: number, y: number, z: number, universo = SEED_UNIVERSO): number {
  let h = mescola(universo)
  h = mescola(h ^ (x | 0))
  h = mescola(h ^ (y | 0))
  h = mescola(h ^ (z | 0))
  return h
}

/** Un seed derivato, per dare a ogni parte del settore la sua sequenza. */
export function derivato(seed: number, parte: number): number {
  return mescola((seed ^ Math.imul(parte + 1, 0x9e3779b9)) >>> 0)
}

/** Un generatore pseudo-casuale seminato: stessa semina, stessa sequenza. */
export interface Casuale {
  /** Un numero in [0, 1). */
  numero(): number
  /** Un numero in [min, max). */
  tra(min: number, max: number): number
  /** Un intero tra `min` e `max`, estremi compresi. */
  intero(min: number, max: number): number
  /** Vero con probabilità `p`. */
  prova(p: number): boolean
  /** Un elemento a caso. */
  scegli<T>(elenco: readonly T[]): T
  /** Una chiave scelta in proporzione al suo peso; i pesi zero non escono mai. */
  pesato<K extends string>(pesi: Readonly<Record<K, number>>): K
}

/** Mulberry32: piccolo, veloce e a 32 bit. */
export function casuale(seed: number): Casuale {
  let stato = seed >>> 0
  const numero = () => {
    stato = (stato + 0x6d2b79f5) >>> 0
    let t = stato
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    numero,
    tra: (min, max) => min + numero() * (max - min),
    intero: (min, max) => min + Math.floor(numero() * (max - min + 1)),
    prova: (p) => numero() < p,
    scegli: (elenco) => elenco[Math.floor(numero() * elenco.length)],
    pesato(pesi) {
      const voci = Object.entries(pesi) as [keyof typeof pesi, number][]
      const totale = voci.reduce((somma, [, peso]) => somma + peso, 0)
      let estratto = numero() * totale
      for (const [chiave, peso] of voci) {
        if (peso <= 0) continue
        if (estratto < peso) return chiave
        estratto -= peso
      }
      // Solo per arrotondamento: l'ultima voce con peso.
      return voci.filter(([, peso]) => peso > 0).at(-1)![0]
    },
  }
}
