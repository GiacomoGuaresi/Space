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
  tettoQui,
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
    const n = nave({ carburante: 1 })
    expect(carburanteOra(n, t0)).toBe(1)
    expect(carburanteOra(n, dopo(2 * ORA))).toBe(1 + 2 * NAVE_INIZIALE.ricarica)
    expect(carburanteOra(n, dopo(100 * ORA))).toBe(NAVE_INIZIALE.serbatoio)
  })

  it('in viaggio non si ricarica', () => {
    const n = nave({ carburante: 3, dal: dopo(ORA) })
    expect(inViaggio(n, dopo(ORA / 2))).toBe(true)
    expect(carburanteOra(n, dopo(ORA / 2))).toBe(3)
    expect(inViaggio(n, dopo(ORA))).toBe(false)
  })

  it('accanto a una stella si ricarica più in fretta, fino al pieno', () => {
    const stella = piuVicino(BASE, 'stella')!
    const n = nave({ posizione: stella, carburante: 0 })
    expect(carburanteOra(n, dopo(ORA))).toBe(NAVE_INIZIALE.ricarica * RICARICA_STELLA)
    expect(carburanteOra(n, dopo(100 * ORA))).toBe(NAVE_INIZIALE.serbatoio)
  })

  it('fuori dalla base e lontano dalle stelle si ricarica solo fino al tetto', () => {
    const vuoto = { x: 0, y: 0, z: 1 }
    expect(tipoSettore(vuoto)).toBeNull()
    const tetto = NAVE_INIZIALE.serbatoio * BILANCIAMENTO.carburante.tettoFuori
    expect(tetto).toBeLessThan(NAVE_INIZIALE.serbatoio)
    expect(tettoQui(nave(), vuoto)).toBe(tetto)
    expect(tettoQui(nave(), BASE)).toBe(NAVE_INIZIALE.serbatoio)
    expect(carburanteOra(nave({ posizione: vuoto, carburante: 0 }), dopo(100 * ORA))).toBe(tetto)
    expect(pienoTra(nave({ posizione: vuoto, carburante: tetto - 1 }), t0)).toBe((1 / NAVE_INIZIALE.ricarica) * ORA)
  })

  it('oltre il tetto non cala: smette solo di salire', () => {
    const n = nave({ posizione: { x: 0, y: 0, z: 1 }, carburante: NAVE_INIZIALE.serbatoio * 0.9 })
    expect(carburanteOra(n, dopo(10 * ORA))).toBe(NAVE_INIZIALE.serbatoio * 0.9)
    expect(pienoTra(n, dopo(10 * ORA))).toBe(0)
  })

  it('dice fra quanto il serbatoio è pieno', () => {
    expect(pienoTra(nave(), t0)).toBe(0)
    expect(pienoTra(nave({ carburante: NAVE_INIZIALE.serbatoio - 2 }), t0)).toBe((2 / NAVE_INIZIALE.ricarica) * ORA)
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
    const a = anteprima(nave(), { x: 3, y: 0, z: 0 }, t0)
    expect(a.consumo).toBe(3)
    expect(a.durata).toBe((3 / NAVE_INIZIALE.velocita) * ORA)
    expect(a.possibile).toBe(true)
    expect(a.fionda).toBe(false)
  })

  it('da un buco nero si va più veloci e si consuma meno', () => {
    const buco = piuVicino({ x: 2000, y: 0, z: 0 }, 'buconero', 40)!
    const a = anteprima(nave({ posizione: buco }), { x: buco.x + 2, y: buco.y, z: buco.z }, t0)
    expect(a.fionda).toBe(true)
    expect(a.durata).toBe((2 / (NAVE_INIZIALE.velocita * BILANCIAMENTO.fionda.velocita)) * ORA)
    expect(a.percorsa).toBe(2)
    expect(a.consumo).toBeCloseTo(2 * (1 - BILANCIAMENTO.fionda.gratis))
  })

  it('con la fionda il carburante porta più lontano, ma il tratto gratis non cresce con la meta', () => {
    const buco = piuVicino({ x: 2000, y: 0, z: 0 }, 'buconero', 40)!
    const lontano = { x: buco.x + 1000, y: buco.y, z: buco.z }
    const a = anteprima(nave({ posizione: buco, carburante: 2.5 }), lontano, t0)
    expect(a.fermata).toBe(true)
    expect(a.consumo).toBeLessThanOrEqual(2.5)
    expect(a.percorsa).toBeGreaterThan(2.5)
    expect(a.percorsa).toBeLessThanOrEqual(2.5 / (1 - BILANCIAMENTO.fionda.gratis))
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
