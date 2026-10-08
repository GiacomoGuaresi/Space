// Le azioni sul posto (doc/11-interfaccia.md#principi), a disposizione dei
// pannelli senza passarle di componente in componente: le dà l'App.

import { createContext } from 'react'

export interface Azioni {
  /** Fonda una base sul sistema dove sta la nave, col pianeta `pianeta`. */
  fonda: (pianeta: number) => Promise<void>
}

export const AzioniNave = createContext<Azioni>({
  fonda: async () => {
    throw new Error('azioni non disponibili')
  },
})
