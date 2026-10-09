import { describe, expect, it } from 'vitest'
import { alterna, dentro, disposizione, disposizioneIniziale, FINESTRE, leggiDisposizione, mostra, riordina, rientra } from './finestre'

describe('disposizione delle finestre', () => {
  it('parte con Scanner e Rotta aperte e le altre chiuse', () => {
    const d = disposizioneIniziale(1440)
    expect(
      Object.entries(d.finestre)
        .filter(([, f]) => f.stato === 'aperta')
        .map(([id]) => id)
        .sort(),
    ).toEqual(['rotta', 'scanner'])
    expect(d.finestre.rotta.x + d.finestre.rotta.w).toBeLessThanOrEqual(1440)
    expect(d.sfondo).toBe('scena')
    // Su uno schermo basso lo Scanner si accorcia per starci.
    const bassa = disposizioneIniziale(1024, 360)
    expect(bassa.finestre.scanner.y + bassa.finestre.scanner.h).toBeLessThanOrEqual(360)
  })

  it('legge quella salvata scartando i valori strani e completando le finestre mancanti', () => {
    const iniziale = disposizioneIniziale(1440)
    const d = leggiDisposizione(
      {
        finestre: {
          wiki: { stato: 'ridotta', x: 5, y: 6, w: 300, h: 200 },
          rotta: { stato: 'boh', x: 1, y: 1, w: 1, h: 1 },
          scanner: { stato: 'aperta', x: 'a', y: 1, w: 1, h: 1 },
        },
        ordine: ['wiki', 'sconosciuta', 'qui', 'rotta'],
        sfondo: 'mappa',
      },
      iniziale,
    )
    expect(d.finestre.wiki).toEqual({ stato: 'ridotta', x: 5, y: 6, w: 300, h: 200 })
    expect(d.finestre.rotta).toEqual(iniziale.finestre.rotta)
    expect(d.finestre.scanner).toEqual(iniziale.finestre.scanner)
    expect(d.ordine).toHaveLength(Object.keys(FINESTRE).length)
    expect(d.ordine.slice(-2)).toEqual(['wiki', 'rotta'])
    expect(d.sfondo).toBe('mappa')
    expect(leggiDisposizione('rotta', iniziale)).toBe(iniziale)
  })

  it('riporta una finestra dentro lo schermo senza scendere sotto la misura minima', () => {
    const f = { stato: 'aperta' as const, x: 900, y: 500, w: 340, h: 420 }
    expect(dentro(f, 'rotta', 1000, 600)).toEqual({ stato: 'aperta', x: 660, y: 180, w: 340, h: 420 })
    expect(dentro(f, 'rotta', 200, 150)).toMatchObject({ x: 0, y: 0, w: FINESTRE.rotta.minW, h: FINESTRE.rotta.minH })
  })

  it('alterna, rientra e riordina', () => {
    riordina()
    alterna('wiki')
    expect(disposizione().finestre.wiki.stato).toBe('aperta')
    expect(disposizione().ordine.at(-1)).toBe('wiki')
    // Aperta e in primo piano: la stessa voce la riduce.
    alterna('wiki')
    expect(disposizione().finestre.wiki.stato).toBe('ridotta')

    rientra(500, 400)
    for (const [id, f] of Object.entries(disposizione().finestre)) {
      const { minW, minH } = FINESTRE[id as keyof typeof FINESTRE]
      expect(f.x + f.w).toBeLessThanOrEqual(Math.max(500, minW))
      expect(f.y + f.h).toBeLessThanOrEqual(Math.max(400, minH))
    }

    mostra('mappa')
    riordina()
    expect(disposizione().finestre.wiki.stato).toBe('chiusa')
    expect(disposizione().sfondo).toBe('mappa')
  })
})
