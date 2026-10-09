// Le azioni sul posto (doc/11-interfaccia.md#principi), a disposizione dei
// pannelli senza passarle di componente in componente: le dà l'App.

import { createContext } from 'react'
import type { Costruzione, RicercaAvviata } from '../dati'
import type { Lavoro } from '../dominio/cantiere'
import type { Risorsa } from '../dominio/risorse'

export interface Azioni {
  /** Fonda una base sul sistema dove sta la nave, col pianeta `pianeta`. */
  fonda: (pianeta: number) => Promise<void>
  /** Fonda un estrattore sul corpo dove sta la nave. */
  fondaEstrattore: () => Promise<void>
  /** Abbandona un insediamento: restituisce quello che torna nella stiva. */
  abbandona: (id: number) => Promise<Partial<Record<Risorsa, number>>>
  /** Salta il tempo che manca pagando Materia oscura. */
  accelera: (cosa: 'viaggio' | 'ricarica' | 'lavoro', lavoro?: number) => Promise<void>
  /** Avvia un lavoro nel cantiere della base dove sta la nave. */
  potenzia: (lavoro: Lavoro) => Promise<void>
  /** Il pieno al deposito della base dove sta la nave. */
  pieno: () => Promise<void>
  /** Avvia una ricerca nel laboratorio della base dove sta la nave. */
  avviaRicerca: (nodo: string) => Promise<void>
  /** Tutte le ricerche avviate, finite o in corso. */
  ricerche: readonly RicercaAvviata[]
  /** I lavori del cantiere degli ultimi 30 giorni, in corso e in coda. */
  costruzioni: readonly Costruzione[]
}

export const AzioniNave = createContext<Azioni>({
  fonda: async () => {
    throw new Error('azioni non disponibili')
  },
  fondaEstrattore: async () => {
    throw new Error('azioni non disponibili')
  },
  abbandona: async () => {
    throw new Error('azioni non disponibili')
  },
  accelera: async () => {
    throw new Error('azioni non disponibili')
  },
  potenzia: async () => {
    throw new Error('azioni non disponibili')
  },
  pieno: async () => {
    throw new Error('azioni non disponibili')
  },
  avviaRicerca: async () => {
    throw new Error('azioni non disponibili')
  },
  ricerche: [],
  costruzioni: [],
})
