// Le pagine nell'indirizzo: `#/` il ponte (`#/rotta/x,y,z` con una meta già
// scelta), `#/mappa` i settori scansionati, `#/altro` l'elenco delle altre
// pagine, `#/nave` statistiche e stiva, `#/rete` gli insediamenti, `#/diario` il diario di bordo, `#/impostazioni`, `#/wiki/voce/numeri` la wiki, `#/catalogo` le scoperte,
// `#/osservatorio/x,y,z` l'osservatorio libero (solo in sviluppo, doc/06).

import { useSyncExternalStore } from 'react'
import { BASE, type Coordinate } from '../dominio/settore'

export type Pagina =
  | { pagina: 'ponte'; meta?: Coordinate }
  | { pagina: 'mappa' }
  | { pagina: 'altro' }
  | { pagina: 'diario' }
  | { pagina: 'impostazioni' }
  | { pagina: 'wiki'; voce?: string; numeri?: boolean }
  | { pagina: 'catalogo' }
  | { pagina: 'nave' }
  | { pagina: 'rete' }
  | { pagina: 'osservatorio'; coordinate: Coordinate }

/** Le coordinate di un testo "x,y,z", o `null` se non lo sono. */
export function leggiCoordinate(testo: string): Coordinate | null {
  const parti = testo.split(',')
  // Number('') vale 0: le parti vuote si scartano prima.
  if (parti.length !== 3 || parti.some((p) => p.trim() === '')) return null
  const numeri = parti.map((p) => Number(p.trim()))
  if (!numeri.every((n) => Number.isSafeInteger(n) && Math.abs(n) <= 2 ** 31 - 1)) return null
  const [x, y, z] = numeri
  return { x, y, z }
}

export function leggiPagina(hash: string): Pagina {
  const percorso = hash.replace(/^#\/?/, '')
  if (percorso === 'catalogo') return { pagina: 'catalogo' }
  if (percorso === 'nave') return { pagina: 'nave' }
  if (percorso === 'rete') return { pagina: 'rete' }
  if (percorso === 'mappa') return { pagina: 'mappa' }
  if (percorso === 'altro') return { pagina: 'altro' }
  if (percorso === 'diario') return { pagina: 'diario' }
  if (percorso === 'impostazioni') return { pagina: 'impostazioni' }
  if (percorso === 'wiki') return { pagina: 'wiki' }
  if (percorso.startsWith('wiki/')) {
    const [voce, sezione] = percorso.slice('wiki/'.length).split('/')
    return sezione === 'numeri' ? { pagina: 'wiki', voce, numeri: true } : { pagina: 'wiki', voce }
  }
  if (percorso.startsWith('rotta/')) {
    const meta = leggiCoordinate(percorso.slice('rotta/'.length))
    return meta ? { pagina: 'ponte', meta } : { pagina: 'ponte' }
  }
  if (percorso === 'osservatorio' || percorso.startsWith('osservatorio/')) {
    return { pagina: 'osservatorio', coordinate: leggiCoordinate(percorso.slice('osservatorio/'.length)) ?? BASE }
  }
  return { pagina: 'ponte' }
}

export function indirizzo(pagina: Pagina): string {
  switch (pagina.pagina) {
    case 'ponte': {
      if (!pagina.meta) return '#/'
      const { x, y, z } = pagina.meta
      return `#/rotta/${x},${y},${z}`
    }
    case 'mappa':
      return '#/mappa'
    case 'altro':
      return '#/altro'
    case 'diario':
      return '#/diario'
    case 'impostazioni':
      return '#/impostazioni'
    case 'wiki':
      if (!pagina.voce) return '#/wiki'
      return `#/wiki/${pagina.voce}${pagina.numeri ? '/numeri' : ''}`
    case 'catalogo':
      return '#/catalogo'
    case 'nave':
      return '#/nave'
    case 'rete':
      return '#/rete'
    case 'osservatorio': {
      const { x, y, z } = pagina.coordinate
      return `#/osservatorio/${x},${y},${z}`
    }
  }
}

function iscriviti(avvisa: () => void) {
  window.addEventListener('hashchange', avvisa)
  return () => window.removeEventListener('hashchange', avvisa)
}

export function usePagina(): Pagina {
  const hash = useSyncExternalStore(iscriviti, () => window.location.hash)
  return leggiPagina(hash)
}

export function vaiA(pagina: Pagina) {
  window.location.hash = indirizzo(pagina)
}

/** Nell'osservatorio: guarda un altro settore. */
export function osserva(coordinate: Coordinate) {
  vaiA({ pagina: 'osservatorio', coordinate })
}

// Da dove si è aperto il diario: chiudendolo si torna lì.
let ritorno: string | null = null

/** Apre il diario ricordando la pagina di adesso. */
export function apriDiario() {
  if (leggiPagina(window.location.hash).pagina !== 'diario') ritorno = window.location.hash || '#/'
  vaiA({ pagina: 'diario' })
}

/** Chiude il diario tornando dove si era, o al ponte. */
export function chiudiDiario() {
  window.location.hash = ritorno ?? indirizzo({ pagina: 'ponte' })
  ritorno = null
}
