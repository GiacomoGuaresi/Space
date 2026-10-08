import { describe, expect, it } from 'vitest'
import { costoLavoro, costoPieno, durataLavoro, mancante, ricetta, valoreNave } from './cantiere'
import { nessuna } from './risorse'

describe('cantiere', () => {
  it('ricette a gradini', () => {
    expect(ricetta(2)).toEqual({ metallo: 0.6, silicio: 0.4 })
    expect(Object.keys(ricetta(4))).toContain('ghiaccio')
    expect(Object.keys(ricetta(15))).toContain('materiaOscura')
  })

  it('costo: base × 1,45^(livello − 1) diviso dalla ricetta', () => {
    const c = costoLavoro('motore', 2)
    expect(c.metallo).toBeCloseTo(87 * 0.6, 10)
    expect(c.silicio).toBeCloseTo(87 * 0.4, 10)
    expect(costoLavoro('cantiere', 2).metallo).toBeCloseTo(50 * 1.45 * 0.6, 10)
  })

  it('la stiva costa il 40 % della stiva attuale e dura 1 h', () => {
    expect(costoLavoro('stiva', 2)).toEqual({ metallo: 6, silicio: 4 })
    expect(durataLavoro('stiva', 9, 1)).toBe(1)
  })

  it('tempo: 3 h × 1,31^(livello − 2), più corto col cantiere', () => {
    expect(durataLavoro('motore', 2, 1)).toBe(3)
    expect(durataLavoro('motore', 3, 1)).toBeCloseTo(3.93, 10)
    expect(durataLavoro('motore', 2, 3)).toBeCloseTo(3 / 1.24, 10)
  })

  it('valori della nave × 1,12 a livello', () => {
    expect(valoreNave('motore', 1)).toBe(0.25)
    expect(valoreNave('serbatoio', 2)).toBeCloseTo(4.48, 10)
  })

  it('si paga con stiva più magazzino', () => {
    const stiva = { ...nessuna(), metallo: 20, silicio: 40 }
    expect(mancante({ metallo: 50, silicio: 30 }, stiva, { metallo: 40 })).toEqual({})
    expect(mancante({ metallo: 50, silicio: 30 }, stiva, {})).toEqual({ metallo: 30 })
  })
})

describe('deposito', () => {
  it('5 Idrogeno per unità, ×0,9 a livello', () => {
    expect(costoPieno(2, 1)).toBe(10)
    expect(costoPieno(2, 2)).toBeCloseTo(9, 10)
    expect(costoPieno(-1, 1)).toBe(0)
  })
})

describe('ricerche di Ingegneria', () => {
  it('Automazione accorcia i tempi del 10 %, non la stiva', () => {
    expect(durataLavoro('motore', 2, 1, new Set(['I1']))).toBeCloseTo(2.7, 10)
    expect(durataLavoro('stiva', 2, 1, new Set(['I1']))).toBe(1)
  })

  it('Leghe toglie il 10 % di Metallo e Silicio', () => {
    const c = costoLavoro('motore', 4, new Set(['I4']))
    const base = costoLavoro('motore', 4)
    expect(c.metallo).toBeCloseTo(base.metallo! * 0.9, 10)
    expect(c.ghiaccio).toBe(base.ghiaccio)
  })
})

describe('ricerche di Propulsione', () => {
  it('Raffinazione I: 4 Idrogeno per unità', () => {
    expect(costoPieno(2, 1, new Set(['P1']))).toBe(8)
  })
})
