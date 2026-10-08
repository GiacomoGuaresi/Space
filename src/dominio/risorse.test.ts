import { describe, expect, it } from 'vitest'
import type { TipoCorpo } from './catalogo'
import type { Nave } from './navigazione'
import { BILANCIAMENTO } from './bilanciamento'
import { bottinoCometa, capacitaNave, caricoOra, capacitaStiva, inStiva, mixCorpo, nessuna, ritmoMano, stivaPienaTra } from './risorse'
import { BASE, settore, tipoSettore, type Coordinate } from './settore'

/** Il primo settore di un tipo lungo l'asse x. */
function primo(tipo: TipoCorpo): Coordinate {
  for (let x = 1; x < 5000; x++) {
    if (tipoSettore({ x, y: 0, z: 0 }) === tipo) return { x, y: 0, z: 0 }
  }
  throw new Error(`nessun ${tipo}`)
}

const t0 = new Date('2026-10-08T12:00:00Z')
const ore = (h: number) => new Date(t0.getTime() + h * 3_600_000)
const nave = (posizione: Coordinate, parziale: Partial<Nave> = {}): Nave => ({
  posizione,
  dal: t0,
  carburante: 2,
  velocita: 0.25,
  serbatoio: 4,
  ricarica: 0.4,
  scanner: 1,
  stiva: 1,
  livelli: { motore: 1, serbatoio: 1, ricarica: 1 },
  ...parziale,
})

describe('stiva', () => {
  it('cresce di ×1,5 a livello', () => {
    expect(capacitaStiva(1)).toBe(25)
    expect(capacitaStiva(2)).toBe(37.5)
    expect(capacitaStiva(10)).toBeCloseTo(961, 0)
  })
})

describe('mix e raccolta a mano', () => {
  it('ogni mix somma a 1', () => {
    for (const tipo of ['asteroidi', 'nebulosa', 'gigante', 'sistema'] as const) {
      const mix = mixCorpo(settore(primo(tipo)).corpo)!
      expect(Object.values(mix).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10)
    }
  })

  it('le stelle e il vuoto non danno nulla, e nemmeno la base', () => {
    expect(mixCorpo(settore(primo('stella')).corpo)).toBeNull()
    expect(ritmoMano(settore(BASE).corpo)).toBeNull()
  })

  it("raccoglie 3 × 7 × ricchezza all'ora, fino alla stiva piena", () => {
    const dove = primo('nebulosa')
    const { ricchezza } = settore(dove).corpo!
    const ritmo = BILANCIAMENTO.produzione.mano * 7 * ricchezza
    expect(ritmoMano(settore(dove).corpo)).toEqual({ idrogeno: ritmo })
    const carico = { quantita: nessuna(), dal: ore(-5) }
    // Conta da quando è arrivata, non da quando la stiva è stata scritta.
    expect(caricoOra(carico, nave(dove), ore(0.5)).idrogeno).toBeCloseTo(ritmo * 0.5, 9)
    expect(caricoOra(carico, nave(dove), ore(100)).idrogeno).toBe(25)
    expect(stivaPienaTra(carico, nave(dove), t0).idrogeno).toBeCloseTo(25 / ritmo, 9)
  })

  it('in viaggio non raccoglie', () => {
    const dove = primo('asteroidi')
    const carico = { quantita: nessuna(), dal: t0 }
    expect(caricoOra(carico, nave(dove, { dal: ore(3) }), ore(1))).toEqual(nessuna())
  })

  it('oltre la capacità non toglie nulla', () => {
    const dove = primo('asteroidi')
    const carico = { quantita: { ...nessuna(), metallo: 40 }, dal: t0 }
    expect(caricoOra(carico, nave(dove), ore(10)).metallo).toBe(40)
  })
})

describe('comete', () => {
  it('danno Ghiaccio, e Idrogeno solo con la coda lunga', () => {
    const corpo = settore(primo('cometa')).corpo!
    const bottino = bottinoCometa(corpo)!
    expect(bottino.ghiaccio).toBeCloseTo(200 * corpo.ricchezza, 9)
    expect('idrogeno' in bottino).toBe(corpo.dettagli.tipo === 'cometa' && corpo.dettagli.coda >= 0.8)
    expect(bottinoCometa(settore(primo('asteroidi')).corpo)).toBeNull()
  })

  it('quello che non entra si perde', () => {
    expect(inStiva({ ghiaccio: 300, idrogeno: 10 }, { ...nessuna(), ghiaccio: 5 }, 25)).toEqual({ ghiaccio: 20, idrogeno: 10 })
  })
})

describe('Stiva modulare', () => {
  it('alza la capacità del 15 %', () => {
    expect(capacitaNave(1, new Set(['I2']))).toBeCloseTo(28.75, 10)
    expect(capacitaNave(1)).toBe(25)
  })
})
