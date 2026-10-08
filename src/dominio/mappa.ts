// La mappa dei settori scansionati (doc/02-meccaniche.md#scanner): non si salva
// nulla dei settori, solo le soste della nave. Da centro, raggio e livello di
// ogni sosta si ricalcolano i corpi che lo scanner aveva rilevato.

import type { TipoCorpo } from './catalogo'
import { scansione, tipiRilevabili } from './navigazione'
import type { Coordinate } from './settore'

export interface Sosta {
  centro: Coordinate
  raggio: number
  livello: number
}

export interface PuntoMappa {
  coordinate: Coordinate
  tipo: TipoCorpo
  /** Vero se la nave ci è già stata: se ne conosce il nome. */
  scoperto: boolean
}

const chiave = ({ x, y, z }: Coordinate) => `${x},${y},${z}`

/**
 * I corpi noti: quelli rilevati in qualche sosta, con i tipi che lo scanner
 * vedeva allora, più quelli scoperti arrivandoci (anche se invisibili allo
 * scanner). Ognuno una volta sola.
 */
export function corpiNoti(
  soste: readonly Sosta[],
  scoperte: readonly { coordinate: Coordinate; tipo: TipoCorpo }[],
): PuntoMappa[] {
  const punti = new Map<string, PuntoMappa>()
  for (const { coordinate, tipo } of scoperte) punti.set(chiave(coordinate), { coordinate, tipo, scoperto: true })
  for (const { centro, raggio, livello } of soste) {
    for (const { coordinate, tipo } of scansione(centro, raggio, tipiRilevabili(livello))) {
      const k = chiave(coordinate)
      if (!punti.has(k)) punti.set(k, { coordinate, tipo, scoperto: false })
    }
  }
  return [...punti.values()]
}
