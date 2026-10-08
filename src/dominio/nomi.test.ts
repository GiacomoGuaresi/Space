import { describe, expect, it } from 'vitest'
import { casuale } from './casuale'
import { TIPI } from './catalogo'
import { nomeCorpo, nomePianeta, nomeProprio } from './nomi'

describe('nomeProprio', () => {
  it('è sempre lo stesso con la stessa semina', () => {
    expect(nomeProprio(casuale(1))).toBe(nomeProprio(casuale(1)))
  })

  it('ha iniziale maiuscola, solo lettere e una lunghezza ragionevole', () => {
    for (let s = 0; s < 500; s++) {
      const nome = nomeProprio(casuale(s))
      expect(nome).toMatch(/^[A-Z][a-z]+$/)
      expect(nome.length).toBeGreaterThanOrEqual(3)
      expect(nome.length).toBeLessThanOrEqual(12)
    }
  })

  it('varia abbastanza', () => {
    const visti = new Set<string>()
    for (let s = 0; s < 1000; s++) visti.add(nomeProprio(casuale(s)))
    expect(visti.size).toBeGreaterThan(950)
  })
})

describe('nomeCorpo', () => {
  it('segue lo schema di ogni tipo', () => {
    const c = () => casuale(12345)
    expect(nomeCorpo('nebulosa', c())).toMatch(/^Nebulosa di [A-Z]/)
    expect(nomeCorpo('asteroidi', c())).toMatch(/^Fascia di [A-Z]/)
    expect(nomeCorpo('cometa', c())).toMatch(/^[CP]\/\d{4} [A-Z]/)
    expect(nomeCorpo('pulsar', c())).toMatch(/^PSR J\d{4}[+−]\d{2}$/)
    expect(nomeCorpo('buconero', c())).toMatch(/^[A-Z]{2}-\d{4}$/)
    expect(nomeCorpo('relitto', c())).toMatch(/^Relitto «[A-Z][a-z]+ [A-Z][a-z]+»$/)
    expect(nomeCorpo('wormhole', c())).toMatch(/^Varco di [A-Z]/)
  })

  it('dà un nome a ogni tipo', () => {
    for (const tipo of TIPI) expect(nomeCorpo(tipo, casuale(7)).length).toBeGreaterThan(2)
  })
})

describe('nomePianeta', () => {
  it('numera i pianeti in cifre romane', () => {
    expect(nomePianeta('Kelaris', 0)).toBe('Kelaris I')
    expect(nomePianeta('Kelaris', 3)).toBe('Kelaris IV')
  })
})
