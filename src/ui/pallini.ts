// I pallini della barra (doc/11-interfaccia.md#pallini): cosa hai già visto su
// questo dispositivo, per spegnerli. Il resto si calcola dai dati.

import { useSyncExternalStore } from 'react'

interface Visti {
  /** Fino a quando hai visto il Ponte: un arrivo dopo accende il pallino. */
  ponte: string | null
  /** I corpi rari (chiave "x,y,z") di cui hai aperto la scheda nella mappa. */
  rari: string[]
}

const CHIAVE = 'space_visti'
let visti: Visti = leggi()
const ascoltatori = new Set<() => void>()

function leggi(): Visti {
  try {
    return { ponte: null, rari: [], ...(JSON.parse(localStorage.getItem(CHIAVE) ?? '{}') as Partial<Visti>) }
  } catch {
    return { ponte: null, rari: [] }
  }
}

function salva(nuovi: Visti) {
  visti = nuovi
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(visti))
  } catch {
    // Valgono fino alla chiusura.
  }
  for (const avvisa of ascoltatori) avvisa()
}

export function useVisti(): Visti {
  return useSyncExternalStore(
    (avvisa) => {
      ascoltatori.add(avvisa)
      return () => ascoltatori.delete(avvisa)
    },
    () => visti,
  )
}

export function segnaPonteVisto(fino: Date) {
  if (visti.ponte && new Date(visti.ponte) >= fino) return
  salva({ ...visti, ponte: fino.toISOString() })
}

export function segnaRaroVisto(chiave: string) {
  if (visti.rari.includes(chiave)) return
  salva({ ...visti, rari: [...visti.rari, chiave] })
}
