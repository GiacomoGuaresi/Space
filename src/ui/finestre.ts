// Le finestre della plancia per PC (doc/11-interfaccia.md#regole-delle-finestre):
// quali sono aperte, ridotte nel dock o chiuse, dove stanno e chi è in primo piano.

import { useSyncExternalStore } from 'react'

export type IdFinestra = 'qui' | 'scanner' | 'rotta'

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

export interface Disposizione {
  finestre: Record<IdFinestra, Finestra>
  /** Dal fondo al primo piano. */
  ordine: IdFinestra[]
}

/** Titolo, tasto, misura iniziale e minima di ogni finestra. */
export const FINESTRE: Readonly<Record<IdFinestra, { titolo: string; tasto: string; w: number; h: number; minW: number; minH: number }>> = {
  qui: { titolo: 'Qui', tasto: 'Q', w: 340, h: 300, minW: 260, minH: 160 },
  scanner: { titolo: 'Scanner', tasto: 'S', w: 340, h: 420, minW: 260, minH: 200 },
  rotta: { titolo: 'Rotta', tasto: 'R', w: 340, h: 320, minW: 280, minH: 220 },
}

const MARGINE = 12

/** La disposizione di partenza in un'area larga `larghezza`: Scanner e Qui a sinistra, Rotta a destra. */
export function disposizioneIniziale(larghezza: number): Disposizione {
  const { qui, scanner, rotta } = FINESTRE
  return {
    finestre: {
      scanner: { stato: 'aperta', x: MARGINE, y: MARGINE, w: scanner.w, h: scanner.h },
      qui: { stato: 'aperta', x: MARGINE, y: MARGINE * 2 + scanner.h, w: qui.w, h: qui.h },
      rotta: { stato: 'aperta', x: Math.max(MARGINE, larghezza - rotta.w - MARGINE), y: MARGINE, w: rotta.w, h: rotta.h },
    },
    ordine: ['qui', 'scanner', 'rotta'],
  }
}

/** Una finestra riportata dentro un'area `larghezza` × `altezza`, senza scendere sotto la misura minima. */
export function dentro(f: Finestra, id: IdFinestra, larghezza: number, altezza: number): Finestra {
  const w = Math.max(FINESTRE[id].minW, Math.min(f.w, larghezza))
  const h = Math.max(FINESTRE[id].minH, Math.min(f.h, altezza))
  return { ...f, w, h, x: Math.max(0, Math.min(f.x, larghezza - w)), y: Math.max(0, Math.min(f.y, altezza - h)) }
}

let attuale: Disposizione = disposizioneIniziale(typeof window === 'undefined' ? 1440 : window.innerWidth)
const ascoltatori = new Set<() => void>()

function cambia(nuova: Disposizione) {
  attuale = nuova
  for (const avvisa of ascoltatori) avvisa()
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
  cambia({ finestre: conStato(id, 'aperta'), ordine: [...attuale.ordine.filter((i) => i !== id), id] })
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
