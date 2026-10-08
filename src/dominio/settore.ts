// Cosa c'è in un settore (doc/03-universo.md): tutto dalle sole coordinate.
// Ogni parte (tipo, nome, dettagli) legge da una sua sequenza derivata, così
// aggiungere un dettaglio a un tipo non cambia nome o tipo degli altri.

import { casuale, derivato, seedSettore, type Casuale } from './casuale'
import { CATALOGO, PIENEZZA, pesi, ricchezzaMedia, type TipoCorpo, type VoceCatalogo } from './catalogo'
import { nomeCorpo, nomePianeta } from './nomi'

export interface Coordinate {
  x: number
  y: number
  z: number
}

export const BASE: Coordinate = { x: 0, y: 0, z: 0 }

/**
 * Distanza euclidea. Niente `Math.hypot`: può differire di un'unità
 * nell'ultima cifra da `sqrt` di Postgres, che deve dare lo stesso risultato
 * (supabase/sql/002_navigazione.sql).
 */
export function distanza(a: Coordinate, b: Coordinate): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

export function stessoSettore(a: Coordinate, b: Coordinate): boolean {
  return a.x === b.x && a.y === b.y && a.z === b.z
}

// Sottotipi -----------------------------------------------------------------

export type ClasseStella = 'M' | 'K' | 'G' | 'F' | 'B'

export interface Stella {
  classe: ClasseStella
  /** Temperatura superficiale, in kelvin: decide il colore. */
  temperatura: number
  /** Raggio rispetto al Sole. */
  raggio: number
}

const CLASSI: Readonly<Record<ClasseStella, { peso: number; temperatura: [number, number]; raggio: [number, number] }>> =
  {
    M: { peso: 45, temperatura: [2600, 3800], raggio: [0.3, 0.7] },
    K: { peso: 25, temperatura: [3900, 5200], raggio: [0.7, 0.95] },
    G: { peso: 15, temperatura: [5300, 6000], raggio: [0.9, 1.2] },
    F: { peso: 10, temperatura: [6100, 7500], raggio: [1.1, 1.6] },
    B: { peso: 5, temperatura: [10000, 28000], raggio: [2.5, 7] },
  }

export const NOMI_CLASSI: Readonly<Record<ClasseStella, string>> = {
  M: 'nana rossa',
  K: 'nana arancione',
  G: 'nana gialla',
  F: 'stella bianco-gialla',
  B: 'gigante blu',
}

function stella(c: Casuale): Stella {
  const pesiClassi = Object.fromEntries(Object.entries(CLASSI).map(([k, v]) => [k, v.peso])) as Record<
    ClasseStella,
    number
  >
  const classe = c.pesato(pesiClassi)
  const { temperatura, raggio } = CLASSI[classe]
  return {
    classe,
    temperatura: Math.round(c.tra(temperatura[0], temperatura[1]) / 10) * 10,
    raggio: Math.round(c.tra(raggio[0], raggio[1]) * 100) / 100,
  }
}

export type TipoPianeta = 'roccioso' | 'oceanico' | 'ghiacciato' | 'gassoso'

export interface Pianeta {
  nome: string
  tipo: TipoPianeta
  /** Raggio rispetto alla Terra. */
  raggio: number
  /** Distanza dalla stella, in unità astronomiche. */
  orbita: number
  /** Dove si trova sull'orbita all'istante zero, in radianti. */
  fase: number
  anelli: boolean
}

function pianeti(c: Casuale, sistema: string): Pianeta[] {
  const quanti = c.intero(1, 7)
  const elenco: Pianeta[] = []
  let orbita = c.tra(0.3, 0.6)
  for (let i = 0; i < quanti; i++) {
    // Vicino alla stella rocciosi, lontano ghiacciati e gassosi.
    const tipo = c.pesato<TipoPianeta>(
      orbita < 1.5
        ? { roccioso: 6, oceanico: 3, ghiacciato: 0, gassoso: 1 }
        : orbita < 4
          ? { roccioso: 2, oceanico: 2, ghiacciato: 2, gassoso: 4 }
          : { roccioso: 1, oceanico: 0, ghiacciato: 4, gassoso: 5 },
    )
    const raggio = tipo === 'gassoso' ? c.tra(3.5, 12) : c.tra(0.3, 2)
    elenco.push({
      nome: nomePianeta(sistema, i),
      tipo,
      raggio: Math.round(raggio * 100) / 100,
      orbita: Math.round(orbita * 100) / 100,
      fase: c.tra(0, Math.PI * 2),
      anelli: tipo === 'gassoso' ? c.prova(0.45) : c.prova(0.04),
    })
    orbita *= c.tra(1.4, 2.1)
  }
  return elenco
}

export type GenereNebulosa = 'emissione' | 'riflessione' | 'planetaria' | 'oscura'

export const NOMI_GENERI_NEBULOSA: Readonly<Record<GenereNebulosa, string>> = {
  emissione: 'a emissione',
  riflessione: 'a riflessione',
  planetaria: 'planetaria',
  oscura: 'oscura',
}

export type Composizione = 'metallica' | 'silicea' | 'mista'

export type FormaRelitto = 'nave' | 'stazione' | 'sonda'

export type Dettagli =
  | { tipo: 'asteroidi'; composizione: Composizione; rocce: number }
  | { tipo: 'nebulosa'; genere: GenereNebulosa; densita: number }
  | { tipo: 'stella'; stella: Stella }
  | { tipo: 'sistema'; stella: Stella; pianeti: Pianeta[] }
  | { tipo: 'gigante'; anelli: boolean; tinta: 'calda' | 'fredda'; raggio: number }
  | { tipo: 'cometa'; coda: number }
  | { tipo: 'pulsar'; periodo: number }
  | { tipo: 'buconero'; massa: number }
  | { tipo: 'relitto'; forma: FormaRelitto; eta: number }
  | { tipo: 'wormhole'; uscita: Coordinate }

function dettagli(tipo: TipoCorpo, c: Casuale, nome: string, dove: Coordinate): Dettagli {
  switch (tipo) {
    case 'asteroidi':
      return {
        tipo,
        composizione: c.pesato<Composizione>({ metallica: 3, silicea: 3, mista: 4 }),
        rocce: c.intero(40, 220),
      }
    case 'nebulosa':
      return {
        tipo,
        genere: c.pesato<GenereNebulosa>({ emissione: 4, riflessione: 3, planetaria: 2, oscura: 1 }),
        densita: Math.round(c.tra(0.3, 1) * 100) / 100,
      }
    case 'stella':
      return { tipo, stella: stella(c) }
    case 'sistema':
      return { tipo, stella: stella(c), pianeti: pianeti(c, nome) }
    case 'gigante':
      return {
        tipo,
        anelli: c.prova(0.5),
        tinta: c.prova(0.5) ? 'calda' : 'fredda',
        raggio: Math.round(c.tra(6, 14) * 100) / 100,
      }
    case 'cometa':
      return { tipo, coda: Math.round(c.tra(0.4, 1) * 100) / 100 }
    case 'pulsar':
      // Da millisecondi a qualche secondo.
      return { tipo, periodo: Math.round(10 ** c.tra(-2.5, 0.5) * 1000) / 1000 }
    case 'buconero':
      return { tipo, massa: Math.round(10 ** c.tra(0.7, 2)) }
    case 'relitto':
      return { tipo, forma: c.pesato<FormaRelitto>({ nave: 5, stazione: 2, sonda: 3 }), eta: c.intero(2, 900) }
    case 'wormhole':
      return { tipo, uscita: uscitaVarco(c, dove) }
  }
}

/** Dove porta un varco: un settore tra 300 e 1500 settori più in là, in una direzione a caso. */
function uscitaVarco(c: Casuale, da: Coordinate): Coordinate {
  // Direzione uniforme sulla sfera.
  const zeta = c.tra(-1, 1)
  const angolo = c.tra(0, Math.PI * 2)
  const r = Math.sqrt(1 - zeta * zeta)
  const lunghezza = c.tra(300, 1500)
  return {
    x: da.x + Math.round(r * Math.cos(angolo) * lunghezza),
    y: da.y + Math.round(r * Math.sin(angolo) * lunghezza),
    z: da.z + Math.round(zeta * lunghezza),
  }
}

// Settore -------------------------------------------------------------------

export interface Corpo extends VoceCatalogo {
  tipo: TipoCorpo
  nome: string
  /** Moltiplicatore delle risorse rispetto alla base: cresce con la distanza. */
  ricchezza: number
  dettagli: Dettagli
}

export interface Settore {
  coordinate: Coordinate
  seed: number
  /** La base del giocatore, in `(0, 0, 0)`: lì non c'è nessun corpo. */
  base: boolean
  distanzaBase: number
  corpo: Corpo | null
}

/** Le parti del settore: ognuna con la sua sequenza (vedi in cima). */
const PARTE = { tipo: 0, nome: 1, ricchezza: 2, dettagli: 3 } as const

/** Solo il tipo, senza nome né dettagli: è quello che serve allo scanner. */
export function tipoSettore({ x, y, z }: Coordinate): TipoCorpo | null {
  if (x === 0 && y === 0 && z === 0) return null
  const c = casuale(derivato(seedSettore(x, y, z), PARTE.tipo))
  if (!c.prova(PIENEZZA)) return null
  return c.pesato(pesi(distanza({ x, y, z }, BASE)))
}

export function settore(coordinate: Coordinate): Settore {
  const seed = seedSettore(coordinate.x, coordinate.y, coordinate.z)
  const distanzaBase = distanza(coordinate, BASE)
  const base = stessoSettore(coordinate, BASE)
  const tipo = tipoSettore(coordinate)
  if (!tipo) return { coordinate, seed, base, distanzaBase, corpo: null }

  const nome = nomeCorpo(tipo, casuale(derivato(seed, PARTE.nome)))
  const ricchezza =
    Math.round(ricchezzaMedia(distanzaBase) * casuale(derivato(seed, PARTE.ricchezza)).tra(0.6, 1.4) * 100) / 100
  return {
    coordinate,
    seed,
    base,
    distanzaBase,
    corpo: {
      ...CATALOGO[tipo],
      tipo,
      nome,
      ricchezza,
      dettagli: dettagli(tipo, casuale(derivato(seed, PARTE.dettagli)), nome, coordinate),
    },
  }
}
