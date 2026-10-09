import { describe, expect, it } from 'vitest'
import { BILANCIAMENTO } from './bilanciamento'
import { SOTTOTIPI } from './sottotipi'
import { TIPI_CON_SOTTOTIPI, TRAGUARDI } from './traguardi'

describe('traguardi', () => {
  it('sono 53, con codici tutti diversi', () => {
    expect(TRAGUARDI).toHaveLength(53)
    expect(new Set(TRAGUARDI.map((t) => t.codice)).size).toBe(TRAGUARDI.length)
  })

  it('il database conta i sottotipi come il catalogo', () => {
    expect(Object.keys(BILANCIAMENTO.traguardi.sottotipi).sort()).toEqual([...TIPI_CON_SOTTOTIPI].sort())
    for (const t of TIPI_CON_SOTTOTIPI) expect(BILANCIAMENTO.traguardi.sottotipi[t]).toBe(SOTTOTIPI[t].length)
  })
})
