// Le risorse e la stiva (doc/02-meccaniche.md#risorse): sei risorse, una
// capacità per ognuna, che cresce col livello della stiva.

import { BILANCIAMENTO } from './bilanciamento'
import type { Risorsa } from './catalogo'
import type { Nave } from './navigazione'
import { casuale, derivato, seedSettore } from './casuale'
import { settore, type Coordinate, type Corpo } from './settore'

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
 * ha di raccoglibili. Le pulsar danno Terre rare, i buchi neri Materia
 * oscura. Un sistema planetario fa la media dei suoi pianeti, nell'ordine
 * delle orbite.
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
    case 'pulsar':
      return { ...mix.pulsar }
    case 'buconero':
      return { ...mix.buconero }
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
  const { mano } = BILANCIAMENTO.produzione
  const ritmi: Partial<Quantita> = {}
  for (const r of RISORSE) {
    const parte = mix[r]
    if (parte) ritmi[r] = mano * ritmoRisorsa(r) * corpo.ricchezza * parte
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
 * all'arrivo una volta sola: Ghiaccio e, con la coda lunga, Idrogeno; il
 * doppio con *Recupero* (C9). Quello che non entra nella stiva si perde. Come
 * `space.bottino_cometa` in SQL, più il raddoppio di `space.assesta`.
 */
export function bottinoCometa(corpo: Corpo | null, fatte: Fatte = NESSUNA): Partial<Quantita> | null {
  if (corpo?.dettagli.tipo !== 'cometa') return null
  const { ghiaccio, codaLunga, idrogeno } = BILANCIAMENTO.cometa
  const bottino: Partial<Quantita> = {
    ghiaccio: ghiaccio * corpo.ricchezza,
    ...(corpo.dettagli.coda >= codaLunga ? { idrogeno: idrogeno * corpo.ricchezza } : {}),
  }
  if (!fatte.has('C9')) return bottino
  for (const r of RISORSE) if (bottino[r] !== undefined) bottino[r] = bottino[r]! * BILANCIAMENTO.ricerche.effetti.C9
  return bottino
}

/** Il livello più alto tra motore, serbatoio e ricarica: decide la ricetta del carico di un relitto. */
export function livelloNave(nave: Pick<Nave, 'livelli'>): number {
  return Math.max(nave.livelli.motore, nave.livelli.serbatoio, nave.livelli.ricarica)
}

/**
 * L'esito di un relitto, uguale per tutti: un numero in [0, 1) dalla quinta
 * sequenza del seed del settore (dopo tipo, nome, ricchezza e dettagli). Sotto
 * la soglia c'è un progetto. Come `space.esito_relitto`.
 */
export function esitoRelitto(c: Coordinate): number {
  return casuale(derivato(seedSettore(c.x, c.y, c.z), 4)).numero()
}

/**
 * Il bottino di un relitto (doc/09-bilanciamento.md#comete-e-relitti), preso
 * all'arrivo una volta sola: `30 × ricchezza` di Materia oscura e un carico
 * del 50 % della capacità della stiva, diviso con la ricetta del livello più
 * alto della nave; a volte un progetto. *Recupero* (C9) raddoppia il bottino e
 * alza la probabilità del progetto. Come `space.bottino_relitto`.
 */
export function bottinoRelitto(
  c: Coordinate,
  nave: Pick<Nave, 'livelli' | 'stiva'>,
  fatte: Fatte = NESSUNA,
): { bottino: Partial<Quantita>; progetto: boolean } | null {
  const corpo = settore(c).corpo
  if (corpo?.dettagli.tipo !== 'relitto') return null
  const { materiaOscura, carico, progetto, progettoRecupero } = BILANCIAMENTO.relitto
  const recupero = fatte.has('C9')
  const per = recupero ? BILANCIAMENTO.ricerche.effetti.C9 : 1
  const livello = livelloNave(nave)
  let mix: Partial<Quantita> = BILANCIAMENTO.cantiere.ricette[0].mix
  for (const r of BILANCIAMENTO.cantiere.ricette) if (livello >= r.da) mix = r.mix
  const totale = capacitaNave(nave.stiva, fatte) * carico * per
  const bottino: Partial<Quantita> = {}
  for (const r of RISORSE) if (mix[r]) bottino[r] = totale * mix[r]!
  bottino.materiaOscura = (bottino.materiaOscura ?? 0) + materiaOscura * corpo.ricchezza * per
  return { bottino, progetto: esitoRelitto(c) < (recupero ? progettoRecupero : progetto) }
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
