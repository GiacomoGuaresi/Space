// Il cantiere (doc/02-meccaniche.md#nave, doc/09-bilanciamento.md#costi-e-tempi):
// cosa costa e quanto dura un livello, delle statistiche della nave e delle
// strutture di una base. Come `supabase/sql/015_cantiere.sql`.

import { BILANCIAMENTO } from './bilanciamento'
import { aLivello } from './insediamenti'
import { capacitaStiva, RISORSE, type Fatte, type Quantita } from './risorse'

export type Statistica = 'motore' | 'serbatoio' | 'ricarica' | 'scanner' | 'stiva'
export type Struttura = 'produzione' | 'magazzino' | 'cantiere' | 'deposito' | 'laboratorio' | 'radar' | 'ponte'
export type Lavoro = Statistica | Struttura

export const STATISTICHE: readonly Statistica[] = ['motore', 'serbatoio', 'ricarica', 'scanner', 'stiva']
export const STRUTTURE: readonly Struttura[] = ['produzione', 'magazzino', 'cantiere', 'deposito', 'laboratorio', 'radar', 'ponte']

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
  radar: 'Radar',
  ponte: 'Ponte di curvatura',
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

/**
 * Le ricerche che tolgono una parte di qualche risorsa dalle ricette: *Leghe*
 * (I4) Metallo e Silicio, *Superleghe* (I8) Terre rare, *Materia esotica* (I10)
 * Materia oscura.
 */
const SCONTI: readonly [ricerca: 'I4' | 'I8' | 'I10', risorse: readonly (keyof Quantita)[]][] = [
  ['I4', ['metallo', 'silicio']],
  ['I8', ['terreRare']],
  ['I10', ['materiaOscura']],
]

/** Un costo con gli sconti delle ricerche fatte (`SCONTI`). Come `space.con_leghe`. */
export function conLeghe(costo: Partial<Quantita>, fatte: Fatte): Partial<Quantita> {
  const effetti: Partial<Record<string, number>> = BILANCIAMENTO.ricerche.effetti
  const risultato = { ...costo }
  for (const [ricerca, risorse] of SCONTI) {
    const parte = effetti[ricerca]
    if (!fatte.has(ricerca) || parte === undefined) continue
    for (const r of risorse) if (risultato[r] !== undefined) risultato[r] = risultato[r]! * (1 - parte)
  }
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
  // Il laboratorio di livello L costa come una ricerca di gradino L, il ponte come un livello 8
  // (doc/09-bilanciamento.md#costi-e-tempi).
  const { base, costo: passo } = BILANCIAMENTO.ricerche
  const livelloCosto = lavoro === 'laboratorio' ? passo * livello : lavoro === 'ponte' ? BILANCIAMENTO.ponte.livello : livello
  const totale = aLivello(lavoro === 'laboratorio' ? base : cantiere.base[lavoro], cantiere.crescita, livelloCosto)
  for (const [r, parte] of Object.entries(ricetta(livelloCosto))) costo[r as keyof Quantita] = totale * parte
  return costo
}

/** Quante ore dura arrivare al livello `livello`, con il cantiere della base a `livelloCantiere` (0 se non c'è). */
export function durataLavoro(lavoro: Lavoro, livello: number, livelloCantiere: number, fatte: Fatte = new Set()): number {
  const { cantiere } = BILANCIAMENTO
  if (lavoro === 'stiva') return cantiere.stiva.ore
  // Il ponte dura come un livello 8.
  const fino = lavoro === 'ponte' ? BILANCIAMENTO.ponte.livello : livello
  let ore: number = cantiere.ore
  for (let i = 2; i < fino; i++) ore *= cantiere.crescitaTempo
  // *Automazione* accorcia del 10 %, *Automazione II* del 15 %.
  const { I1, I7 } = BILANCIAMENTO.ricerche.effetti
  return (
    (ore / (1 + cantiere.riduzione * (Math.max(1, livelloCantiere) - 1))) *
    (fatte.has('I1') ? 1 - I1 : 1) *
    (fatte.has('I7') ? 1 - I7 : 1)
  )
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
  // Ogni *Raffinazione* (P1, P4…) toglie un'unità di Idrogeno per unità di carburante.
  const base = idrogeno - raffinazione(fatte)
  return Math.max(0, mancano) * aLivello(base, crescita, deposito)
}

/** Le ricerche di Raffinazione, in ordine (doc/10-ricerche.md#propulsione). */
export const RAFFINAZIONE = ['P1', 'P4', 'P7', 'P10'] as const

/** Quante unità di Idrogeno tolgono dal pieno le Raffinazioni fatte. Come `space.costo_pieno_di`. */
export function raffinazione(fatte: Fatte): number {
  const effetti: Partial<Record<string, number>> = BILANCIAMENTO.ricerche.effetti
  return RAFFINAZIONE.reduce((n, r) => n + (fatte.has(r) ? (effetti[r] ?? 0) : 0), 0)
}

/** La Materia oscura per saltare `ore` ore di un viaggio, di un lavoro o della ricarica: `2 × ore^1,5`. Come `space.costo_accelera`. */
export function costoAccelera(ore: number): number {
  const { base, esponente } = BILANCIAMENTO.accelera
  return base * Math.max(0, ore) ** esponente
}
