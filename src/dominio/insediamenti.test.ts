import { describe, expect, it } from 'vitest'
import {
  basiFondabili,
  costoEstrattore,
  costoFondazione,
  estrattoriFondabili,
  magazzinoOra,
  pienoIl,
  mixColonia,
  pienoTra,
  ritmoInsediamento,
  tettoMagazzino,
  tipiEstrattori,
  type Insediamento,
} from './insediamenti'
import { BASE, settore, tipoSettore, type Coordinate } from './settore'

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
  cantiere: 1,
  deposito: 1,
  laboratorio: 1,
  radar: 0,
  ponte: 0,
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
    expect(pienoIl(madre()).getTime()).toBe(ore(168).getTime())
  })
})

describe('colonia', () => {
  const dove = ((): Coordinate => {
    for (let x = 1; ; x++) if (tipoSettore({ x, y: 7, z: -3 }) === 'sistema') return { x, y: 7, z: -3 }
  })()
  const d = settore(dove).corpo!.dettagli
  const pianeti = d.tipo === 'sistema' ? d.pianeti : []

  it('produce 7/h × ricchezza col mix del suo pianeta', () => {
    const ricchezza = settore(dove).corpo!.ricchezza
    pianeti.forEach((p, n) => {
      const ritmi = ritmoInsediamento(madre({ tipo: 'base', coordinate: dove, pianeta: n }))
      const totale = Object.values(ritmi).reduce((a, b) => a + b, 0)
      expect(totale).toBeCloseTo(7 * ricchezza, 9)
      expect(Object.keys(ritmi).sort()).toEqual(Object.keys(mixColonia(dove, n)!).sort())
      expect(p.tipo).toBeTruthy()
    })
  })

  it("un pianeta che non c'è non produce", () => {
    expect(mixColonia(dove, 99)).toBeNull()
    expect(ritmoInsediamento(madre({ tipo: 'base', coordinate: dove, pianeta: 99 }))).toEqual({})
  })
})

describe('fondazione', () => {
  it('la prima è gratis, poi 150 × 1,6^(fondate − 1) in parti uguali', () => {
    expect(costoFondazione(0)).toEqual({})
    expect(costoFondazione(1)).toEqual({ metallo: 50, silicio: 50, ghiaccio: 50 })
    expect(costoFondazione(2).metallo).toBeCloseTo(80, 10)
  })
})

describe('ricerche di Colonizzazione', () => {
  it('Magazzini modulari alzano il tetto del 20 %, Astrofisica I dà 2 basi', () => {
    expect(tettoMagazzino(madre(), new Set(['C4'])).metallo).toBeCloseTo(302.4, 10)
    expect(basiFondabili()).toBe(2)
    expect(basiFondabili(new Set(['C1']))).toBe(4)
  })
})

describe('estrattori', () => {
  const trova = (tipo: string): Coordinate => {
    for (let x = 1; ; x++) if (tipoSettore({ x, y: -9, z: 2 }) === tipo) return { x, y: -9, z: 2 }
  }

  it('producono 7/h × ricchezza col mix del corpo', () => {
    for (const tipo of ['asteroidi', 'nebulosa', 'gigante']) {
      const dove = trova(tipo)
      const ritmi = ritmoInsediamento(madre({ tipo: 'estrattore', coordinate: dove }))
      const totale = Object.values(ritmi).reduce((a, b) => a + b, 0)
      expect(totale).toBeCloseTo(7 * settore(dove).corpo!.ricchezza, 9)
    }
    expect(ritmoInsediamento(madre({ tipo: 'estrattore', coordinate: trova('nebulosa') })).idrogeno).toBeGreaterThan(0)
  })

  it('si aprono con Estrattori minerari e Raccoglitori di gas', () => {
    expect(tipiEstrattori()).toEqual([])
    expect(tipiEstrattori(new Set(['C2']))).toEqual(['asteroidi'])
    expect(tipiEstrattori(new Set(['C2', 'C3'])).sort()).toEqual(['asteroidi', 'gigante', 'nebulosa'])
    expect(estrattoriFondabili()).toBe(0)
    expect(estrattoriFondabili(new Set(['C2']))).toBe(3)
    expect(estrattoriFondabili(new Set(['C2', 'C3']))).toBe(5)
  })

  it('costano 60 × 1,4^fondati in Metallo e Silicio', () => {
    expect(costoEstrattore(0)).toEqual({ metallo: 30, silicio: 30 })
    expect(costoEstrattore(2).metallo).toBeCloseTo(58.8, 10)
  })
})
