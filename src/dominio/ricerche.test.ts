import { describe, expect, it } from 'vitest'
import { costoLavoro } from './cantiere'
import { bloccata, costoGradino, durataGradino, ID_RICERCHE } from './ricerche'

describe('ricerche', () => {
  it('sono 40, dieci per ramo', () => {
    expect(ID_RICERCHE).toHaveLength(40)
  })

  it('costano come un livello 2 × gradino di base 60', () => {
    expect(costoGradino(1)).toEqual(costoLavoro('motore', 2))
    expect(Object.keys(costoGradino(5))).toContain('terreRare')
    expect(Object.keys(costoGradino(8))).toContain('materiaOscura')
  })

  it('durano 6 min a gradino, al massimo 1 h', () => {
    expect(durataGradino(1)).toBeCloseTo(0.1, 10)
    expect(durataGradino(10)).toBe(1)
  })

  it('chiedono il nodo prima e i prerequisiti', () => {
    expect(bloccata('C2', new Set())).toContain('Astrofisica I')
    expect(bloccata('P3', new Set(['P1', 'P2']))).toContain('Cantiere orbitale')
    expect(bloccata('C1', new Set(['C1']))).toBe('Già fatta.')
  })
})
