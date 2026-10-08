// Le impostazioni di questo dispositivo (doc/11-interfaccia.md#altro): suoni e
// movimento. Stanno nella memoria locale; senza, valgono quelle di partenza.

import { useSyncExternalStore } from 'react'

export type Movimento = 'sistema' | 'ridotto' | 'pieno'

/** Finestre o pagine: "auto" sceglie dalla larghezza dello schermo (ui/schermo.ts). */
export type Interfaccia = 'auto' | 'finestre' | 'pagine'

export interface Impostazioni {
  suoni: boolean
  /** "sistema" segue la preferenza del telefono o del computer. */
  movimento: Movimento
  interfaccia: Interfaccia
}

const CHIAVE = 'space_impostazioni'
const PARTENZA: Impostazioni = { suoni: false, movimento: 'sistema', interfaccia: 'auto' }

let attuali: Impostazioni = leggi()
const ascoltatori = new Set<() => void>()

function leggi(): Impostazioni {
  try {
    const salvate = JSON.parse(localStorage.getItem(CHIAVE) ?? '{}') as Partial<Impostazioni>
    return { ...PARTENZA, ...salvate }
  } catch {
    return PARTENZA
  }
}

export function impostazioni(): Impostazioni {
  return attuali
}

export function cambiaImpostazioni(cambio: Partial<Impostazioni>) {
  attuali = { ...attuali, ...cambio }
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(attuali))
  } catch {
    // Valgono fino alla chiusura.
  }
  applicaMovimento()
  for (const avvisa of ascoltatori) avvisa()
}

export function useImpostazioni(): Impostazioni {
  return useSyncExternalStore((avvisa) => {
    ascoltatori.add(avvisa)
    return () => ascoltatori.delete(avvisa)
  }, impostazioni)
}

/** Vero se le animazioni vanno spente: per scelta qui, o del sistema. */
export function movimentoRidotto(): boolean {
  if (attuali.movimento === 'ridotto') return true
  if (attuali.movimento === 'pieno') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Il CSS spegne le transizioni con `data-movimento="ridotto"` sulla radice (index.css). */
export function applicaMovimento() {
  if (attuali.movimento === 'ridotto') document.documentElement.dataset.movimento = 'ridotto'
  else delete document.documentElement.dataset.movimento
}
