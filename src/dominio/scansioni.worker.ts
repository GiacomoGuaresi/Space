// Il worker delle scansioni: i calcoli pesanti dello scanner fuori dal thread
// della pagina, così con uno scanner di livello alto l'interfaccia non si
// ferma. Riceve un lavoro alla volta dalla coda (ui/scansioni.ts) e tiene una
// copia delle ultime scansioni, che la mappa e il diario riusano.

import type { TipoCorpo } from './catalogo'
import { corpiNoti, rilevatiNuovi, type Rileva, type Sosta } from './mappa'
import { scansione, tipiRilevabili, type Rilevamento } from './navigazione'
import type { Coordinate } from './settore'

export type Lavoro =
  | {
      tipo: 'scansione'
      centro: Coordinate
      raggio: number
      /** I tipi rilevabili; null per tutti. */
      tipi: TipoCorpo[] | null
      gravitazionale?: number
    }
  | { tipo: 'noti'; soste: Sosta[]; scoperte: { coordinate: Coordinate; tipo: TipoCorpo }[] }
  | { tipo: 'rilevati'; soste: (Sosta & { istante: Date })[] }

export type Richiesta = { id: number; lavoro: Lavoro }
export type Risposta = { id: number; avanzamento: number } | { id: number; risultato: unknown } | { id: number; errore: string }

/** Il lavoro, con `avanza` che riceve la parte fatta da 0 a 1. Lo usa anche la coda quando i worker non ci sono (nei test). */
export function esegui(lavoro: Lavoro, avanza: (fatta: number) => void = () => {}): unknown {
  switch (lavoro.tipo) {
    case 'scansione': {
      const { centro, raggio, tipi, gravitazionale } = lavoro
      return scansione(centro, raggio, tipi ? new Set(tipi) : undefined, gravitazionale ?? raggio, avanza)
    }
    case 'noti':
      return corpiNoti(lavoro.soste, lavoro.scoperte, conAvanzamento(lavoro.soste.length, avanza))
    case 'rilevati':
      return rilevatiNuovi(lavoro.soste, conAvanzamento(lavoro.soste.length, avanza))
  }
}

// Le ultime scansioni delle soste, per chiave: una sosta torna in ogni lavoro della mappa e del diario.
const COPIE = 16
const copie = new Map<string, Rilevamento[]>()

const rilevaConCopia: Rileva = ({ centro, raggio, livello }) => {
  const chiave = `${centro.x},${centro.y},${centro.z}|${raggio}|${livello}`
  let trovati = copie.get(chiave)
  if (trovati) {
    // In fondo: è la più recente.
    copie.delete(chiave)
  } else {
    trovati = scansione(centro, raggio, tipiRilevabili(livello))
    if (copie.size >= COPIE) copie.delete(copie.keys().next().value!)
  }
  copie.set(chiave, trovati)
  return trovati
}

/** Il rilevatore con la copia, che a ogni sosta dice quante ne mancano. */
function conAvanzamento(totale: number, avanza: (fatta: number) => void): Rileva {
  let fatte = 0
  return (sosta) => {
    const trovati = rilevaConCopia(sosta)
    avanza(++fatte / Math.max(1, totale))
    return trovati
  }
}

// Solo dentro un worker: importato dalla coda (per `esegui`) non ascolta nulla.
const dentroWorker = 'WorkerGlobalScope' in globalThis
if (dentroWorker) {
  self.onmessage = ({ data }: MessageEvent<Richiesta>) => {
    const { id, lavoro } = data
    // L'avanzamento al massimo ogni 100 ms: i messaggi costano.
    let ultimo = 0
    const avanza = (avanzamento: number) => {
      const adesso = performance.now()
      if (adesso - ultimo < 100) return
      ultimo = adesso
      self.postMessage({ id, avanzamento } satisfies Risposta)
    }
    try {
      self.postMessage({ id, risultato: esegui(lavoro, avanza) } satisfies Risposta)
    } catch (e) {
      self.postMessage({ id, errore: e instanceof Error ? e.message : String(e) } satisfies Risposta)
    }
  }
}
