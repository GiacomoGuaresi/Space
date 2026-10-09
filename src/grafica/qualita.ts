// La qualità della grafica (doc/06-roadmap.md, M10.3): sui dispositivi lenti la
// scena si alleggerisce da sola. Tre livelli; in automatico si parte dall'ultimo
// scelto su questo dispositivo, si misurano i fotogrammi e, se sono troppo pochi,
// si scende di un livello. Non si risale da soli: niente altalene. Nelle
// impostazioni la qualità si può anche fissare.

import { impostazioni } from '../ui/preferenze'

export type Qualita = 'alta' | 'media' | 'bassa'

const ORDINE: readonly Qualita[] = ['alta', 'media', 'bassa']

/** La densità dei pixel e il bloom di ogni livello. */
export function resa(qualita: Qualita, densita = typeof window === 'undefined' ? 1 : window.devicePixelRatio) {
  switch (qualita) {
    case 'alta':
      return { pixel: Math.min(densita, 2), bloom: true }
    case 'media':
      return { pixel: Math.min(densita, 1), bloom: true }
    case 'bassa':
      return { pixel: Math.min(densita, 1) * 0.75, bloom: false }
  }
}

/** Sotto questi fotogrammi al secondo (in mediana) si scende di un livello. */
export const FPS_MINIMI = 40
/** Si misura dopo questo avvio e per tanto tempo, in secondi, con almeno tanti fotogrammi. */
const AVVIO = 3
const FINESTRA = 3
const MINIMI = 10

/** La mediana dei tempi dei fotogrammi, in secondi. */
export function mediana(tempi: readonly number[]): number {
  const ordinati = [...tempi].sort((a, b) => a - b)
  const m = Math.floor(ordinati.length / 2)
  return ordinati.length % 2 ? ordinati[m] : (ordinati[m - 1] + ordinati[m]) / 2
}

/** Il livello dopo `attuale` se i fotogrammi misurati sono troppo lenti, altrimenti `attuale`. */
export function valuta(attuale: Qualita, tempi: readonly number[]): Qualita {
  if (tempi.length === 0 || mediana(tempi) <= 1 / FPS_MINIMI) return attuale
  return ORDINE[Math.min(ORDINE.length - 1, ORDINE.indexOf(attuale) + 1)]
}

/**
 * Misura i fotogrammi di una scena: `campione` riceve il tempo di ognuno e
 * restituisce il nuovo livello quando cambia. Si decide ogni 3 secondi di
 * misura, dopo 3 di avvio. I fotogrammi lunghissimi (la
 * scheda in sottofondo, un caricamento) non contano.
 */
export class Misuratore {
  private tempi: number[] = []
  private misurato = 0
  private attesa = AVVIO

  constructor(public qualita: Qualita) {}

  campione(secondi: number): Qualita | null {
    if (secondi > 0.25) return null
    if (this.attesa > 0) {
      this.attesa -= secondi
      return null
    }
    this.tempi.push(secondi)
    this.misurato += secondi
    if (this.misurato < FINESTRA || this.tempi.length < MINIMI) return null
    const nuova = valuta(this.qualita, this.tempi)
    this.tempi = []
    this.misurato = 0
    this.attesa = AVVIO
    if (nuova === this.qualita) return null
    this.qualita = nuova
    return nuova
  }
}

const CHIAVE = 'space_grafica'

/** La qualità da cui partire: quella fissata nelle impostazioni, o l'ultima scelta in automatico qui. */
export function qualitaIniziale(): Qualita {
  const scelta = impostazioni().grafica
  if (scelta !== 'auto') return scelta
  try {
    const salvata = localStorage.getItem(CHIAVE)
    return ORDINE.includes(salvata as Qualita) ? (salvata as Qualita) : 'alta'
  } catch {
    return 'alta'
  }
}

/** Vero se la qualità si regola da sola. */
export function qualitaAutomatica(): boolean {
  return impostazioni().grafica === 'auto'
}

/** Ricorda la qualità scelta in automatico, per la prossima volta. */
export function ricordaQualita(qualita: Qualita) {
  try {
    localStorage.setItem(CHIAVE, qualita)
  } catch {
    // Senza memoria si ripartirà dall'alta.
  }
}

/** Torna alla qualità alta, per riprovare: lo fa il tasto delle impostazioni. */
export function dimenticaQualita() {
  try {
    localStorage.removeItem(CHIAVE)
  } catch {
    // Niente da dimenticare.
  }
}

/** L'ultima qualità scelta in automatico, per le impostazioni. */
export function qualitaRicordata(): Qualita | null {
  try {
    const salvata = localStorage.getItem(CHIAVE)
    return ORDINE.includes(salvata as Qualita) ? (salvata as Qualita) : null
  } catch {
    return null
  }
}
