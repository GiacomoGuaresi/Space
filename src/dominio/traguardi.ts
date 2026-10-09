// I traguardi (doc/02-meccaniche.md#traguardi): medaglie con data, senza
// ricompense, in quattro famiglie. Li controlla e li scrive il database
// (`space.controlla_traguardi`, supabase/sql/035_traguardi.sql); qui ci sono
// i codici, i nomi e cosa chiedono.

import { BILANCIAMENTO } from './bilanciamento'
import { CATALOGO, TIPI, type TipoCorpo } from './catalogo'
import { SOTTOTIPI } from './sottotipi'

export type Famiglia = 'distanza' | 'catalogo' | 'infrastruttura' | 'imprese'

export const NOMI_FAMIGLIE: Readonly<Record<Famiglia, string>> = {
  distanza: 'Distanza',
  catalogo: 'Catalogo',
  infrastruttura: 'Infrastruttura',
  imprese: 'Imprese',
}

export interface Traguardo {
  codice: string
  famiglia: Famiglia
  nome: string
  /** Cosa chiede, a parole. */
  chiede: string
}

const settori = (n: number) => n.toLocaleString('it-IT')
const { traguardi: soglie } = BILANCIAMENTO

/** I tipi con dei sottotipi: per ognuno, la medaglia di averli trovati tutti. */
export const TIPI_CON_SOTTOTIPI: readonly TipoCorpo[] = TIPI.filter((t) => SOTTOTIPI[t].length > 0)

/** I tipi su cui si fonda un estrattore: per ognuno, la medaglia del primo. */
export const TIPI_ESTRATTORI: readonly TipoCorpo[] = ['asteroidi', 'nebulosa', 'gigante', 'pulsar', 'buconero']

export const TRAGUARDI: readonly Traguardo[] = [
  ...soglie.distanza.map((n): Traguardo => ({
    codice: `distanza-${n}`,
    famiglia: 'distanza',
    nome: `${settori(n)} settori`,
    chiede: `Arrivare a ${settori(n)} settori dalla base madre.`,
  })),
  ...TIPI.map((t): Traguardo => ({
    codice: `primo-${t}`,
    famiglia: 'catalogo',
    nome: `Primo: ${CATALOGO[t].nome.toLowerCase()}`,
    chiede: `Scoprire un corpo di tipo ${CATALOGO[t].nome.toLowerCase()}.`,
  })),
  ...soglie.corpi.map((n): Traguardo => ({
    codice: `corpi-${n}`,
    famiglia: 'catalogo',
    nome: `${settori(n)} corpi`,
    chiede: `Avere ${settori(n)} corpi nel catalogo.`,
  })),
  ...TIPI_CON_SOTTOTIPI.map((t): Traguardo => ({
    codice: `sottotipi-${t}`,
    famiglia: 'catalogo',
    nome: `Tutti i sottotipi: ${CATALOGO[t].nome.toLowerCase()}`,
    chiede: `Scoprire ${SOTTOTIPI[t].length} corpi di tipo ${CATALOGO[t].nome.toLowerCase()}, uno per sottotipo.`,
  })),
  { codice: 'catalogo-completo', famiglia: 'catalogo', nome: 'Catalogo completo', chiede: 'Ogni tipo di corpo, con tutti i suoi sottotipi.' },
  { codice: 'prima-base', famiglia: 'infrastruttura', nome: 'Prima base', chiede: 'Fondare la prima colonia.' },
  ...soglie.basi.map((n): Traguardo => ({
    codice: `basi-${n}`,
    famiglia: 'infrastruttura',
    nome: `${n} basi`,
    chiede: `Avere ${n} basi fondate insieme.`,
  })),
  ...TIPI_ESTRATTORI.map((t): Traguardo => ({
    codice: `estrattore-${t}`,
    famiglia: 'infrastruttura',
    nome: `Estrattore: ${CATALOGO[t].nome.toLowerCase()}`,
    chiede: `Fondare un estrattore su un corpo di tipo ${CATALOGO[t].nome.toLowerCase()}.`,
  })),
  { codice: 'primo-ponte', famiglia: 'infrastruttura', nome: 'Primo ponte', chiede: 'Costruire un ponte di curvatura.' },
  ...soglie.ponti.map((n): Traguardo => ({
    codice: `ponti-${n}`,
    famiglia: 'infrastruttura',
    nome: `Rete di ponti, ${settori(n)} settori`,
    chiede: `Due basi col ponte a ${settori(n)} settori l'una dall'altra.`,
  })),
  ...soglie.viaggio.map((n): Traguardo => ({
    codice: `viaggio-${n}`,
    famiglia: 'imprese',
    nome: `Viaggio di ${settori(n)} settori`,
    chiede: `Percorrere ${settori(n)} settori in un viaggio solo (i wormhole non contano).`,
  })),
  { codice: 'salto-wormhole', famiglia: 'imprese', nome: 'Primo wormhole', chiede: 'Attraversare un wormhole.' },
  ...soglie.percorsi.map((n): Traguardo => ({
    codice: `percorsi-${n}`,
    famiglia: 'imprese',
    nome: `${settori(n)} settori percorsi`,
    chiede: `Percorrere ${settori(n)} settori in tutto.`,
  })),
  ...soglie.statistica.map((n): Traguardo => ({
    codice: `statistica-${n}`,
    famiglia: 'imprese',
    nome: `Statistica al livello ${n}`,
    chiede: `Portare una statistica della nave al livello ${n}.`,
  })),
  { codice: 'tutte-le-ricerche', famiglia: 'imprese', nome: 'Tutte le ricerche', chiede: 'Completare le 42 ricerche, i nodi infiniti almeno al livello 1.' },
]

export function traguardo(codice: string): Traguardo | undefined {
  return TRAGUARDI.find((t) => t.codice === codice)
}
