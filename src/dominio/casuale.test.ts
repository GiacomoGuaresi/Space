import { describe, expect, it } from 'vitest'
import { casuale, derivato, mescola, seedSettore } from './casuale'

describe('seedSettore', () => {
  it('dà sempre lo stesso seed per le stesse coordinate', () => {
    expect(seedSettore(12, -7, 3)).toBe(seedSettore(12, -7, 3))
  })

  it("tiene conto dell'ordine e del segno delle coordinate", () => {
    const visti = new Set([
      seedSettore(1, 2, 3),
      seedSettore(3, 2, 1),
      seedSettore(-1, 2, 3),
      seedSettore(1, -2, 3),
      seedSettore(0, 0, 0),
    ])
    expect(visti.size).toBe(5)
  })

  it('cambia con il seed di universo', () => {
    expect(seedSettore(0, 0, 0, 1)).not.toBe(seedSettore(0, 0, 0, 2))
  })

  it('resta un intero a 32 bit senza segno, anche lontanissimo', () => {
    for (const s of [seedSettore(2147483647, -2147483648, 0), seedSettore(-5, -5, -5)]) {
      expect(Number.isInteger(s)).toBe(true)
      expect(s).toBeGreaterThanOrEqual(0)
      expect(s).toBeLessThan(2 ** 32)
    }
  })

  it('non si ripete tra settori vicini', () => {
    const visti = new Set<number>()
    for (let x = -10; x <= 10; x++)
      for (let y = -10; y <= 10; y++) for (let z = -10; z <= 10; z++) visti.add(seedSettore(x, y, z))
    expect(visti.size).toBe(21 ** 3)
  })

  // Valori fissati: se cambiano, cambia l'universo intero (doc/03-universo.md).
  it('non cambia per sbaglio', () => {
    expect(mescola(0)).toBe(0)
    expect(mescola(1)).toBe(0x514e28b7)
    expect([seedSettore(0, 0, 0), seedSettore(1, 2, 3), seedSettore(-40, 7, 1000)]).toMatchInlineSnapshot(`
      [
        1635399285,
        330387716,
        970670283,
      ]
    `)
  })
})

describe('derivato', () => {
  it('dà sequenze diverse per parti diverse dello stesso settore', () => {
    const seed = seedSettore(4, 4, 4)
    expect(derivato(seed, 0)).not.toBe(derivato(seed, 1))
    expect(derivato(seed, 0)).toBe(derivato(seed, 0))
  })
})

describe('casuale', () => {
  it('ripete la stessa sequenza con la stessa semina', () => {
    const a = casuale(42)
    const b = casuale(42)
    for (let i = 0; i < 20; i++) expect(a.numero()).toBe(b.numero())
  })

  it('resta nei limiti', () => {
    const c = casuale(7)
    for (let i = 0; i < 2000; i++) {
      const n = c.numero()
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThan(1)
      const k = c.intero(-2, 3)
      expect(k).toBeGreaterThanOrEqual(-2)
      expect(k).toBeLessThanOrEqual(3)
      const t = c.tra(10, 20)
      expect(t).toBeGreaterThanOrEqual(10)
      expect(t).toBeLessThan(20)
    }
  })

  it('estrae in proporzione ai pesi e mai i pesi zero', () => {
    const c = casuale(99)
    const conti = { a: 0, b: 0, c: 0 }
    for (let i = 0; i < 20000; i++) conti[c.pesato({ a: 1, b: 3, c: 0 })]++
    expect(conti.c).toBe(0)
    expect(conti.b / conti.a).toBeGreaterThan(2.7)
    expect(conti.b / conti.a).toBeLessThan(3.3)
  })

  it('sceglie tutti gli elementi, prima o poi', () => {
    const c = casuale(5)
    const visti = new Set<string>()
    for (let i = 0; i < 200; i++) visti.add(c.scegli(['a', 'b', 'c', 'd']))
    expect(visti.size).toBe(4)
  })
})
