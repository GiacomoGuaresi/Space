import { describe, expect, it } from 'vitest'
import { durata, rovescia, settori } from './formato'

const MIN = 60_000

describe('durata', () => {
  it('sceglie l’unità giusta', () => {
    expect(durata(45_000)).toBe('45 s')
    expect(durata(5 * MIN)).toBe('5 min')
    expect(durata(60 * MIN)).toBe('1 h')
    expect(durata(100 * MIN)).toBe('1 h 40 min')
    expect(durata(50 * 60 * MIN)).toBe('2 g 2 h')
    expect(durata(-5)).toBe('0 s')
  })
})

describe('rovescia', () => {
  it('scrive minuti e secondi, con le ore quando servono', () => {
    expect(rovescia(245_000)).toBe('4:05')
    expect(rovescia(99 * MIN + 58_000)).toBe('1:39:58')
    expect(rovescia(0)).toBe('0:00')
  })

  it('arrotonda in su, così non mostra 0:00 prima dell’arrivo', () => {
    expect(rovescia(400)).toBe('0:01')
  })
})

describe('settori', () => {
  it('concorda il plurale', () => {
    expect(settori(1)).toBe('1 settore')
    expect(settori(2.45)).toBe('2,5 settori')
  })
})
