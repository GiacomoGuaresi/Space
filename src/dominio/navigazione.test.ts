import { describe, expect, it } from 'vitest'
import { piuVicino } from './ricerca'
import {
  NAVE_INIZIALE,
  anteprima,
  carburanteOra,
  inViaggio,
  pienoTra,
  raggioScanner,
  rotta,
  scansione,
  type Nave,
} from './navigazione'
import { BASE, distanza, tipoSettore } from './settore'
import { BILANCIAMENTO } from './bilanciamento'

const RICARICA_STELLA = BILANCIAMENTO.carburante.ricaricaStella

const ORA = 3_600_000
const t0 = new Date('2026-10-08T10:00:00Z')
const dopo = (ms: number) => new Date(t0.getTime() + ms)

function nave(parziale: Partial<Nave> = {}): Nave {
  return { posizione: BASE, dal: t0, carburante: NAVE_INIZIALE.serbatoio, ...NAVE_INIZIALE, ...parziale }
}

describe('carburante', () => {
  it('da fermo si ricarica col tempo, fino al serbatoio pieno', () => {
    const n = nave({ carburante: 5 })
    expect(carburanteOra(n, t0)).toBe(5)
    expect(carburanteOra(n, dopo(2 * ORA))).toBe(5 + 2 * NAVE_INIZIALE.ricarica)
    expect(carburanteOra(n, dopo(100 * ORA))).toBe(NAVE_INIZIALE.serbatoio)
  })

  it('in viaggio non si ricarica', () => {
    const n = nave({ carburante: 3, dal: dopo(ORA) })
    expect(inViaggio(n, dopo(ORA / 2))).toBe(true)
    expect(carburanteOra(n, dopo(ORA / 2))).toBe(3)
    expect(inViaggio(n, dopo(ORA))).toBe(false)
  })

  it('accanto a una stella si ricarica più in fretta', () => {
    const stella = piuVicino(BASE, 'stella')!
    const n = nave({ posizione: stella, carburante: 0 })
    expect(carburanteOra(n, dopo(ORA))).toBe(NAVE_INIZIALE.ricarica * RICARICA_STELLA)
  })

  it('dice fra quanto il serbatoio è pieno', () => {
    expect(pienoTra(nave(), t0)).toBe(0)
    expect(pienoTra(nave({ carburante: NAVE_INIZIALE.serbatoio - 5 }), t0)).toBe((5 / NAVE_INIZIALE.ricarica) * ORA)
  })
})

describe('rotta', () => {
  it('arriva alla meta se il carburante basta', () => {
    const r = rotta(BASE, { x: 3, y: 4, z: 0 }, 10)
    expect(r).toEqual({ a: { x: 3, y: 4, z: 0 }, percorsa: 5, consumo: 5, fermata: false })
  })

  it('si ferma prima se il carburante non basta, senza consumarne più di quanto ce n’è', () => {
    const meta = { x: 30, y: -17, z: 8 }
    for (const carburante of [0.6, 1, 2.5, 7, 19.9]) {
      const r = rotta(BASE, meta, carburante)
      expect(r.fermata).toBe(true)
      expect(r.consumo).toBeLessThanOrEqual(carburante)
      expect(r.consumo).toBeCloseTo(distanza(BASE, r.a))
      // Il punto di fermata è vicino al punto in cui il carburante finisce.
      expect(r.consumo).toBeGreaterThan(carburante - 1.5)
    }
  })

  it('non si muove se il carburante non basta per un settore', () => {
    const r = rotta(BASE, { x: 10, y: 0, z: 0 }, 0.3)
    expect(r).toEqual({ a: BASE, percorsa: 0, consumo: 0, fermata: true })
  })

  it('arrotonda le metà allo stesso modo anche in negativo', () => {
    // A metà carburante si arriva a 2,5 → 3 in positivo, −2,5 → −2 in negativo.
    expect(rotta(BASE, { x: 5, y: 0, z: 0 }, 2.5).a.x).toBeLessThanOrEqual(2)
    expect(rotta(BASE, { x: -5, y: 0, z: 0 }, 2.5).a.x).toBeGreaterThanOrEqual(-2)
  })
})

describe('anteprima', () => {
  it('calcola durata e consumo alla velocità della nave', () => {
    const a = anteprima(nave(), { x: 12, y: 0, z: 0 }, t0)
    expect(a.consumo).toBe(12)
    expect(a.durata).toBe(ORA)
    expect(a.possibile).toBe(true)
    expect(a.fionda).toBe(false)
  })

  it('da un buco nero si va al doppio della velocità', () => {
    const buco = piuVicino({ x: 2000, y: 0, z: 0 }, 'buconero', 40)!
    const a = anteprima(nave({ posizione: buco }), { x: buco.x + 12, y: buco.y, z: buco.z }, t0)
    expect(a.fionda).toBe(true)
    expect(a.durata).toBe(ORA / 2)
  })

  it('non è possibile con il serbatoio quasi vuoto', () => {
    expect(anteprima(nave({ carburante: 0.2 }), { x: 5, y: 0, z: 0 }, t0).possibile).toBe(false)
  })
})

describe('scanner', () => {
  it('ha il raggio ridotto nelle nebulose e doppio presso le pulsar', () => {
    expect(raggioScanner(null)).toBe(3)
    expect(raggioScanner('nebulosa')).toBe(1)
    expect(raggioScanner('pulsar')).toBe(6)
  })

  it('trova solo corpi entro il raggio, dal più vicino', () => {
    const centro = { x: 1000, y: 0, z: 0 }
    const trovati = scansione(centro, 3)
    expect(trovati.length).toBeGreaterThan(3)
    for (let i = 0; i < trovati.length; i++) {
      expect(trovati[i].distanza).toBeLessThanOrEqual(3)
      expect(tipoSettore(trovati[i].coordinate)).toBe(trovati[i].tipo)
      if (i > 0) expect(trovati[i].distanza).toBeGreaterThanOrEqual(trovati[i - 1].distanza)
    }
  })
})
