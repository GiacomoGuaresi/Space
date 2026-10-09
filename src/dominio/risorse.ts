// Le risorse e la stiva (doc/02-meccaniche.md#risorse): sei risorse, una
// capacità per ognuna, che cresce col livello della stiva.

import { BILANCIAMENTO } from './bilanciamento'
import type { Risorsa } from './catalogo'
import type { Nave } from './navigazione'
import { settore, type Corpo } from './settore'

export type { Risorsa }

/** In ordine di rarità, come nelle ricette (doc/09-bilanciamento.md#ricette). */
export const RISORSE: readonly Risorsa[] = ['metallo', 'silicio', 'ghiaccio', 'idrogeno', 'terreRare', 'materiaOscura']

/** Le sigle, per le barre strette (i nomi stanno in catalogo.ts, `NOMI_RISORSE`). */
export const SIGLE_RISORSE: Readonly<Record<Risorsa, string>> = {
  metallo: 'M',
  silicio: 'S',
  ghiaccio: 'G',
  idrogeno: 'H',
  terreRare: 'T',
  materiaOscura: 'MO',
}

/** Una quantità per risorsa. */
export type Quantita = Record<Risorsa, number>

export function nessuna(): Quantita {
  return { metallo: 0, silicio: 0, ghiaccio: 0, idrogeno: 0, terreRare: 0, materiaOscura: 0 }
}

/**
 * La capacità della stiva per ogni risorsa al livello `livello`. Moltiplicazioni
 * ripetute e non una potenza: in SQL (`space.capacita_stiva`) il risultato è identico.
 */
export function capacitaStiva(livello: number): number {
  const { capacita, crescita } = BILANCIAMENTO.stiva
  let valore: number = capacita
  for (let i = 1; i < livello; i++) valore *= crescita
  return valore
}

/** Le ricerche completate: alcune cambiano i numeri (doc/10-ricerche.md). */
export type Fatte = ReadonlySet<string>

const NESSUNA: Fatte = new Set()

/** La capacità della stiva con le ricerche: *Stiva modulare* la alza del 15 %. Come `space.capacita_di`. */
export function capacitaNave(livello: number, fatte: Fatte = NESSUNA): number {
  return capacitaStiva(livello) * (fatte.has('I2') ? 1 + BILANCIAMENTO.ricerche.effetti.I2 : 1)
}

/** Quello che c'è a bordo, valido dall'istante `dal`. */
export interface Carico {
  quantita: Quantita
  dal: Date
}

/**
 * Come si divide la produzione di un corpo tra le risorse, o `null` se non ne
 * ha di raccoglibili. Per ora solo le comuni: Terre rare e Materia oscura si
 * raccolgono con M8-M9 (doc/06-roadmap.md). Un sistema planetario fa la media
 * dei suoi pianeti, nell'ordine delle orbite.
 */
export function mixCorpo(corpo: Corpo | null): Partial<Quantita> | null {
  if (!corpo) return null
  const { mix } = BILANCIAMENTO
  const d = corpo.dettagli
  switch (d.tipo) {
    case 'asteroidi':
      return { ...mix.asteroidi[d.composizione] }
    case 'nebulosa':
      return { ...mix.nebulosa }
    case 'gigante':
      return { ...mix.gigante[d.anelli ? 'anelli' : 'senza'] }
    case 'sistema': {
      const media: Partial<Quantita> = {}
      for (const p of d.pianeti) {
        for (const [r, parte] of Object.entries(mix.pianeti[p.tipo]) as [Risorsa, number][]) {
          media[r] = (media[r] ?? 0) + parte
        }
      }
      for (const r of Object.keys(media) as Risorsa[]) media[r] = media[r]! / d.pianeti.length
      return media
    }
    default:
      return null
  }
}

/**
 * Il ritmo di un estrattore di livello 1 su un corpo di ricchezza 1, per la
 * risorsa `r`: le rare si producono più piano. Come `space.ritmo_risorsa`.
 */
export function ritmoRisorsa(r: Risorsa): number {
  const { ritmo } = BILANCIAMENTO.produzione
  return r === 'terreRare' ? ritmo.terreRare : r === 'materiaOscura' ? ritmo.materiaOscura : ritmo.comune
}

/** Quanto raccoglie la nave all'ora, a mano, in sosta su `corpo`: `null` se lì non c'è nulla da raccogliere. */
export function ritmoMano(corpo: Corpo | null): Partial<Quantita> | null {
  const mix = mixCorpo(corpo)
  if (!corpo || !mix) return null
  const { mano, ritmo } = BILANCIAMENTO.produzione
  const ritmi: Partial<Quantita> = {}
  for (const r of RISORSE) {
    const parte = mix[r]
    if (parte) ritmi[r] = mano * ritmo.comune * corpo.ricchezza * parte
  }
  return ritmi
}

/**
 * La stiva a `ora`: in sosta su un corpo con risorse la nave raccoglie da
 * sola, da quando è arrivata (o dall'ultima volta che la stiva è stata
 * scritta), fino a riempire la stiva. Come `space.stiva_ora` in SQL.
 */
export function caricoOra(carico: Carico, nave: Nave, ora: Date, fatte: Fatte = NESSUNA): Quantita {
  const quantita = { ...carico.quantita }
  if (nave.dal > ora) return quantita
  const ritmi = ritmoMano(settore(nave.posizione).corpo)
  if (!ritmi) return quantita
  const capacita = capacitaNave(nave.stiva, fatte)
  const inizio = Math.max(carico.dal.getTime(), nave.dal.getTime())
  const ore = Math.max(0, ora.getTime() - inizio) / 3_600_000
  for (const r of RISORSE) {
    const ritmo = ritmi[r]
    // Oltre la capacità non si raccoglie, ma quello che c'è resta.
    if (ritmo && quantita[r] < capacita) quantita[r] = Math.min(capacita, quantita[r] + ritmo * ore)
  }
  return quantita
}

/** Tra quante ore la raccolta a mano riempie la stiva per ogni risorsa che si raccoglie qui. */
export function stivaPienaTra(carico: Carico, nave: Nave, ora: Date, fatte: Fatte = NESSUNA): Partial<Quantita> {
  const ritmi = ritmoMano(settore(nave.posizione).corpo) ?? {}
  const adesso = caricoOra(carico, nave, ora, fatte)
  const capacita = capacitaNave(nave.stiva, fatte)
  const tra: Partial<Quantita> = {}
  for (const r of RISORSE) {
    const ritmo = ritmi[r]
    if (ritmo) tra[r] = Math.max(0, (capacita - adesso[r]) / ritmo)
  }
  return tra
}

/**
 * Il bottino di una cometa (doc/09-bilanciamento.md#comete-e-relitti), preso
 * all'arrivo una volta sola: Ghiaccio e, con la coda lunga, Idrogeno. Quello
 * che non entra nella stiva si perde. Come `space.bottino_cometa` in SQL.
 */
export function bottinoCometa(corpo: Corpo | null): Partial<Quantita> | null {
  if (corpo?.dettagli.tipo !== 'cometa') return null
  const { ghiaccio, codaLunga, idrogeno } = BILANCIAMENTO.cometa
  return {
    ghiaccio: ghiaccio * corpo.ricchezza,
    ...(corpo.dettagli.coda >= codaLunga ? { idrogeno: idrogeno * corpo.ricchezza } : {}),
  }
}

/** Quanto di `bottino` entra davvero nella stiva, che ha già `quantita`. */
export function inStiva(bottino: Partial<Quantita>, quantita: Quantita, capacita: number): Partial<Quantita> {
  const preso: Partial<Quantita> = {}
  for (const r of RISORSE) {
    const q = bottino[r]
    if (q) preso[r] = Math.max(0, Math.min(q, capacita - quantita[r]))
  }
  return preso
}
