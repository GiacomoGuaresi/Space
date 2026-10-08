// Le risorse e la stiva (doc/02-meccaniche.md#risorse): sei risorse, una
// capacità per ognuna, che cresce col livello della stiva.

import { BILANCIAMENTO } from './bilanciamento'
import type { Risorsa } from './catalogo'

export type { Risorsa }

/** In ordine di rarità, come nelle ricette (doc/09-bilanciamento.md#ricette). */
export const RISORSE: readonly Risorsa[] = ['metallo', 'silicio', 'ghiaccio', 'idrogeno', 'terreRare', 'materiaOscura']

export const NOMI_RISORSE: Readonly<Record<Risorsa, { nome: string; sigla: string }>> = {
  metallo: { nome: 'Metallo', sigla: 'M' },
  silicio: { nome: 'Silicio', sigla: 'S' },
  ghiaccio: { nome: 'Ghiaccio', sigla: 'G' },
  idrogeno: { nome: 'Idrogeno', sigla: 'H' },
  terreRare: { nome: 'Terre rare', sigla: 'T' },
  materiaOscura: { nome: 'Materia oscura', sigla: 'MO' },
}

/** Una quantità per risorsa. */
export type Quantita = Record<Risorsa, number>

export function nessuna(): Quantita {
  return { metallo: 0, silicio: 0, ghiaccio: 0, idrogeno: 0, terreRare: 0, materiaOscura: 0 }
}

/**
 * La capacità della stiva per ogni risorsa al livello `livello`. Moltiplicazioni
 * ripetute e non una potenza: in SQL (`space.capacita_stiva`) il risultato è identico.
 */
export function capacitaStiva(livello: number): number {
  const { capacita, crescita } = BILANCIAMENTO.stiva
  let valore: number = capacita
  for (let i = 1; i < livello; i++) valore *= crescita
  return valore
}

/** Quello che c'è a bordo, valido dall'istante `dal`. */
export interface Carico {
  quantita: Quantita
  dal: Date
}
