import { describe, expect, it } from 'vitest'
import type { Viaggio } from '../dominio/navigazione'
import { piuVicino } from '../dominio/ricerca'
import { eventi } from './riepilogo'

const quando = new Date('2026-10-08T12:00:00Z')
const viaggio = (parziale: Partial<Viaggio>): Viaggio => ({
  da: { x: 0, y: 0, z: 0 },
  meta: { x: 5, y: 5, z: 5 },
  a: { x: 5, y: 5, z: 5 },
  partenza: quando,
  arrivo: quando,
  consumo: 8.66,
  fionda: false,
  ...parziale,
})

describe('eventi', () => {
  it('racconta un arrivo nello spazio vuoto', () => {
    expect(eventi([viaggio({})])).toEqual([{ quando, testo: 'Arrivo in (5, 5, 5): spazio vuoto.' }])
  })

  it('nomina il corpo dove si è arrivati', () => {
    const stella = piuVicino({ x: 0, y: 0, z: 0 }, 'stella')!
    const [evento] = eventi([viaggio({ meta: stella, a: stella })])
    expect(evento.testo).toMatch(/^Arrivo in .*: [A-Z][a-z]+, stella solitaria\.$/)
  })

  it('avvisa della fermata forzata e di quanto manca', () => {
    const [evento] = eventi([viaggio({ meta: { x: 10, y: 0, z: 0 }, a: { x: 4, y: 0, z: 0 } })])
    expect(evento.testo).toBe('Carburante finito: nave ferma in (4, 0, 0) (spazio vuoto), a 6 settori dalla meta.')
  })
})
