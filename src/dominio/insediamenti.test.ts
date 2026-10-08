import { describe, expect, it } from 'vitest'
import { magazzinoOra, pienoTra, ritmoInsediamento, tettoMagazzino, type Insediamento } from './insediamenti'
import { BASE } from './settore'

const t0 = new Date('2026-10-08T12:00:00Z')
const ore = (h: number) => new Date(t0.getTime() + h * 3_600_000)
const madre = (p: Partial<Insediamento> = {}): Insediamento => ({
  id: 1,
  coordinate: BASE,
  tipo: 'madre',
  pianeta: null,
  fondazione: t0,
  ultima: t0,
  scorte: {},
  produzione: 1,
  magazzino: 1,
  ...p,
})

describe('base madre', () => {
  it('produce 6/h divisi tra le quattro comuni', () => {
    expect(ritmoInsediamento(madre())).toEqual({ metallo: 1.5, silicio: 1.5, ghiaccio: 1.5, idrogeno: 1.5 })
    expect(ritmoInsediamento(madre({ produzione: 2 })).metallo).toBeCloseTo(1.695, 10)
  })

  it('riempie il magazzino fino a 168 h di produzione, ×1,45 per livello', () => {
    expect(tettoMagazzino(madre()).metallo).toBe(252)
    expect(tettoMagazzino(madre({ magazzino: 2 })).metallo).toBeCloseTo(365.4, 10)
    expect(magazzinoOra(madre(), ore(10)).metallo).toBe(15)
    expect(magazzinoOra(madre(), ore(1000)).metallo).toBe(252)
    expect(magazzinoOra(madre({ scorte: { metallo: 300 } }), ore(10)).metallo).toBe(300)
    expect(pienoTra(madre(), ore(68))).toBeCloseTo(100, 10)
  })
})
