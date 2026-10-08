// Le coordinate nell'indirizzo, `#/x,y,z`: un settore si ricarica e si condivide.

import { useSyncExternalStore } from 'react'
import { BASE, type Coordinate } from '../dominio/settore'

/** Le coordinate di un indirizzo, o `null` se non lo sono. */
export function leggiCoordinate(hash: string): Coordinate | null {
  const parti = hash.replace(/^#\/?/, '').split(',')
  // Number('') vale 0: le parti vuote si scartano prima.
  if (parti.length !== 3 || parti.some((p) => p.trim() === '')) return null
  const numeri = parti.map((p) => Number(p.trim()))
  if (!numeri.every((n) => Number.isSafeInteger(n) && Math.abs(n) <= 2 ** 31 - 1)) return null
  const [x, y, z] = numeri
  return { x, y, z }
}

export function scriviCoordinate({ x, y, z }: Coordinate): string {
  return `#/${x},${y},${z}`
}

function iscriviti(avvisa: () => void) {
  window.addEventListener('hashchange', avvisa)
  return () => window.removeEventListener('hashchange', avvisa)
}

/** Le coordinate dell'indirizzo attuale; senza coordinate valide, la base. */
export function useCoordinate(): Coordinate {
  const hash = useSyncExternalStore(iscriviti, () => window.location.hash)
  return leggiCoordinate(hash) ?? BASE
}

export function vaiA(coordinate: Coordinate) {
  window.location.hash = scriviCoordinate(coordinate)
}
