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
  /** Vero se è un viaggio tra due ponti di curvatura. */
  ponte: boolean
}

export function inViaggio(nave: Nave, ora: Date): boolean {
  return ora < nave.dal
}

const ORA_MS = 3_600_000

/**
 * Ciò che cambia i conti del carburante oltre alla nave: le ricerche fatte e
 * dove sono le basi del giocatore (la base madre e le colonie, non gli estrattori).
 */
export interface Dintorni {
  fatte?: ReadonlySet<string>
  basi?: readonly Coordinate[]
  /** Le basi col ponte di curvatura. */
  ponti?: readonly Coordinate[]
}

/** La ricarica all'ora, da fermi nel settore `qui`: più veloce accanto a una stella. */
export function ricaricaQui(nave: Nave, qui: Coordinate, { fatte }: Dintorni = {}): number {
  if (tipoSettore(qui) !== 'stella') return nave.ricarica
  // *Vele solari* (P5) la portano da ×2 a ×3.
  return nave.ricarica * (fatte?.has('P5') ? BILANCIAMENTO.ricerche.effetti.P5 : CARBURANTE.ricaricaStella)
}

/**
 * Fin dove si ricarica il serbatoio da fermi nel settore `qui`: pieno in una
 * base e accanto a una stella, altrove solo in parte. Come `space.tetto`.
 */
export function tettoQui(nave: Nave, qui: Coordinate, { basi = [] }: Dintorni = {}): number {
  const pieno = stessoSettore(qui, BASE) || basi.some((b) => stessoSettore(b, qui)) || tipoSettore(qui) === 'stella'
  return nave.serbatoio * (pieno ? 1 : CARBURANTE.tettoFuori)
}

/**
 * Il carburante adesso: fermo da `dal`, si ricarica fino al tetto. Se è già
 * oltre (arrivato da una base con il pieno) non cala: smette solo di salire.
 */
export function carburanteOra(nave: Nave, ora: Date, dintorni: Dintorni = {}): number {
  if (inViaggio(nave, ora)) return nave.carburante
  const tetto = tettoQui(nave, nave.posizione, dintorni)
  if (nave.carburante >= tetto) return nave.carburante
  const ore = (ora.getTime() - nave.dal.getTime()) / ORA_MS
  return Math.min(tetto, nave.carburante + ricaricaQui(nave, nave.posizione, dintorni) * ore)
}

/** Fra quanto il carburante arriva al tetto, in millisecondi (0 se c'è già). */
export function pienoTra(nave: Nave, ora: Date, dintorni: Dintorni = {}): number {
  const mancante = tettoQui(nave, nave.posizione, dintorni) - carburanteOra(nave, ora, dintorni)
  return Math.max(0, (mancante / ricaricaQui(nave, nave.posizione, dintorni)) * ORA_MS)
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
  /** Vero se si parte da un ponte di curvatura verso un altro. */
  ponte: boolean
  /** Falso se la nave non riesce nemmeno a muoversi. */
  possibile: boolean
}

/** Cosa succederebbe partendo adesso verso `meta`. */
export function anteprima(nave: Nave, meta: Coordinate, ora: Date, dintorni: Dintorni = {}): Anteprima {
  const fatte = dintorni.fatte ?? new Set<string>()
  const fionda = tipoSettore(nave.posizione) === 'buconero'
  const ponte = viaPonte(nave.posizione, meta, dintorni.ponti)
  const r = rotta(nave.posizione, meta, carburanteOra(nave, ora, dintorni), quotaConsumo(fionda, fatte, ponte))
  const velocita = nave.velocita * (fionda ? FIONDA.velocita : 1) * (ponte ? fattorePonte(fatte) : 1)
  return {
    ...r,
    durata: (r.percorsa / velocita) * ORA_MS,
    fionda,
    ponte,
    possibile: !stessoSettore(r.a, nave.posizione),
  }
}

/** Vero se `da` e `meta` sono due basi col ponte di curvatura. */
export function viaPonte(da: Coordinate, meta: Coordinate, ponti: readonly Coordinate[] = []): boolean {
  return ponti.some((p) => stessoSettore(p, da)) && ponti.some((p) => stessoSettore(p, meta))
}

/** Di quanto il ponte moltiplica la velocità e divide il carburante: 3, o 4 con *Ponte risonante* (P8). */
export function fattorePonte(fatte: ReadonlySet<string>): number {
  return fatte.has('P8') ? BILANCIAMENTO.ricerche.effetti.P8 : BILANCIAMENTO.ponte.fattore
}

/**
 * La parte dei settori percorsi che consuma carburante: meno con la fionda,
 * con *Iniettori* (P2) e tra due ponti. Come in `space.viaggia`, negli stessi passi.
 */
export function quotaConsumo(fionda: boolean, fatte: ReadonlySet<string>, ponte = false): number {
  return ((fionda ? 1 - FIONDA.gratis : 1) * (fatte.has('P2') ? 1 - BILANCIAMENTO.ricerche.effetti.P2 : 1)) / (ponte ? fattorePonte(fatte) : 1)
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

/**
 * Il raggio dello scanner fermi in `qui`, con le ricerche: con *Filtri
 * nebulari* (S5) le nebulose non lo riducono. Come `space.raggio_di`.
 */
export function raggioQui(livello: number, qui: Coordinate, fatte: ReadonlySet<string> = new Set()): number {
  const tipo = tipoSettore(qui)
  return raggioScanner(livello, tipo === 'nebulosa' && fatte.has('S5') ? null : tipo)
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

/** Il raggio del radar di una base al livello dato (doc/09-bilanciamento.md#strutture): 0 se non c'è. */
export function raggioRadar(livello: number): number {
  if (livello < 1) return 0
  const { raggio, crescita } = BILANCIAMENTO.radar
  let valore: number = raggio
  for (let i = 1; i < livello; i++) valore *= crescita
  return valore
}
