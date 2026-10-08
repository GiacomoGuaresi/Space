import { describe, expect, it } from 'vitest'
import { indirizzo, leggiCoordinate, leggiPagina } from './indirizzo'

describe('leggiCoordinate', () => {
  it('legge tre interi, anche negativi e con spazi', () => {
    expect(leggiCoordinate('12,-4,0')).toEqual({ x: 12, y: -4, z: 0 })
    expect(leggiCoordinate(' 1, 2 ,3')).toEqual({ x: 1, y: 2, z: 3 })
  })

  it('rifiuta tutto il resto', () => {
    for (const testo of ['', '1,2', '1,2,3,4', 'a,2,3', '1.5,2,3', '1,,3', '9999999999,0,0']) {
      expect(leggiCoordinate(testo)).toBeNull()
    }
  })
})

describe('leggiPagina', () => {
  it('riconosce le pagine', () => {
    expect(leggiPagina('')).toEqual({ pagina: 'ponte' })
    expect(leggiPagina('#/')).toEqual({ pagina: 'ponte' })
    expect(leggiPagina('#/catalogo')).toEqual({ pagina: 'catalogo' })
    expect(leggiPagina('#/mappa')).toEqual({ pagina: 'mappa' })
    expect(leggiPagina('#/altro')).toEqual({ pagina: 'altro' })
    expect(leggiPagina('#/rotta/4,-1,0')).toEqual({ pagina: 'ponte', meta: { x: 4, y: -1, z: 0 } })
    expect(leggiPagina('#/rotta/4,a')).toEqual({ pagina: 'ponte' })
    expect(leggiPagina('#/osservatorio/3,-2,1')).toEqual({ pagina: 'osservatorio', coordinate: { x: 3, y: -2, z: 1 } })
  })

  it("porta l'osservatorio alla base se le coordinate non vanno, e il resto al ponte", () => {
    expect(leggiPagina('#/osservatorio')).toEqual({ pagina: 'osservatorio', coordinate: { x: 0, y: 0, z: 0 } })
    expect(leggiPagina('#/osservatorio/x')).toEqual({ pagina: 'osservatorio', coordinate: { x: 0, y: 0, z: 0 } })
    expect(leggiPagina('#/qualcosa')).toEqual({ pagina: 'ponte' })
  })

  it('rilegge quello che scrive', () => {
    const pagina = { pagina: 'osservatorio', coordinate: { x: -300, y: 7, z: 2_000_000 } } as const
    expect(leggiPagina(indirizzo(pagina))).toEqual(pagina)
    expect(leggiPagina(indirizzo({ pagina: 'catalogo' }))).toEqual({ pagina: 'catalogo' })
    expect(leggiPagina(indirizzo({ pagina: 'mappa' }))).toEqual({ pagina: 'mappa' })
    const rotta = { pagina: 'ponte', meta: { x: -1, y: 2, z: 3 } } as const
    expect(leggiPagina(indirizzo(rotta))).toEqual(rotta)
  })
})
