// Le ricerche (doc/10-ricerche.md): 42 nodi in 4 rami, a gradini, due dei quali infiniti. Gradini e
// prerequisiti stanno in bilanciamento.ts, così il database li legge uguali;
// qui nomi, effetti a parole, costo, durata e cosa si può avviare.

import { BILANCIAMENTO } from './bilanciamento'
import { aLivello } from './insediamenti'
import type { Quantita } from './risorse'
import { conLeghe, ricetta } from './cantiere'
import { infinito, livelloRicerca } from './infiniti'

export { INFINITI, infinito, livelloRicerca, ricercheFatte } from './infiniti'

export type Ramo = 'P' | 'C' | 'S' | 'I'
export type IdRicerca = keyof typeof BILANCIAMENTO.ricerche.nodi

export const RAMI: Readonly<Record<Ramo, string>> = {
  P: 'Propulsione',
  C: 'Colonizzazione',
  S: 'Sensori',
  I: 'Ingegneria',
}

/** Le ricerche completate dal giocatore. */
export type Ricerche = ReadonlySet<string>

export const NESSUNA_RICERCA: Ricerche = new Set()

export const RICERCHE: Readonly<Record<IdRicerca, { nome: string; effetto: string }>> = {
  P1: { nome: 'Raffinazione I', effetto: 'Pieno al deposito: 5 → 4 Idrogeno per unità' },
  P2: { nome: 'Iniettori', effetto: 'Consumo di carburante −10 %' },
  P3: { nome: 'Ponte di curvatura', effetto: 'Sblocca la struttura Ponte' },
  P4: { nome: 'Raffinazione II', effetto: '4 → 3 Idrogeno per unità' },
  P5: { nome: 'Vele solari', effetto: 'Presso una stella la ricarica è ×3 invece di ×2' },
  P6: { nome: 'Fionda gravitazionale', effetto: 'Fionda: velocità ×2, tratto gratis 30 %' },
  P7: { nome: 'Raffinazione III', effetto: '3 → 2 Idrogeno per unità' },
  P8: { nome: 'Ponte risonante', effetto: 'Ponte: velocità ×4, carburante 1/4' },
  P9: { nome: 'Navigazione dei varchi', effetto: 'Si attraversano i wormhole' },
  P10: { nome: 'Raffinazione IV', effetto: '2 → 1 Idrogeno per unità' },
  C1: { nome: 'Astrofisica I', effetto: '+2 basi fondabili' },
  C2: { nome: 'Estrattori minerari', effetto: 'Estrattori sugli asteroidi; limite estrattori 3' },
  C3: { nome: 'Raccoglitori di gas', effetto: 'Raccoglitori su nebulose e giganti; +2 estrattori' },
  C4: { nome: 'Magazzini modulari', effetto: 'Tetto dei magazzini +20 %' },
  C5: { nome: 'Estrattori stellari', effetto: 'Estrattori sulle pulsar; +2 estrattori' },
  C6: { nome: 'Astrofisica II', effetto: '+2 basi fondabili' },
  C7: { nome: 'Contenimento gravitazionale', effetto: 'Estrattori sui buchi neri; +2 estrattori' },
  C8: { nome: 'Estrazione profonda', effetto: 'Produzione +15 %' },
  C9: { nome: 'Recupero', effetto: 'Relitti e comete rendono il doppio' },
  C10: { nome: 'Astrofisica III', effetto: '+2 basi fondabili' },
  S1: { nome: 'Scansione in volo', effetto: 'Lo scanner funziona anche in viaggio, lungo la rotta' },
  S2: { nome: 'Spettrometria', effetto: 'Si vede la ricchezza dei corpi rilevati' },
  S3: { nome: 'Radar', effetto: 'Sblocca la struttura Radar' },
  S4: { nome: 'Telemetria', effetto: 'Si vedono a distanza produzione e riempimento degli insediamenti' },
  S5: { nome: 'Filtri nebulari', effetto: 'Le nebulose non riducono più lo scanner' },
  S6: { nome: 'Analisi stellare', effetto: 'Si vedono i sottotipi dei corpi rilevati' },
  S7: { nome: 'Interferometria', effetto: 'Presso le pulsar lo scanner è ×3' },
  S8: { nome: 'Radar profondo', effetto: 'Raggio del radar ×2' },
  S9: { nome: 'Sonda di varco', effetto: 'Si vede dove porta un wormhole' },
  S10: { nome: 'Rilevamento gravitazionale', effetto: 'Buchi neri e wormhole visibili al doppio del raggio' },
  I1: { nome: 'Automazione', effetto: 'Tempi di costruzione −10 %' },
  I2: { nome: 'Stiva modulare', effetto: 'Stiva +15 %' },
  I3: { nome: 'Cantiere orbitale', effetto: 'Sblocca il cantiere nelle colonie' },
  I4: { nome: 'Leghe', effetto: 'Metallo e Silicio nelle ricette −10 %' },
  I5: { nome: 'Deposito', effetto: 'Sblocca il deposito carburante nelle colonie' },
  I6: { nome: 'Riciclo', effetto: 'Abbandonare una base restituisce il 25 % della spesa' },
  I7: { nome: 'Automazione II', effetto: 'Tempi −15 %' },
  I8: { nome: 'Superleghe', effetto: 'Terre rare nelle ricette −15 %' },
  I9: { nome: 'Doppia coda', effetto: 'La coda di una base costruisce 2 cose insieme' },
  I10: { nome: 'Materia esotica', effetto: 'Materia oscura nelle ricette −15 %' },
  'P∞': { nome: 'Propulsione avanzata', effetto: 'Velocità +4 % per livello' },
  'C∞': { nome: 'Colonizzazione avanzata', effetto: '+1 base ogni 2 livelli, +1 estrattore e +3 % produzione per livello' },
}

export const ID_RICERCHE = Object.keys(BILANCIAMENTO.ricerche.nodi) as IdRicerca[]

export function ramo(id: IdRicerca): Ramo {
  return id[0] as Ramo
}

export function gradino(id: IdRicerca): number {
  return BILANCIAMENTO.ricerche.nodi[id].gradino
}

/**
 * Il costo della ricerca `id`, con gli sconti delle ricerche fatte: come il suo
 * gradino, o per un nodo infinito come un livello `20 + L` di base 60, dove `L`
 * è il livello che si ricerca. Come `space.ricerca`.
 */
export function costoRicerca(id: IdRicerca, fatte: Ricerche = NESSUNA_RICERCA): Partial<Quantita> {
  if (!infinito(id)) return costoGradino(gradino(id), fatte)
  const { base, infiniti } = BILANCIAMENTO.ricerche
  const livello = infiniti.livello + livelloRicerca(fatte, id) + 1
  const totale = aLivello(base, BILANCIAMENTO.cantiere.crescita, livello)
  const risultato: Partial<Quantita> = {}
  for (const [r, parte] of Object.entries(ricetta(livello))) risultato[r as keyof Quantita] = totale * parte
  return conLeghe(risultato, fatte)
}

/** Il costo di una ricerca di gradino `g`: come un livello `2g` di base 60, con la stessa ricetta. */
export function costoGradino(g: number, fatte: Ricerche = NESSUNA_RICERCA): Partial<Quantita> {
  const { base, costo } = BILANCIAMENTO.ricerche
  const livello = costo * g
  const totale = aLivello(base, BILANCIAMENTO.cantiere.crescita, livello)
  const risultato: Partial<Quantita> = {}
  for (const [r, parte] of Object.entries(ricetta(livello))) risultato[r as keyof Quantita] = totale * parte
  return conLeghe(risultato, fatte)
}

/** Le ore di una ricerca di gradino `g`: 6 min a gradino, al massimo 1 h. */
export function durataGradino(g: number): number {
  const { minuti, oreMassime } = BILANCIAMENTO.ricerche
  return Math.min(oreMassime, (minuti * g) / 60)
}

/** Perché non si può avviare `id` (già fatta, prerequisiti, non ancora nel gioco), o `null` se si può. */
export function bloccata(id: IdRicerca, fatte: Ricerche): string | null {
  if (fatte.has(id) && !infinito(id)) return 'Già fatta.'
  const mancano = BILANCIAMENTO.ricerche.nodi[id].richiede.filter((r) => !fatte.has(r))
  if (mancano.length) return `Prima: ${mancano.map((r) => RICERCHE[r as IdRicerca].nome).join(', ')}.`
  if (!(BILANCIAMENTO.ricerche.attive as readonly string[]).includes(id)) return 'Arriva con un prossimo aggiornamento.'
  return null
}
