import { describe, expect, it } from 'vitest'
import { leggiCoordinate, scriviCoordinate } from './indirizzo'

describe('leggiCoordinate', () => {
  it('legge tre interi, anche negativi e con spazi', () => {
    expect(leggiCoordinate('#/12,-4,0')).toEqual({ x: 12, y: -4, z: 0 })
    expect(leggiCoordinate('#/ 1, 2 ,3')).toEqual({ x: 1, y: 2, z: 3 })
    expect(leggiCoordinate('#3,3,3')).toEqual({ x: 3, y: 3, z: 3 })
  })

  it('rifiuta tutto il resto', () => {
    for (const hash of ['', '#/', '#/1,2', '#/1,2,3,4', '#/a,2,3', '#/1.5,2,3', '#/1,,3', '#/9999999999,0,0']) {
      expect(leggiCoordinate(hash)).toBeNull()
    }
  })

  it('rilegge quello che scrive', () => {
    const c = { x: -300, y: 7, z: 2_000_000 }
    expect(leggiCoordinate(scriviCoordinate(c))).toEqual(c)
  })
})
