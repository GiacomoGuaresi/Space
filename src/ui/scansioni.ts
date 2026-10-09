// La coda delle scansioni: i lavori dello scanner (dominio/scansioni.worker.ts)
// vanno a un worker, uno alla volta, prima quelli che si stanno guardando
// (lo scanner, il radar) e poi gli altri (la mappa, il diario). Un lavoro
// chiesto due volte si fa una volta sola, e gli ultimi risultati si tengono.

import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import type { TipoCorpo } from '../dominio/catalogo'
import type { PuntoMappa, Rilevato } from '../dominio/mappa'
import { esegui, type Lavoro, type Richiesta, type Risposta } from '../dominio/scansioni.worker'
import type { Coordinate } from '../dominio/settore'

export type { Lavoro }

/** Alta: lo si sta guardando adesso. Bassa: può aspettare. */
export type Priorita = 'alta' | 'bassa'

export interface Opzioni {
  priorita?: Priorita
  /**
   * Un lavoro nuovo sullo stesso canale scarta quelli ancora in coda: la nave
   * si è spostata e la scansione di prima non serve più.
   */
  canale?: string
}

/** La promessa di un lavoro scartato perché ne è arrivato uno più nuovo sullo stesso canale. */
export class Superato extends Error {}

interface Attesa {
  risolvi: (risultato: unknown) => void
  rifiuta: (errore: Error) => void
}

interface InCoda {
  chiave: string
  lavoro: Lavoro
  priorita: Priorita
  canale?: string
  attese: Attesa[]
}

// Ogni risultato può pesare decine di MB (100 mila corpi allo scanner 25): se ne tengono pochi.
const RISULTATI = 6
const risultati = new Map<string, unknown>()
const avanzamenti = new Map<string, number>()
let coda: InCoda[] = []
let inCorso: (InCoda & { id: number }) | null = null
let prossimo = 1
let lavoratore: Worker | null | undefined

let versione = 0
const ascoltatori = new Set<() => void>()
function avvisa() {
  versione++
  for (const a of ascoltatori) a()
}

const chiaveDi = (lavoro: Lavoro) => JSON.stringify(lavoro)

function memorizza(chiave: string, risultato: unknown) {
  risultati.delete(chiave)
  if (risultati.size >= RISULTATI) risultati.delete(risultati.keys().next().value!)
  risultati.set(chiave, risultato)
}

/** Il worker, creato alla prima richiesta; senza (nei test, o se non parte) i lavori si fanno qui, a turno. */
function worker(): Worker | null {
  if (lavoratore !== undefined) return lavoratore
  try {
    lavoratore =
      typeof Worker === 'undefined'
        ? null
        : new Worker(new URL('../dominio/scansioni.worker.ts', import.meta.url), { type: 'module', name: 'scansioni' })
  } catch {
    lavoratore = null
  }
  if (lavoratore) {
    lavoratore.onmessage = ({ data }: MessageEvent<Risposta>) => ricevi(data)
    // Se il worker si rompe, il lavoro in corso fallisce e i prossimi si fanno qui.
    lavoratore.onerror = (e) => {
      e.preventDefault()
      console.error('Worker delle scansioni fermo', e.message)
      lavoratore?.terminate()
      lavoratore = null
      if (inCorso) ricevi({ id: inCorso.id, errore: e.message || 'worker fermo' })
    }
  }
  return lavoratore
}

function avvia() {
  if (inCorso || coda.length === 0) return
  const i = coda.findIndex((v) => v.priorita === 'alta')
  const [voce] = coda.splice(Math.max(0, i), 1)
  const id = prossimo++
  inCorso = { ...voce, id }
  const w = worker()
  if (w) {
    w.postMessage({ id, lavoro: voce.lavoro } satisfies Richiesta)
    return
  }
  // Senza worker: dopo un giro, così intanto la pagina si disegna.
  setTimeout(() => {
    try {
      ricevi({ id, risultato: esegui(voce.lavoro) })
    } catch (e) {
      ricevi({ id, errore: e instanceof Error ? e.message : String(e) })
    }
  })
}

function ricevi(risposta: Risposta) {
  if (!inCorso || risposta.id !== inCorso.id) return
  if ('avanzamento' in risposta) {
    avanzamenti.set(inCorso.chiave, risposta.avanzamento)
    return avvisa()
  }
  const voce = inCorso
  inCorso = null
  avanzamenti.delete(voce.chiave)
  if ('risultato' in risposta) {
    memorizza(voce.chiave, risposta.risultato)
    for (const a of voce.attese) a.risolvi(risposta.risultato)
  } else {
    for (const a of voce.attese) a.rifiuta(new Error(risposta.errore))
  }
  avvisa()
  avvia()
}

/** Il risultato di un lavoro: subito se c'è già, altrimenti quando il worker arriva al suo turno. */
export function richiedi<T>(lavoro: Lavoro, { priorita = 'bassa', canale }: Opzioni = {}): Promise<T> {
  const chiave = chiaveDi(lavoro)
  if (risultati.has(chiave)) {
    const risultato = risultati.get(chiave)
    memorizza(chiave, risultato)
    return Promise.resolve(risultato as T)
  }
  return new Promise<T>((risolvi, rifiuta) => {
    const attesa: Attesa = { risolvi: risolvi as (r: unknown) => void, rifiuta }
    if (inCorso?.chiave === chiave) return void inCorso.attese.push(attesa)
    const gia = coda.find((v) => v.chiave === chiave)
    if (gia) {
      gia.attese.push(attesa)
      if (priorita === 'alta') gia.priorita = 'alta'
      return
    }
    if (canale) {
      for (const v of coda.filter((v) => v.canale === canale)) {
        avanzamenti.delete(v.chiave)
        for (const a of v.attese) a.rifiuta(new Superato())
      }
      coda = coda.filter((v) => v.canale !== canale)
    }
    coda.push({ chiave, lavoro, priorita, canale, attese: [attesa] })
    avanzamenti.set(chiave, 0)
    avvisa()
    avvia()
  })
}

/**
 * Un lavoro della coda dentro un componente. Finché il risultato non c'è
 * `valore` è undefined (o, con `tieni`, quello di prima) e `avanzamento` dice
 * a che punto è, da 0 a 1.
 */
export function useScansione<T>(
  lavoro: Lavoro | null,
  { tieni = false, ...opzioni }: Opzioni & { tieni?: boolean } = {},
): { valore: T | undefined; avanzamento: number | null } {
  const chiave = useMemo(() => (lavoro ? chiaveDi(lavoro) : null), [lavoro])
  useSyncExternalStore(
    (avvisa) => {
      ascoltatori.add(avvisa)
      return () => ascoltatori.delete(avvisa)
    },
    () => versione,
    () => versione,
  )
  const valore = chiave === null ? undefined : (risultati.get(chiave) as T | undefined)
  const manca = chiave !== null && valore === undefined
  const { priorita, canale } = opzioni
  useEffect(() => {
    // Anche quando il risultato esce dalla memoria mentre lo si guarda: si richiede.
    if (lavoro && manca)
      richiedi(lavoro, { priorita, canale }).catch((e) => {
        if (!(e instanceof Superato)) console.error('Scansione non riuscita', e)
      })
    // Il lavoro conta per la sua chiave, non per l'oggetto.
  }, [chiave, manca, priorita, canale])
  const ultimo = useRef<T | undefined>(undefined)
  if (valore !== undefined) ultimo.current = valore
  return {
    valore: valore ?? (tieni ? ultimo.current : undefined),
    avanzamento: manca ? (avanzamenti.get(chiave!) ?? 0) : null,
  }
}

interface SostaDatata {
  centro: Coordinate
  raggio: number
  livello: number
  istante: Date
}

/** Il lavoro dei corpi noti (la mappa, i pallini, la wiki): le soste e le scoperte, senza il superfluo. */
export function lavoroNoti(soste: readonly SostaDatata[], scoperte: readonly { coordinate: Coordinate; tipo: TipoCorpo }[]): Lavoro {
  return {
    tipo: 'noti',
    soste: soste.map(({ centro, raggio, livello }) => ({ centro, raggio, livello })),
    scoperte: scoperte.map(({ coordinate, tipo }) => ({ coordinate, tipo })),
  }
}

/** Il lavoro delle novità dello scanner per il diario. */
export function lavoroRilevati(soste: readonly SostaDatata[]): Lavoro {
  return { tipo: 'rilevati', soste: soste.map(({ centro, raggio, livello, istante }) => ({ centro, raggio, livello, istante })) }
}

/** I corpi noti, calcolati nel worker; mentre si ricalcolano restano quelli di prima. */
export function useCorpiNoti(
  soste: readonly SostaDatata[],
  scoperte: readonly { coordinate: Coordinate; tipo: TipoCorpo }[],
): { punti: PuntoMappa[] | undefined; avanzamento: number | null } {
  const lavoro = useMemo(() => lavoroNoti(soste, scoperte), [soste, scoperte])
  const { valore, avanzamento } = useScansione<PuntoMappa[]>(lavoro, { canale: 'noti', tieni: true })
  return { punti: valore, avanzamento }
}

/** Le novità dello scanner per il diario, calcolate nel worker. */
export function useRilevati(soste: readonly SostaDatata[]): Rilevato[] | undefined {
  const lavoro = useMemo(() => lavoroRilevati(soste), [soste])
  return useScansione<Rilevato[]>(lavoro, { canale: 'rilevati', tieni: true }).valore
}
