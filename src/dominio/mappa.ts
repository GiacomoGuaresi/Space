// La mappa dei settori scansionati (doc/02-meccaniche.md#scanner): non si salva
// nulla dei settori, solo le soste della nave. Da centro, raggio e livello di
// ogni sosta si ricalcolano i corpi che lo scanner aveva rilevato.

import type { TipoCorpo } from './catalogo'
import { CATALOGO } from './catalogo'
import { raggioRadar, scansione, tipiRilevabili } from './navigazione'
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

/** Cosa rileva una sosta: di solito la scansione, ma chi ne ha una copia (il worker) la passa. */
export type Rileva = (sosta: Sosta) => readonly { coordinate: Coordinate; tipo: TipoCorpo }[]

export const rileva: Rileva = ({ centro, raggio, livello }) => scansione(centro, raggio, tipiRilevabili(livello))

/**
 * I corpi noti: quelli rilevati in qualche sosta, con i tipi che lo scanner
 * vedeva allora, più quelli scoperti arrivandoci (anche se invisibili allo
 * scanner). Ognuno una volta sola.
 */
export function corpiNoti(
  soste: readonly Sosta[],
  scoperte: readonly { coordinate: Coordinate; tipo: TipoCorpo }[],
  rilevati: Rileva = rileva,
): PuntoMappa[] {
  const punti = new Map<string, PuntoMappa>()
  for (const { coordinate, tipo } of scoperte) punti.set(chiave(coordinate), { coordinate, tipo, scoperto: true })
  for (const sosta of soste) {
    for (const { coordinate, tipo } of rilevati(sosta)) {
      const k = chiave(coordinate)
      if (!punti.has(k)) punti.set(k, { coordinate, tipo, scoperto: false })
    }
  }
  return [...punti.values()]
}

/** Un corpo rilevato che merita una voce nel diario. */
export interface Rilevato {
  coordinate: Coordinate
  tipo: TipoCorpo
  istante: Date
  /** Il primo di quel tipo. */
  primo: boolean
}

/**
 * I corpi rilevati dallo scanner, solo le novità: i rari e il primo di ogni
 * tipo. Le soste si ripercorrono in ordine, ricordando cosa si era già visto.
 */
export function rilevatiNuovi(soste: readonly (Sosta & { istante: Date })[], rilevati: Rileva = rileva): Rilevato[] {
  const visti = new Set<string>()
  const tipiVisti = new Set<TipoCorpo>()
  const nuovi: Rilevato[] = []
  for (const s of [...soste].sort((a, b) => a.istante.getTime() - b.istante.getTime())) {
    for (const { coordinate, tipo } of rilevati(s)) {
      const k = chiave(coordinate)
      if (visti.has(k)) continue
      visti.add(k)
      const { rarita } = CATALOGO[tipo]
      const primo = !tipiVisti.has(tipo)
      if (rarita !== 'rara' && rarita !== 'leggendaria' && !primo) continue
      tipiVisti.add(tipo)
      nuovi.push({ coordinate, tipo, istante: s.istante, primo })
    }
  }
  return nuovi
}

/**
 * Le bolle dei radar (doc/02-meccaniche.md#strutture-di-base): uno scanner fisso
 * attorno a ogni base che ne ha uno, con i tipi che rileva adesso lo scanner
 * della nave. Non si salvano: si ricavano dalle basi, come una sosta che inizia
 * `dal` (quando il radar o lo scanner sono cambiati l'ultima volta).
 */
export function sosteRadar<B extends { coordinate: Coordinate; radar: number }>(
  basi: readonly B[],
  scanner: number,
  dal: (base: B) => Date,
  fatte: ReadonlySet<string> = new Set(),
): (Sosta & { istante: Date })[] {
  return basi
    .filter((b) => b.radar > 0)
    .map((b) => ({ centro: b.coordinate, raggio: raggioRadar(b.radar, fatte), livello: scanner, istante: dal(b) }))
}
