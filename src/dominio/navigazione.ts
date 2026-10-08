// La navigazione (doc/02-meccaniche.md): carburante, rotte, durate, scanner.
// Queste funzioni danno l'anteprima nel browser; chi decide davvero è il
// database (supabase/sql/), che fa gli stessi conti con gli stessi valori
// (bilanciamento.ts).

import { BILANCIAMENTO } from './bilanciamento'
import type { TipoCorpo } from './catalogo'
import { BASE, distanza, stessoSettore, tipoSettore, type Coordinate } from './settore'

const { carburante: CARBURANTE, fionda: FIONDA, scanner: SCANNER } = BILANCIAMENTO

/** La nave al livello 1: gli stessi valori con cui il database la crea. */
export const NAVE_INIZIALE = BILANCIAMENTO.nave

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
  /** Il livello dello scanner. */
  scanner: number
  /** Il livello della stiva: decide la capacità per risorsa (risorse.ts). */
  stiva: number
  /** I livelli di motore, serbatoio e ricarica (cantiere.ts): i valori sono già sopra. */
  livelli: { motore: number; serbatoio: number; ricarica: number }
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

/** La ricarica all'ora, da fermi nel settore `qui`: più veloce accanto a una stella. */
export function ricaricaQui(nave: Nave, qui: Coordinate): number {
  return nave.ricarica * (tipoSettore(qui) === 'stella' ? CARBURANTE.ricaricaStella : 1)
}

/**
 * Fin dove si ricarica il serbatoio da fermi nel settore `qui`: pieno in base
 * e accanto a una stella, altrove solo in parte.
 */
export function tettoQui(nave: Nave, qui: Coordinate): number {
  const pieno = stessoSettore(qui, BASE) || tipoSettore(qui) === 'stella'
  return nave.serbatoio * (pieno ? 1 : CARBURANTE.tettoFuori)
}

/**
 * Il carburante adesso: fermo da `dal`, si ricarica fino al tetto. Se è già
 * oltre (arrivato da una base con il pieno) non cala: smette solo di salire.
 */
export function carburanteOra(nave: Nave, ora: Date): number {
  if (inViaggio(nave, ora)) return nave.carburante
  const tetto = tettoQui(nave, nave.posizione)
  if (nave.carburante >= tetto) return nave.carburante
  const ore = (ora.getTime() - nave.dal.getTime()) / ORA_MS
  return Math.min(tetto, nave.carburante + ricaricaQui(nave, nave.posizione) * ore)
}

/** Fra quanto il carburante arriva al tetto, in millisecondi (0 se c'è già). */
export function pienoTra(nave: Nave, ora: Date): number {
  const mancante = tettoQui(nave, nave.posizione) - carburanteOra(nave, ora)
  return Math.max(0, (mancante / ricaricaQui(nave, nave.posizione)) * ORA_MS)
}

export interface Rotta {
  /** Dove si arriva davvero. */
  a: Coordinate
  /** I settori percorsi. */
  percorsa: number
  /** Il carburante consumato: i settori percorsi per la quota che si paga. */
  consumo: number
  /** Vero se il carburante finisce prima della meta. */
  fermata: boolean
}

/** Arrotondamento uguale in JavaScript e in SQL: `round` di Postgres tratta diversamente le metà negative. */
const arrotonda = (v: number) => Math.floor(v + 0.5)

/**
 * La rotta da `da` a `meta` con il carburante dato, se ogni settore costa
 * `quota` unità (1, o meno con la fionda). Se non basta, la nave si ferma nel
 * settore della rotta più vicino al punto in cui il serbatoio si svuota, senza
 * superarlo. Stessi passi di `space.rotta` in SQL.
 */
export function rotta(da: Coordinate, meta: Coordinate, carburante: number, quota = 1): Rotta {
  const totale = distanza(da, meta)
  if (carburante >= totale * quota) return { a: meta, percorsa: totale, consumo: totale * quota, fermata: false }
  let t = carburante / quota / totale
  while (t > 0) {
    const p = {
      x: arrotonda(da.x + (meta.x - da.x) * t),
      y: arrotonda(da.y + (meta.y - da.y) * t),
      z: arrotonda(da.z + (meta.z - da.z) * t),
    }
    const percorsa = distanza(da, p)
    if (percorsa * quota <= carburante) return { a: p, percorsa, consumo: percorsa * quota, fermata: true }
    t -= 0.5 / totale
  }
  return { a: da, percorsa: 0, consumo: 0, fermata: true }
}

export interface Anteprima extends Rotta {
  /** Quanto dura il viaggio, in millisecondi. */
  durata: number
  fionda: boolean
  /** Falso se la nave non riesce nemmeno a muoversi. */
  possibile: boolean
}

/** Cosa succederebbe partendo adesso verso `meta`. */
export function anteprima(nave: Nave, meta: Coordinate, ora: Date, fatte: ReadonlySet<string> = new Set()): Anteprima {
  const fionda = tipoSettore(nave.posizione) === 'buconero'
  const r = rotta(nave.posizione, meta, carburanteOra(nave, ora), quotaConsumo(fionda, fatte))
  const velocita = nave.velocita * (fionda ? FIONDA.velocita : 1)
  return {
    ...r,
    durata: (r.percorsa / velocita) * ORA_MS,
    fionda,
    possibile: !stessoSettore(r.a, nave.posizione),
  }
}

/**
 * La parte dei settori percorsi che consuma carburante: meno con la fionda e
 * con *Iniettori* (P2). Come in `space.viaggia`, moltiplicando nello stesso ordine.
 */
export function quotaConsumo(fionda: boolean, fatte: ReadonlySet<string>): number {
  return (fionda ? 1 - FIONDA.gratis : 1) * (fatte.has('P2') ? 1 - BILANCIAMENTO.ricerche.effetti.P2 : 1)
}

const LIVELLI_SCANNER: readonly (TipoCorpo | 'raggio')[] = SCANNER.livelli

/** I tipi di corpo che lo scanner rileva al livello dato: gli altri sono invisibili. */
export function tipiRilevabili(livello: number): ReadonlySet<TipoCorpo> {
  return new Set(LIVELLI_SCANNER.slice(0, livello).filter((v): v is TipoCorpo => v !== 'raggio'))
}

/** Il raggio dello scanner al livello dato, in settori, fermi nel settore di tipo `tipoQui`. */
export function raggioScanner(livello: number, tipoQui: TipoCorpo | null): number {
  const aumenti = LIVELLI_SCANNER.slice(0, livello).filter((v) => v === 'raggio').length + Math.max(0, livello - LIVELLI_SCANNER.length)
  // Moltiplicazioni ripetute, non `**`: in SQL (`space.raggio_scanner`) danno
  // lo stesso numero fino all'ultima cifra.
  let raggio: number = SCANNER.raggio
  for (let i = 0; i < aumenti; i++) raggio *= SCANNER.crescita
  if (tipoQui === 'nebulosa') return raggio * SCANNER.nebulosa
  if (tipoQui === 'pulsar') return raggio * SCANNER.pulsar
  return raggio
}

export interface Rilevamento {
  coordinate: Coordinate
  tipo: TipoCorpo
  distanza: number
}

/**
 * I corpi entro il raggio dello scanner (in distanza euclidea), dal più
 * vicino; se si passano i `tipi`, solo quelli.
 */
export function scansione(centro: Coordinate, raggio: number, tipi?: ReadonlySet<TipoCorpo>): Rilevamento[] {
  const trovati: Rilevamento[] = []
  const lato = Math.floor(raggio)
  for (let dx = -lato; dx <= lato; dx++)
    for (let dy = -lato; dy <= lato; dy++)
      for (let dz = -lato; dz <= lato; dz++) {
        if (dx === 0 && dy === 0 && dz === 0) continue
        const coordinate = { x: centro.x + dx, y: centro.y + dy, z: centro.z + dz }
        const d = distanza(centro, coordinate)
        if (d > raggio) continue
        const tipo = tipoSettore(coordinate)
        if (tipo && (!tipi || tipi.has(tipo))) trovati.push({ coordinate, tipo, distanza: d })
      }
  return trovati.sort((a, b) => a.distanza - b.distanza)
}
