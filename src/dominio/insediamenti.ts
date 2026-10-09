// Gli insediamenti (doc/02-meccaniche.md#insediamenti): la base madre, le basi
// e gli estrattori. Producono nel loro magazzino fino al tetto, e si
// raccolgono di persona. Tutto alla lettura, come in `supabase/sql/011_insediamenti.sql`.

import { BILANCIAMENTO } from './bilanciamento'
import type { TipoCorpo } from './catalogo'
import { mixCorpo, RISORSE, ritmoRisorsa, type Fatte, type Quantita } from './risorse'
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
  /** I livelli delle strutture: 0 se non c'è. */
  cantiere: number
  deposito: number
  laboratorio: number
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
  } else if (i.tipo === 'estrattore') {
    // Un estrattore produce col mix del corpo, al ritmo di ogni risorsa (doc/09-bilanciamento.md#produzione).
    const corpo = settore(i.coordinate).corpo
    const mix = mixCorpo(corpo)
    const ricchezza = corpo?.ricchezza ?? 0
    for (const r of RISORSE) {
      const parte = mix?.[r]
      if (parte) ritmi[r] = aLivello(ritmoRisorsa(r) * ricchezza * parte, crescita, livello)
    }
  }
  return ritmi
}

/** Il tetto del magazzino per risorsa: 168 h della produzione di livello 1, ×1,45 per livello di magazzino. */
export function tettoMagazzino(i: Produttore & Pick<Insediamento, 'magazzino'>, fatte: Fatte = new Set()): Partial<Quantita> {
  const { ore, crescita } = BILANCIAMENTO.magazzino
  const tetti: Partial<Quantita> = {}
  const base = ritmoInsediamento(i, 1)
  for (const r of RISORSE) {
    const ritmo = base[r]
    // *Magazzini modulari* (C4) alzano il tetto del 20 %.
    if (ritmo) tetti[r] = aLivello(ritmo * ore, crescita, i.magazzino) * (fatte.has('C4') ? 1 + BILANCIAMENTO.ricerche.effetti.C4 : 1)
  }
  return tetti
}

/** Il magazzino a `ora`: le scorte più la produzione da `ultima`, fino al tetto (oltre non si toglie nulla). */
export function magazzinoOra(i: Insediamento, ora: Date, fatte: Fatte = new Set()): Partial<Quantita> {
  const ritmi = ritmoInsediamento(i)
  const tetti = tettoMagazzino(i, fatte)
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
export function pienoTra(i: Insediamento, ora: Date, fatte: Fatte = new Set()): number {
  const ritmi = ritmoInsediamento(i)
  const tetti = tettoMagazzino(i, fatte)
  const adesso = magazzinoOra(i, ora, fatte)
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

/** Quando il magazzino si riempie, per tutte le risorse che produce: da lì la produzione è ferma. */
export function pienoIl(i: Insediamento, fatte: Fatte = new Set()): Date {
  return new Date(i.ultima.getTime() + pienoTra(i, i.ultima, fatte) * 3_600_000)
}

/** Quante basi si possono fondare: 2, più quelle di *Astrofisica I* (C1). Come `space.basi_fondabili`. */
export function basiFondabili(fatte: Fatte = new Set()): number {
  return BILANCIAMENTO.fondazione.basi + (fatte.has('C1') ? BILANCIAMENTO.ricerche.effetti.C1 : 0)
}

/** I tipi di corpo su cui si fonda un estrattore, con le ricerche fatte. Come `space.fonda_estrattore`. */
export function tipiEstrattori(fatte: Fatte = new Set()): TipoCorpo[] {
  return Object.entries(BILANCIAMENTO.fondazione.estrattore.tipi)
    .filter(([, ricerca]) => fatte.has(ricerca))
    .map(([tipo]) => tipo as TipoCorpo)
}

/** La ricerca che apre gli estrattori sul tipo `tipo`, o `null` se lì non se ne fondano. */
export function ricercaEstrattore(tipo: TipoCorpo): string | null {
  return BILANCIAMENTO.fondazione.estrattore.tipi[tipo] ?? null
}

/** Quanti estrattori si possono fondare: la somma di quelli dati dalle ricerche fatte. Come `space.estrattori_fondabili`. */
export function estrattoriFondabili(fatte: Fatte = new Set()): number {
  return Object.entries(BILANCIAMENTO.fondazione.estrattore.limite).reduce((n, [ricerca, piu]) => n + (fatte.has(ricerca) ? piu : 0), 0)
}

/** Quanto costa un estrattore avendone già fondati `fondati`: `60 × 1,4^fondati` in parti uguali di Metallo e Silicio. */
export function costoEstrattore(fondati: number): Partial<Quantita> {
  const { costo, crescita, risorse } = BILANCIAMENTO.fondazione.estrattore
  const totale = aLivello(costo, crescita, fondati + 1)
  return Object.fromEntries(risorse.map((r) => [r, totale / risorse.length]))
}
