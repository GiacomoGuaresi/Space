// Le pagine nell'indirizzo: `#/` il ponte, `#/catalogo` le scoperte,
// `#/osservatorio/x,y,z` l'osservatorio libero (solo in sviluppo, doc/06).

import { useSyncExternalStore } from 'react'
import { BASE, type Coordinate } from '../dominio/settore'

export type Pagina =
  | { pagina: 'ponte' }
  | { pagina: 'catalogo' }
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
  if (percorso === 'osservatorio' || percorso.startsWith('osservatorio/')) {
    return { pagina: 'osservatorio', coordinate: leggiCoordinate(percorso.slice('osservatorio/'.length)) ?? BASE }
  }
  return { pagina: 'ponte' }
}

export function indirizzo(pagina: Pagina): string {
  switch (pagina.pagina) {
    case 'ponte':
      return '#/'
    case 'catalogo':
      return '#/catalogo'
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
