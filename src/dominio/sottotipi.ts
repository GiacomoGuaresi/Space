// I sottotipi dei corpi (doc/03-universo.md#sottotipi): le sezioni del catalogo
// e della wiki che si scoprono trovando un corpo di quel sottotipo.

import type { TipoCorpo } from './catalogo'
import { NOMI_CLASSI, NOMI_GENERI_NEBULOSA, type ClasseStella, type Dettagli } from './settore'

export interface Sottotipo {
  chiave: string
  nome: string
  /** Il mix di risorse, se il sottotipo lo decide (doc/09-bilanciamento.md#produzione). */
  mix?: string
}

const CLASSI: readonly ClasseStella[] = ['M', 'K', 'G', 'F', 'B']
const classi = (): Sottotipo[] => CLASSI.map((c) => ({ chiave: c, nome: `${c} · ${NOMI_CLASSI[c]}` }))

export const SOTTOTIPI: Readonly<Record<TipoCorpo, readonly Sottotipo[]>> = {
  asteroidi: [
    { chiave: 'metallica', nome: 'Metallici', mix: 'Metallo 80 % · Silicio 20 %' },
    { chiave: 'silicea', nome: 'Silicei', mix: 'Metallo 20 % · Silicio 80 %' },
    { chiave: 'mista', nome: 'Misti', mix: 'Metallo 50 % · Silicio 50 %' },
  ],
  nebulosa: (['emissione', 'riflessione', 'planetaria', 'oscura'] as const).map((g) => ({
    chiave: g,
    nome: `Nebulosa ${NOMI_GENERI_NEBULOSA[g]}`,
    mix: 'Idrogeno 100 %',
  })),
  stella: classi(),
  sistema: classi(),
  gigante: [
    { chiave: 'senza', nome: 'Senza anelli', mix: 'Idrogeno 70 % · Ghiaccio 30 %' },
    { chiave: 'anelli', nome: 'Con anelli', mix: 'Idrogeno 50 % · Ghiaccio 50 %' },
  ],
  cometa: [],
  pulsar: [],
  buconero: [],
  relitto: [
    { chiave: 'nave', nome: 'Nave' },
    { chiave: 'stazione', nome: 'Stazione' },
    { chiave: 'sonda', nome: 'Sonda' },
  ],
  wormhole: [],
}

/** La chiave del sottotipo di un corpo, o `null` se il suo tipo non ne ha. */
export function sottotipo(d: Dettagli): string | null {
  switch (d.tipo) {
    case 'asteroidi':
      return d.composizione
    case 'nebulosa':
      return d.genere
    case 'stella':
    case 'sistema':
      return d.stella.classe
    case 'gigante':
      return d.anelli ? 'anelli' : 'senza'
    case 'relitto':
      return d.forma
    default:
      return null
  }
}
