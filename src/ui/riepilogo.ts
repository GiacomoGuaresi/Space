// Il riepilogo all'apertura (doc/02-meccaniche.md): cosa è successo dall'ultima
// visita su questo dispositivo. Niente notifiche: si racconta al ritorno.

import { CATALOGO } from '../dominio/catalogo'
import type { Viaggio } from '../dominio/navigazione'
import { distanza, settore, stessoSettore } from '../dominio/settore'
import { coordinate, settori } from './formato'

export interface Evento {
  quando: Date
  testo: string
}

export function eventi(arrivi: readonly Viaggio[]): Evento[] {
  return arrivi.map((v) => {
    const { corpo } = settore(v.a)
    const dove = corpo ? `${corpo.nome}, ${CATALOGO[corpo.tipo].nome.toLowerCase()}` : 'spazio vuoto'
    if (!stessoSettore(v.a, v.meta)) {
      return {
        quando: v.arrivo,
        testo: `Carburante finito: nave ferma in ${coordinate(v.a)} (${dove}), a ${settori(distanza(v.a, v.meta))} dalla meta.`,
      }
    }
    return { quando: v.arrivo, testo: `Arrivo in ${coordinate(v.a)}: ${dove}.` }
  })
}

const CHIAVE = 'space_ultima_visita'

/** L'ultima visita su questo dispositivo, o `null` alla prima. */
export function ultimaVisita(): Date | null {
  try {
    const valore = localStorage.getItem(CHIAVE)
    return valore ? new Date(valore) : null
  } catch {
    return null
  }
}

export function segnaVisita(ora: Date) {
  try {
    localStorage.setItem(CHIAVE, ora.toISOString())
  } catch {
    // Senza memoria locale il riepilogo semplicemente non compare.
  }
}
