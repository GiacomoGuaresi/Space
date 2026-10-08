// Gli insediamenti (doc/02-meccaniche.md#insediamenti): la base madre, le basi
// e gli estrattori. Producono nel loro magazzino fino al tetto, e si
// raccolgono di persona. Tutto alla lettura, come in `supabase/sql/011_insediamenti.sql`.

import { BILANCIAMENTO } from './bilanciamento'
import { RISORSE, type Quantita } from './risorse'
import { settore, type Coordinate } from './settore'

export type TipoInsediamento = 'madre' | 'base' | 'estrattore'

export interface Insediamento {
  id: number
  coordinate: Coordinate
  tipo: TipoInsediamento
  /** Il pianeta della colonia, nell'ordine delle orbite (solo le basi). */
  pianeta: number | null
  fondazione: Date
  /** Le scorte del magazzino valgono da questo istante: l'ultima raccolta. */
  ultima: Date
  scorte: Partial<Quantita>
  produzione: number
  magazzino: number
}

/** `base × crescita^(livello − 1)` con moltiplicazioni ripetute, come in SQL. */
export function aLivello(base: number, crescita: number, livello: number): number {
  let valore = base
  for (let i = 1; i < livello; i++) valore *= crescita
  return valore
}

/** Il mix di una colonia: quello del suo pianeta (doc/09-bilanciamento.md#produzione). */
export function mixColonia(coordinate: Coordinate, pianeta: number): Partial<Quantita> | null {
  const d = settore(coordinate).corpo?.dettagli
  if (d?.tipo !== 'sistema' || !d.pianeti[pianeta]) return null
  return { ...BILANCIAMENTO.mix.pianeti[d.pianeti[pianeta].tipo] }
}

type Produttore = Pick<Insediamento, 'tipo' | 'coordinate' | 'pianeta' | 'produzione'>

/** Quanto produce all'ora per risorsa, al livello di produzione `livello`. */
export function ritmoInsediamento(i: Produttore, livello = i.produzione): Partial<Quantita> {
  const { madre, crescita, ritmo } = BILANCIAMENTO.produzione
  const ritmi: Partial<Quantita> = {}
  if (i.tipo === 'madre') {
    for (const r of RISORSE.slice(0, 4)) ritmi[r] = aLivello(madre / 4, crescita, livello)
  } else if (i.tipo === 'base' && i.pianeta !== null) {
    const mix = mixColonia(i.coordinate, i.pianeta)
    const ricchezza = settore(i.coordinate).corpo?.ricchezza ?? 0
    for (const r of RISORSE) {
      const parte = mix?.[r]
      if (parte) ritmi[r] = aLivello(ritmo.comune * ricchezza * parte, crescita, livello)
    }
  }
  return ritmi
}

/** Il tetto del magazzino per risorsa: 168 h della produzione di livello 1, ×1,45 per livello di magazzino. */
export function tettoMagazzino(i: Produttore & Pick<Insediamento, 'magazzino'>): Partial<Quantita> {
  const { ore, crescita } = BILANCIAMENTO.magazzino
  const tetti: Partial<Quantita> = {}
  const base = ritmoInsediamento(i, 1)
  for (const r of RISORSE) {
    const ritmo = base[r]
    if (ritmo) tetti[r] = aLivello(ritmo * ore, crescita, i.magazzino)
  }
  return tetti
}

/** Il magazzino a `ora`: le scorte più la produzione da `ultima`, fino al tetto (oltre non si toglie nulla). */
export function magazzinoOra(i: Insediamento, ora: Date): Partial<Quantita> {
  const ritmi = ritmoInsediamento(i)
  const tetti = tettoMagazzino(i)
  const ore = Math.max(0, ora.getTime() - i.ultima.getTime()) / 3_600_000
  const quantita: Partial<Quantita> = {}
  for (const r of RISORSE) {
    const scorta = i.scorte[r] ?? 0
    const ritmo = ritmi[r]
    const tetto = tetti[r]
    quantita[r] = ritmo && tetto !== undefined && scorta < tetto ? Math.min(tetto, scorta + ritmo * ore) : scorta
    if (!quantita[r]) delete quantita[r]
  }
  return quantita
}

/** Tra quante ore il magazzino è pieno per tutte le risorse che produce (0 se lo è già). */
export function pienoTra(i: Insediamento, ora: Date): number {
  const ritmi = ritmoInsediamento(i)
  const tetti = tettoMagazzino(i)
  const adesso = magazzinoOra(i, ora)
  let ore = 0
  for (const r of RISORSE) {
    const ritmo = ritmi[r]
    if (ritmo) ore = Math.max(ore, ((tetti[r] ?? 0) - (adesso[r] ?? 0)) / ritmo)
  }
  return Math.max(0, ore)
}

/**
 * Quanto costa fondare una base avendone già fondate `fondate`: la prima è
 * gratis (`{}`), le altre `150 × 1,6^(fondate − 1)` in parti uguali.
 */
export function costoFondazione(fondate: number): Partial<Quantita> {
  if (fondate === 0) return {}
  const { costo, crescita, risorse } = BILANCIAMENTO.fondazione
  const totale = aLivello(costo, crescita, fondate)
  return Object.fromEntries(risorse.map((r) => [r, totale / risorse.length]))
}
