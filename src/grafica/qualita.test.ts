import { describe, expect, it } from 'vitest'
import { mediana, Misuratore, resa, valuta } from './qualita'

describe('qualità della grafica', () => {
  it('scende di un livello sotto i 40 fotogrammi al secondo, mai oltre il più basso', () => {
    expect(valuta('alta', Array(60).fill(1 / 60))).toBe('alta')
    expect(valuta('alta', Array(60).fill(1 / 25))).toBe('media')
    expect(valuta('media', Array(60).fill(1 / 25))).toBe('bassa')
    expect(valuta('bassa', Array(60).fill(1 / 10))).toBe('bassa')
    expect(mediana([1, 3, 2, 100])).toBe(2.5)
  })

  it('misura dopo l’avvio, ignora i fotogrammi lunghissimi e decide dopo 3 secondi', () => {
    const m = new Misuratore('alta')
    // 3 s di avvio a 25 fps non contano.
    for (let i = 0; i < 75; i++) expect(m.campione(1 / 25)).toBeNull()
    expect(m.campione(5)).toBeNull()
    let fotogrammi = 0
    let esito = null
    while (!esito && fotogrammi < 1000) {
      esito = m.campione(1 / 25)
      fotogrammi++
    }
    expect(esito).toBe('media')
    expect(fotogrammi).toBe(75)
    expect(m.qualita).toBe('media')
  })

  it('a pochissimi fotogrammi decide comunque, dopo 3 secondi', () => {
    const m = new Misuratore('alta')
    const esiti = Array.from({ length: 40 }, () => m.campione(0.2)).filter(Boolean)
    expect(esiti[0]).toBe('media')
  })

  it('la qualità bassa toglie il bloom e i pixel', () => {
    expect(resa('alta', 3)).toEqual({ pixel: 2, bloom: true })
    expect(resa('media', 3)).toEqual({ pixel: 1, bloom: true })
    expect(resa('bassa', 3)).toEqual({ pixel: 0.75, bloom: false })
  })
})
