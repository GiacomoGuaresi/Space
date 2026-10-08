import { describe, expect, it } from 'vitest'
import { TIPI } from './catalogo'
import { piuVicino } from './ricerca'
import { settore } from './settore'
import { SOTTOTIPI, sottotipo } from './sottotipi'

describe('sottotipi', () => {
  it('il sottotipo di ogni corpo è tra quelli del suo tipo', () => {
    for (const tipo of TIPI) {
      const dove = piuVicino({ x: 2000, y: 0, z: 0 }, tipo, 40)!
      const { corpo } = settore(dove)
      const chiave = sottotipo(corpo!.dettagli)
      if (SOTTOTIPI[tipo].length === 0) expect(chiave).toBeNull()
      else expect(SOTTOTIPI[tipo].map((s) => s.chiave)).toContain(chiave)
    }
  })
})
