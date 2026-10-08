// Il cantiere (doc/02-meccaniche.md#nave, doc/09-bilanciamento.md#costi-e-tempi):
// cosa costa e quanto dura un livello, delle statistiche della nave e delle
// strutture di una base. Come `supabase/sql/015_cantiere.sql`.

import { BILANCIAMENTO } from './bilanciamento'
import { aLivello } from './insediamenti'
import { capacitaStiva, RISORSE, type Fatte, type Quantita } from './risorse'

export type Statistica = 'motore' | 'serbatoio' | 'ricarica' | 'scanner' | 'stiva'
export type Struttura = 'produzione' | 'magazzino' | 'cantiere' | 'deposito' | 'laboratorio'
export type Lavoro = Statistica | Struttura

export const STATISTICHE: readonly Statistica[] = ['motore', 'serbatoio', 'ricarica', 'scanner', 'stiva']
export const STRUTTURE: readonly Struttura[] = ['produzione', 'magazzino', 'cantiere', 'deposito', 'laboratorio']

export const NOMI_LAVORI: Readonly<Record<Lavoro, string>> = {
  motore: 'Motore',
  serbatoio: 'Serbatoio',
  ricarica: 'Ricarica',
  scanner: 'Scanner',
  stiva: 'Stiva',
  produzione: 'Produzione',
  magazzino: 'Magazzino',
  cantiere: 'Cantiere',
  deposito: 'Deposito carburante',
  laboratorio: 'Laboratorio',
}

export function eDellaNave(lavoro: Lavoro): lavoro is Statistica {
  return (STATISTICHE as readonly string[]).includes(lavoro)
}

/** Come si divide il costo di un livello: la ricetta del suo gradino. */
export function ricetta(livello: number): Partial<Quantita> {
  const { ricette } = BILANCIAMENTO.cantiere
  let mix: Partial<Quantita> = ricette[0].mix
  for (const r of ricette) if (livello >= r.da) mix = r.mix
  return mix
}

/**
 * Il costo per arrivare al livello `livello`. La stiva costa il 40 % della
 * stiva attuale (livello − 1); il resto `base × 1,45^(livello − 1)`.
 */
export function costoLavoro(lavoro: Lavoro, livello: number, fatte: Fatte = new Set()): Partial<Quantita> {
  return conLeghe(costoBase(lavoro, livello), fatte)
}

/** *Leghe* toglie il 10 % di Metallo e Silicio dalle ricette. Come `space.con_leghe`. */
export function conLeghe(costo: Partial<Quantita>, fatte: Fatte): Partial<Quantita> {
  if (!fatte.has('I4')) return costo
  const sconto = 1 - BILANCIAMENTO.ricerche.effetti.I4
  const risultato = { ...costo }
  for (const r of ['metallo', 'silicio'] as const) if (risultato[r] !== undefined) risultato[r] = risultato[r]! * sconto
  return risultato
}

function costoBase(lavoro: Lavoro, livello: number): Partial<Quantita> {
  const { cantiere } = BILANCIAMENTO
  const costo: Partial<Quantita> = {}
  if (lavoro === 'stiva') {
    const totale = capacitaStiva(livello - 1) * cantiere.stiva.quota
    for (const [r, parte] of Object.entries(cantiere.stiva.mix)) costo[r as keyof Quantita] = totale * parte
    return costo
  }
  // Il laboratorio di livello L costa come una ricerca di gradino L (doc/09-bilanciamento.md#costi-e-tempi).
  const { base, costo: passo } = BILANCIAMENTO.ricerche
  const livelloCosto = lavoro === 'laboratorio' ? passo * livello : livello
  const totale = aLivello(lavoro === 'laboratorio' ? base : cantiere.base[lavoro], cantiere.crescita, livelloCosto)
  for (const [r, parte] of Object.entries(ricetta(livelloCosto))) costo[r as keyof Quantita] = totale * parte
  return costo
}

/** Quante ore dura arrivare al livello `livello`, con il cantiere della base a `livelloCantiere` (0 se non c'è). */
export function durataLavoro(lavoro: Lavoro, livello: number, livelloCantiere: number, fatte: Fatte = new Set()): number {
  const { cantiere } = BILANCIAMENTO
  if (lavoro === 'stiva') return cantiere.stiva.ore
  let ore: number = cantiere.ore
  for (let i = 2; i < livello; i++) ore *= cantiere.crescitaTempo
  // *Automazione* accorcia del 10 %.
  const automazione = fatte.has('I1') ? 1 - BILANCIAMENTO.ricerche.effetti.I1 : 1
  return (ore / (1 + cantiere.riduzione * (Math.max(1, livelloCantiere) - 1))) * automazione
}

/** Il valore di motore (settori/h), serbatoio (unità) o ricarica (unità/h) al livello `livello`. */
export function valoreNave(statistica: 'motore' | 'serbatoio' | 'ricarica', livello: number): number {
  const { nave } = BILANCIAMENTO
  const base = statistica === 'motore' ? nave.velocita : statistica === 'serbatoio' ? nave.serbatoio : nave.ricarica
  return aLivello(base, nave.crescita, livello)
}

/** Quanto manca per pagare `costo` con stiva e magazzino insieme: vuoto se si può. */
export function mancante(costo: Partial<Quantita>, stiva: Quantita, magazzino: Partial<Quantita>): Partial<Quantita> {
  const manca: Partial<Quantita> = {}
  for (const r of RISORSE) {
    const c = costo[r]
    if (c && c > stiva[r] + (magazzino[r] ?? 0)) manca[r] = c - stiva[r] - (magazzino[r] ?? 0)
  }
  return manca
}

/**
 * L'Idrogeno per il pieno al deposito di livello `deposito` (doc/09-bilanciamento.md#carburante):
 * `5 × 0,9^(livello − 1)` per ogni unità che manca. Come `space.costo_pieno`.
 */
export function costoPieno(mancano: number, deposito: number, fatte: Fatte = new Set()): number {
  const { idrogeno, crescita } = BILANCIAMENTO.deposito
  // *Raffinazione I* (P1) toglie un'unità di Idrogeno per unità di carburante.
  const base = idrogeno - (fatte.has('P1') ? BILANCIAMENTO.ricerche.effetti.P1 : 0)
  return Math.max(0, mancano) * aLivello(base, crescita, deposito)
}
