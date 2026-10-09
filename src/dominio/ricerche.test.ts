import { describe, expect, it } from 'vitest'
import { costoLavoro } from './cantiere'
import { aLivello, basiFondabili, bonusProduzione, estrattoriFondabili } from './insediamenti'
import { velocitaNave } from './navigazione'
import { bloccata, costoGradino, costoRicerca, durataGradino, ID_RICERCHE, infinito, livelloRicerca, ricercheFatte } from './ricerche'

describe('ricerche', () => {
  it('sono 42: dieci per ramo, più i due nodi infiniti', () => {
    expect(ID_RICERCHE).toHaveLength(42)
    expect(ID_RICERCHE.filter(infinito)).toEqual(['P∞', 'C∞'])
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

describe('nodi infiniti', () => {
  const t = new Date('2026-10-09T12:00:00Z')
  const prima = new Date(t.getTime() - 1000)
  const fatte = ricercheFatte(
    [
      { nodo: 'C8', livello: 1, fine: prima },
      { nodo: 'C∞', livello: 1, fine: prima },
      { nodo: 'C∞', livello: 2, fine: prima },
      { nodo: 'C∞', livello: 3, fine: t },
      { nodo: 'P∞', livello: 1, fine: prima },
    ],
    prima,
  )

  it('contano i livelli fatti', () => {
    expect(livelloRicerca(fatte, 'C∞')).toBe(2)
    expect(livelloRicerca(fatte, 'P∞')).toBe(1)
    expect(bloccata('C∞', new Set(['C10', 'C∞']))).toBeNull()
  })

  it('il livello L costa come un livello 20 + L di base 60', () => {
    expect(costoRicerca('P∞', new Set(['P10']))).toEqual(
      Object.fromEntries(Object.entries(costoGradino(10)).map(([r]) => [r, expect.any(Number)])),
    )
    const totale = Object.values(costoRicerca('C∞', fatte)).reduce((a, b) => a + b!, 0)
    expect(totale).toBeCloseTo(aLivello(60, 1.45, 23), 6)
  })

  it('Colonizzazione avanzata: +1 base ogni 2 livelli, +1 estrattore e ×1,03 la produzione a livello', () => {
    expect(basiFondabili(fatte)).toBe(3)
    expect(estrattoriFondabili(fatte)).toBe(2)
    expect(bonusProduzione(fatte)).toBeCloseTo(1.15 * 1.03 * 1.03, 12)
  })

  it('Propulsione avanzata: ×1,04 la velocità a livello', () => {
    expect(velocitaNave({ velocita: 1 }, fatte)).toBeCloseTo(1.04, 12)
  })
})
