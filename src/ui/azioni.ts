// Le azioni sul posto (doc/11-interfaccia.md#principi), a disposizione dei
// pannelli senza passarle di componente in componente: le dà l'App.

import { createContext } from 'react'
import type { Costruzione } from '../dati'
import type { Lavoro } from '../dominio/cantiere'

export interface Azioni {
  /** Fonda una base sul sistema dove sta la nave, col pianeta `pianeta`. */
  fonda: (pianeta: number) => Promise<void>
  /** Avvia un lavoro nel cantiere della base dove sta la nave. */
  potenzia: (lavoro: Lavoro) => Promise<void>
  /** Il pieno al deposito della base dove sta la nave. */
  pieno: () => Promise<void>
  /** I lavori del cantiere degli ultimi 30 giorni, in corso e in coda. */
  costruzioni: readonly Costruzione[]
}

export const AzioniNave = createContext<Azioni>({
  fonda: async () => {
    throw new Error('azioni non disponibili')
  },
  potenzia: async () => {
    throw new Error('azioni non disponibili')
  },
  pieno: async () => {
    throw new Error('azioni non disponibili')
  },
  costruzioni: [],
})
