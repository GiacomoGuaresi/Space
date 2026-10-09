// Le finestre della plancia per PC (doc/11-interfaccia.md#regole-delle-finestre):
// quali sono aperte, ridotte nel dock o chiuse, dove stanno e chi è in primo piano.
// La disposizione si ricorda sul dispositivo; ↺ Riordina torna a quella iniziale.

import { useSyncExternalStore } from 'react'

export type IdFinestra =
  | 'scanner'
  | 'rotta'
  | 'nave'
  | 'rete'
  | 'base'
  | 'fonda'
  | 'ricerche'
  | 'diario'
  | 'wiki'
  | 'catalogo'
  | 'traguardi'
  | 'impostazioni'

export type StatoFinestra = 'aperta' | 'ridotta' | 'chiusa'

export interface Riquadro {
  x: number
  y: number
  w: number
  h: number
}

export interface Finestra extends Riquadro {
  stato: StatoFinestra
}

export type Sfondo = 'scena' | 'mappa'

export interface Disposizione {
  finestre: Record<IdFinestra, Finestra>
  /** Dal fondo al primo piano. */
  ordine: IdFinestra[]
  /** Dietro le finestre: la scena del settore o la mappa 3D. */
  sfondo: Sfondo
}

/**
 * Titolo, tasto, misura iniziale e minima di ogni finestra. Le finestre
 * `piene` hanno già le loro spaziature (sono le pagine del telefono).
 */
export const FINESTRE: Readonly<
  Record<IdFinestra, { titolo: string; tasto: string; w: number; h: number; minW: number; minH: number; piena?: boolean }>
> = {
  scanner: { titolo: 'Scanner', tasto: 'S', w: 760, h: 560, minW: 560, minH: 280, piena: true },
  rotta: { titolo: 'Rotta', tasto: 'R', w: 360, h: 400, minW: 300, minH: 280 },
  nave: { titolo: 'Nave', tasto: 'N', w: 900, h: 640, minW: 640, minH: 320, piena: true },
  base: { titolo: 'Base', tasto: 'B', w: 460, h: 560, minW: 340, minH: 260, piena: true },
  fonda: { titolo: 'Fonda', tasto: 'F', w: 440, h: 520, minW: 340, minH: 300, piena: true },
  ricerche: { titolo: 'Ricerche', tasto: 'T', w: 800, h: 600, minW: 420, minH: 300, piena: true },
  rete: { titolo: 'Rete', tasto: 'E', w: 860, h: 600, minW: 600, minH: 300, piena: true },
  diario: { titolo: 'Diario di bordo', tasto: 'D', w: 420, h: 520, minW: 320, minH: 260, piena: true },
  wiki: { titolo: 'Wiki', tasto: 'W', w: 720, h: 560, minW: 420, minH: 300, piena: true },
  catalogo: { titolo: 'Catalogo', tasto: 'C', w: 640, h: 520, minW: 360, minH: 260, piena: true },
  traguardi: { titolo: 'Traguardi', tasto: 'G', w: 520, h: 480, minW: 340, minH: 240, piena: true },
  impostazioni: { titolo: 'Impostazioni', tasto: ',', w: 380, h: 560, minW: 320, minH: 240, piena: true },
}

const MARGINE = 12

/**
 * La disposizione di partenza in un'area `larghezza` × `altezza`: Scanner a
 * sinistra (più bassa se lo schermo è basso), Rotta a destra; le altre chiuse,
 * pronte ad aprirsi al centro. Qui non è una finestra: sta sempre sullo sfondo.
 */
export function disposizioneIniziale(larghezza: number, altezza = 816): Disposizione {
  const { scanner, rotta } = FINESTRE
  const altezzaScanner = Math.min(scanner.h, Math.max(scanner.minH, altezza - MARGINE * 2))
  // A cascata, perché aprendone più d'una si vedano tutti i titoli.
  const alCentro = (id: IdFinestra, n: number): Finestra => {
    const { w, h } = FINESTRE[id]
    return { stato: 'chiusa', x: Math.max(MARGINE, Math.round((larghezza - w) / 2) + n * 28), y: MARGINE * 2 + n * 28, w, h }
  }
  return {
    finestre: {
      scanner: { stato: 'aperta', x: MARGINE, y: MARGINE, w: scanner.w, h: altezzaScanner },
      rotta: { stato: 'aperta', x: Math.max(MARGINE, larghezza - rotta.w - MARGINE), y: MARGINE, w: rotta.w, h: rotta.h },
      wiki: alCentro('wiki', 0),
      catalogo: alCentro('catalogo', 1),
      diario: alCentro('diario', 2),
      impostazioni: alCentro('impostazioni', 3),
      nave: alCentro('nave', 4),
      rete: alCentro('rete', 5),
      base: alCentro('base', 6),
      fonda: alCentro('fonda', 2),
      ricerche: alCentro('ricerche', 0),
      traguardi: alCentro('traguardi', 1),
    },
    ordine: ['nave', 'rete', 'base', 'fonda', 'ricerche', 'diario', 'wiki', 'catalogo', 'traguardi', 'impostazioni', 'scanner', 'rotta'],
    sfondo: 'scena',
  }
}

/** Una finestra riportata dentro un'area `larghezza` × `altezza`, senza scendere sotto la misura minima. */
export function dentro(f: Finestra, id: IdFinestra, larghezza: number, altezza: number): Finestra {
  const w = Math.max(FINESTRE[id].minW, Math.min(f.w, larghezza))
  const h = Math.max(FINESTRE[id].minH, Math.min(f.h, altezza))
  return { ...f, w, h, x: Math.max(0, Math.min(f.x, larghezza - w)), y: Math.max(0, Math.min(f.y, altezza - h)) }
}

const CHIAVE = 'space_finestre'
const ID = Object.keys(FINESTRE) as IdFinestra[]
const STATI: readonly StatoFinestra[] = ['aperta', 'ridotta', 'chiusa']

/**
 * La disposizione salvata, completata con quella iniziale: una finestra nuova
 * (arrivata con una meccanica) parte chiusa al suo posto, i valori strani si scartano.
 */
export function leggiDisposizione(salvata: unknown, iniziale: Disposizione): Disposizione {
  if (!salvata || typeof salvata !== 'object') return iniziale
  const d = salvata as Partial<Disposizione>
  const finestre = { ...iniziale.finestre }
  for (const id of ID) {
    const f = d.finestre?.[id]
    if (f && STATI.includes(f.stato) && [f.x, f.y, f.w, f.h].every((n) => Number.isFinite(n))) finestre[id] = { ...f }
  }
  const ordine = Array.isArray(d.ordine) ? d.ordine.filter((id): id is IdFinestra => ID.includes(id)) : []
  return {
    finestre,
    ordine: [...ID.filter((id) => !ordine.includes(id)), ...new Set(ordine)],
    sfondo: d.sfondo === 'mappa' ? 'mappa' : 'scena',
  }
}

// L'area delle finestre prima di misurarla: lo schermo meno la barra di stato e il dock.
function schermo() {
  return typeof window === 'undefined'
    ? { larghezza: 1440, altezza: 816 }
    : { larghezza: window.innerWidth, altezza: window.innerHeight - 84 }
}

function carica(): Disposizione {
  const iniziale = disposizioneIniziale(schermo().larghezza, schermo().altezza)
  try {
    return leggiDisposizione(JSON.parse(localStorage.getItem(CHIAVE) ?? 'null'), iniziale)
  } catch {
    return iniziale
  }
}

let attuale: Disposizione = carica()
const ascoltatori = new Set<() => void>()

function cambia(nuova: Disposizione) {
  attuale = nuova
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(nuova))
  } catch {
    // Senza memoria locale la disposizione vale fino alla chiusura.
  }
  for (const avvisa of ascoltatori) avvisa()
}

// L'ultima misura dell'area delle finestre, data da `rientra`.
let area: { larghezza: number; altezza: number } | null = null

/** ↺ Riordina: la disposizione iniziale, con lo sfondo di adesso, dentro l'area. */
export function riordina() {
  const { larghezza, altezza } = area ?? schermo()
  cambia({ ...disposizioneIniziale(larghezza, altezza), sfondo: attuale.sfondo })
  if (area) rientra(area.larghezza, area.altezza)
}

/** Le finestre rientrano in un'area `larghezza` × `altezza`, se lo schermo si è ristretto. */
export function rientra(larghezza: number, altezza: number) {
  if (larghezza <= 0 || altezza <= 0) return
  area = { larghezza, altezza }
  let cambiate = false
  const finestre = { ...attuale.finestre }
  for (const id of ID) {
    const f = dentro(finestre[id], id, larghezza, altezza)
    if (f.x !== finestre[id].x || f.y !== finestre[id].y || f.w !== finestre[id].w || f.h !== finestre[id].h) {
      finestre[id] = f
      cambiate = true
    }
  }
  if (cambiate) cambia({ ...attuale, finestre })
}

/** La disposizione di adesso, fuori da React. */
export function disposizione(): Disposizione {
  return attuale
}

export function useDisposizione(): Disposizione {
  return useSyncExternalStore(
    (avvisa) => {
      ascoltatori.add(avvisa)
      return () => ascoltatori.delete(avvisa)
    },
    () => attuale,
  )
}

function conStato(id: IdFinestra, stato: StatoFinestra): Record<IdFinestra, Finestra> {
  return { ...attuale.finestre, [id]: { ...attuale.finestre[id], stato } }
}

/** In cima all'ordine: la finestra in primo piano. */
export function primoPiano(id: IdFinestra) {
  if (attuale.ordine.at(-1) === id) return
  cambia({ ...attuale, ordine: [...attuale.ordine.filter((i) => i !== id), id] })
}

/** Apre la finestra, o la riporta su se c'è già: una finestra per tipo. */
export function apri(id: IdFinestra) {
  cambia({ ...attuale, finestre: conStato(id, 'aperta'), ordine: [...attuale.ordine.filter((i) => i !== id), id] })
}

/** Scena o mappa dietro le finestre (⇆, o Tab). */
export function mostra(sfondo: Sfondo) {
  if (attuale.sfondo !== sfondo) cambia({ ...attuale, sfondo })
}

export function riduci(id: IdFinestra) {
  cambia({ ...attuale, finestre: conStato(id, 'ridotta') })
}

export function chiudi(id: IdFinestra) {
  cambia({ ...attuale, finestre: conStato(id, 'chiusa') })
}

/** Dal dock o dalla tastiera: apre la finestra, o la riduce se è già aperta in primo piano. */
export function alterna(id: IdFinestra) {
  const f = attuale.finestre[id]
  if (f.stato === 'aperta' && attuale.ordine.at(-1) === id) riduci(id)
  else apri(id)
}

export function sposta(id: IdFinestra, riquadro: Riquadro) {
  cambia({ ...attuale, finestre: { ...attuale.finestre, [id]: { ...attuale.finestre[id], ...riquadro } } })
}

/** La finestra aperta in primo piano, se ce n'è una. */
export function inPrimoPiano(d: Disposizione): IdFinestra | null {
  return [...d.ordine].reverse().find((id) => d.finestre[id].stato === 'aperta') ?? null
}
