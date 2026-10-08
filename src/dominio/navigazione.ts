// La navigazione (doc/02-meccaniche.md): carburante, rotte, durate, scanner.
// Queste funzioni danno l'anteprima nel browser; chi decide davvero è il
// database (supabase/sql/002_navigazione.sql), che fa gli stessi conti.

import type { TipoCorpo } from './catalogo'
import { distanza, stessoSettore, tipoSettore, type Coordinate } from './settore'

// Valori provvisori (Q&A, giro 2, domande 1 e 2): gli stessi default delle
// colonne di `space.nave`.

/** La nave iniziale: settori all'ora, unità di carburante, unità all'ora da ferma. */
export const NAVE_INIZIALE = { velocita: 12, serbatoio: 20, ricarica: 2.5 } as const

/** Accanto a una stella il carburante si ricarica tre volte più in fretta. */
export const RICARICA_STELLA = 3

/** Partendo da un buco nero la nave va al doppio della velocità. */
export const FIONDA = 2

/** Il raggio dello scanner, in settori: dimezzato nelle nebulose, doppio presso le pulsar. */
export const RAGGIO_SCANNER = 3

export interface Nave {
  /** Dove si trova, o dove arriverà se è in viaggio. */
  posizione: Coordinate
  /** Da quando è (o sarà) ferma lì: l'arrivo dell'ultimo viaggio. */
  dal: Date
  /** Il carburante a `dal`: in viaggio non si ricarica. */
  carburante: number
  velocita: number
  serbatoio: number
  ricarica: number
}

export interface Viaggio {
  da: Coordinate
  /** Dove si voleva andare. */
  meta: Coordinate
  /** Dove si arriva: la meta, o prima se il carburante non basta. */
  a: Coordinate
  partenza: Date
  arrivo: Date
  consumo: number
  fionda: boolean
}

export function inViaggio(nave: Nave, ora: Date): boolean {
  return ora < nave.dal
}

const ORA_MS = 3_600_000

export function ricaricaQui(nave: Nave, tipoQui: TipoCorpo | null): number {
  return nave.ricarica * (tipoQui === 'stella' ? RICARICA_STELLA : 1)
}

/** Il carburante adesso: fermo da `dal`, si ricarica fino al serbatoio pieno. */
export function carburanteOra(nave: Nave, ora: Date): number {
  if (inViaggio(nave, ora)) return nave.carburante
  const ore = (ora.getTime() - nave.dal.getTime()) / ORA_MS
  return Math.min(nave.serbatoio, nave.carburante + ricaricaQui(nave, tipoSettore(nave.posizione)) * ore)
}

/** Fra quanto il serbatoio sarà pieno, in millisecondi (0 se lo è già). */
export function pienoTra(nave: Nave, ora: Date): number {
  const ricarica = ricaricaQui(nave, tipoSettore(nave.posizione))
  return Math.max(0, ((nave.serbatoio - carburanteOra(nave, ora)) / ricarica) * ORA_MS)
}

export interface Rotta {
  /** Dove si arriva davvero. */
  a: Coordinate
  /** I settori percorsi: anche il carburante consumato. */
  consumo: number
  /** Vero se il carburante finisce prima della meta. */
  fermata: boolean
}

/** Arrotondamento uguale in JavaScript e in SQL: `round` di Postgres tratta diversamente le metà negative. */
const arrotonda = (v: number) => Math.floor(v + 0.5)

/**
 * La rotta da `da` a `meta` con il carburante dato. Se non basta, la nave si
 * ferma nel settore della rotta più vicino al punto in cui il serbatoio si
 * svuota, senza superarlo. Stessi passi di `space.rotta` in SQL.
 */
export function rotta(da: Coordinate, meta: Coordinate, carburante: number): Rotta {
  const totale = distanza(da, meta)
  if (carburante >= totale) return { a: meta, consumo: totale, fermata: false }
  let t = carburante / totale
  while (t > 0) {
    const p = {
      x: arrotonda(da.x + (meta.x - da.x) * t),
      y: arrotonda(da.y + (meta.y - da.y) * t),
      z: arrotonda(da.z + (meta.z - da.z) * t),
    }
    const percorsa = distanza(da, p)
    if (percorsa <= carburante) return { a: p, consumo: percorsa, fermata: true }
    t -= 0.5 / totale
  }
  return { a: da, consumo: 0, fermata: true }
}

export interface Anteprima extends Rotta {
  /** Quanto dura il viaggio, in millisecondi. */
  durata: number
  fionda: boolean
  /** Falso se la nave non riesce nemmeno a muoversi. */
  possibile: boolean
}

/** Cosa succederebbe partendo adesso verso `meta`. */
export function anteprima(nave: Nave, meta: Coordinate, ora: Date): Anteprima {
  const fionda = tipoSettore(nave.posizione) === 'buconero'
  const r = rotta(nave.posizione, meta, carburanteOra(nave, ora))
  const velocita = nave.velocita * (fionda ? FIONDA : 1)
  return {
    ...r,
    durata: (r.consumo / velocita) * ORA_MS,
    fionda,
    possibile: !stessoSettore(r.a, nave.posizione),
  }
}

export function raggioScanner(tipoQui: TipoCorpo | null): number {
  if (tipoQui === 'nebulosa') return Math.floor(RAGGIO_SCANNER / 2)
  if (tipoQui === 'pulsar') return RAGGIO_SCANNER * 2
  return RAGGIO_SCANNER
}

export interface Rilevamento {
  coordinate: Coordinate
  tipo: TipoCorpo
  distanza: number
}

/** I corpi entro il raggio dello scanner (in distanza euclidea), dal più vicino. */
export function scansione(centro: Coordinate, raggio: number): Rilevamento[] {
  const trovati: Rilevamento[] = []
  for (let dx = -raggio; dx <= raggio; dx++)
    for (let dy = -raggio; dy <= raggio; dy++)
      for (let dz = -raggio; dz <= raggio; dz++) {
        if (dx === 0 && dy === 0 && dz === 0) continue
        const coordinate = { x: centro.x + dx, y: centro.y + dy, z: centro.z + dz }
        const d = distanza(centro, coordinate)
        if (d > raggio) continue
        const tipo = tipoSettore(coordinate)
        if (tipo) trovati.push({ coordinate, tipo, distanza: d })
      }
  return trovati.sort((a, b) => a.distanza - b.distanza)
}
