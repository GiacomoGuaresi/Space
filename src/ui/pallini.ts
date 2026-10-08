// I pallini della barra (doc/11-interfaccia.md#pallini): cosa hai già visto su
// questo dispositivo, per spegnerli. Il resto si calcola dai dati.

import { useSyncExternalStore } from 'react'

interface Visti {
  /** Fino a quando hai visto il Ponte: un arrivo dopo accende il pallino. */
  ponte: string | null
  /** I corpi rari (chiave "x,y,z") di cui hai aperto la scheda nella mappa. */
  rari: string[]
  /** Le pagine della wiki già aperte. */
  wiki: string[]
  /** Fino a quando hai visto la Rete: un magazzino pieno dopo accende il pallino. */
  rete: string | null
  /** Le pagine della wiki sbloccate: restano aperte anche se i dati che le hanno sbloccate escono dai 30 giorni. */
  sbloccate: string[]
}

const CHIAVE = 'space_visti'
const VUOTI: Visti = { ponte: null, rari: [], wiki: [], sbloccate: [], rete: null }
let visti: Visti = leggi()
const ascoltatori = new Set<() => void>()

function leggi(): Visti {
  try {
    return { ...VUOTI, ...(JSON.parse(localStorage.getItem(CHIAVE) ?? '{}') as Partial<Visti>) }
  } catch {
    return VUOTI
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

export function segnaReteVista(fino: Date) {
  if (visti.rete && new Date(visti.rete) >= fino) return
  salva({ ...visti, rete: fino.toISOString() })
}

export function segnaRaroVisto(chiave: string) {
  if (visti.rari.includes(chiave)) return
  salva({ ...visti, rari: [...visti.rari, chiave] })
}

export function segnaWikiAperta(id: string) {
  if (visti.wiki.includes(id)) return
  salva({ ...visti, wiki: [...visti.wiki, id] })
}

/** Ricorda le pagine sbloccate: una volta aperta, una pagina resta aperta. */
export function segnaWikiSbloccate(ids: readonly string[]) {
  const nuove = ids.filter((id) => !visti.sbloccate.includes(id))
  if (nuove.length) salva({ ...visti, sbloccate: [...visti.sbloccate, ...nuove] })
}
