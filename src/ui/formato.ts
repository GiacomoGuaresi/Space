// Come si scrivono tempi, distanze e coordinate nell'interfaccia.

import type { Coordinate } from '../dominio/settore'

/** Una durata a parole, arrotondata: "45 s", "12 min", "1 h 40 min", "2 g 3 h". */
export function durata(ms: number): string {
  const secondi = Math.max(0, Math.round(ms / 1000))
  if (secondi < 60) return `${secondi} s`
  const minuti = Math.round(secondi / 60)
  if (minuti < 60) return `${minuti} min`
  const ore = Math.floor(minuti / 60)
  if (ore < 48) return minuti % 60 ? `${ore} h ${minuti % 60} min` : `${ore} h`
  const giorni = Math.floor(ore / 24)
  return ore % 24 ? `${giorni} g ${ore % 24} h` : `${giorni} g`
}

/** Un conto alla rovescia: "4:05", "1:39:58". */
export function rovescia(ms: number): string {
  const totale = Math.max(0, Math.ceil(ms / 1000))
  const ore = Math.floor(totale / 3600)
  const minuti = Math.floor((totale % 3600) / 60)
  const secondi = totale % 60
  const due = (n: number) => String(n).padStart(2, '0')
  return ore ? `${ore}:${due(minuti)}:${due(secondi)}` : `${minuti}:${due(secondi)}`
}

/** L'ora di un istante; con il giorno se non è oggi. */
export function orario(istante: Date, ora: Date): string {
  const hhmm = istante.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  if (istante.toDateString() === ora.toDateString()) return hhmm
  return `${istante.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' })} ${hhmm}`
}

export function coordinate({ x, y, z }: Coordinate): string {
  return `(${x}, ${y}, ${z})`
}

export function numero(n: number, cifre = 0): string {
  return n.toLocaleString('it-IT', { maximumFractionDigits: cifre })
}

export function settori(n: number): string {
  return `${numero(n, 1)} ${n === 1 ? 'settore' : 'settori'}`
}
