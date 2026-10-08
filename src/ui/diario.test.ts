import { describe, expect, it } from 'vitest'
import type { Scansione, Scoperta } from '../dati'
import { NAVE_INIZIALE, type Nave, type Viaggio } from '../dominio/navigazione'
import { piuVicino } from '../dominio/ricerca'
import { BASE } from '../dominio/settore'
import { novita, raggruppa, vociDiario } from './diario'

const ORA = 3_600_000
const t0 = new Date('2026-10-08T12:00:00Z')
const dopo = (ore: number) => new Date(t0.getTime() + ore * ORA)

const nave = (parziale: Partial<Nave> = {}): Nave => ({
  posizione: BASE,
  dal: t0,
  carburante: NAVE_INIZIALE.serbatoio,
  ...NAVE_INIZIALE,
  scanner: 1,
  stiva: 1,
  ...parziale,
})

const viaggio = (parziale: Partial<Viaggio>): Viaggio => ({
  da: BASE,
  meta: { x: 1, y: 0, z: 0 },
  a: { x: 1, y: 0, z: 0 },
  partenza: dopo(1),
  arrivo: dopo(5),
  consumo: 1,
  fionda: false,
  ...parziale,
})

const fonti = (p: { viaggi?: Viaggio[]; scoperte?: Scoperta[]; scansioni?: Scansione[]; nave?: Nave; ora: Date }) => ({
  viaggi: [],
  scoperte: [],
  scansioni: [],
  nave: nave(),
  ...p,
})

describe('vociDiario', () => {
  it('racconta partenza e arrivo solo quando sono successi, dal più recente', () => {
    const v = viaggio({})
    expect(vociDiario(fonti({ viaggi: [v], ora: dopo(0) }))).toEqual([])
    expect(vociDiario(fonti({ viaggi: [v], ora: dopo(2) })).map((x) => x.tipo)).toEqual(['partenza'])
    const voci = vociDiario(fonti({ viaggi: [v], ora: dopo(6) }))
    expect(voci.map((x) => x.tipo)).toEqual(['arrivo', 'partenza'])
    expect(voci[0].testo).toContain('spazio vuoto')
  })

  it('distingue la sosta forzata', () => {
    const [voce] = vociDiario(fonti({ viaggi: [viaggio({ meta: { x: 10, y: 0, z: 0 } })], ora: dopo(6) }))
    expect(voce.tipo).toBe('sosta')
    expect(voce.testo).toContain('9 sett. dalla meta')
  })

  it('segna la ricarica completata della sosta in corso', () => {
    const ferma = nave({ posizione: { x: 0, y: 0, z: 1 }, carburante: 0 })
    // Fuori dalla base il tetto è metà serbatoio: 2 unità a 0,4/h, cioè 5 ore.
    expect(vociDiario(fonti({ nave: ferma, ora: dopo(4) }))).toEqual([])
    const [voce] = vociDiario(fonti({ nave: ferma, ora: dopo(6) }))
    expect(voce.tipo).toBe('ricarica')
    expect(voce.quando).toEqual(dopo(5))
  })

  it('dei rilevamenti tiene il primo di ogni tipo e i rari', () => {
    const voci = vociDiario(fonti({ scansioni: [{ centro: { x: 1000, y: 0, z: 0 }, raggio: 6, livello: 21, istante: dopo(1) }], ora: dopo(2) }))
    const rilevati = voci.filter((v) => v.tipo === 'rilevato')
    expect(rilevati.length).toBeGreaterThan(0)
    const comuni = rilevati.filter((v) => /comune\)/.test(v.testo) && !/non comune/.test(v.testo))
    // Un solo comune per tipo.
    expect(new Set(comuni.map((v) => v.breve)).size).toBe(comuni.length)
  })

  it('tiene solo gli ultimi 30 giorni', () => {
    const vecchio = viaggio({ partenza: dopo(-40 * 24), arrivo: dopo(-39 * 24) })
    expect(vociDiario(fonti({ viaggi: [vecchio], ora: dopo(0) }))).toEqual([])
  })

  it('chiama per nome il primo corpo di un tipo nel catalogo', () => {
    const stella = piuVicino(BASE, 'stella')!
    const scoperte = [
      { coordinate: stella, tipo: 'stella' as const, scoperta: dopo(1) },
      { coordinate: piuVicino(stella, 'stella')!, tipo: 'stella' as const, scoperta: dopo(3) },
    ]
    const voci = vociDiario(fonti({ scoperte, ora: dopo(4) }))
    expect(voci[1].testo).toMatch(/^Primo nel catalogo/)
    expect(voci[0].testo).toMatch(/^Nuovo nel catalogo/)
  })
})

describe('novità e gruppi', () => {
  it('le partenze non sono mai novità', () => {
    const [arrivo, partenza] = vociDiario(fonti({ viaggi: [viaggio({})], ora: dopo(6) }))
    expect(novita(arrivo, dopo(2))).toBe(true)
    expect(novita(partenza, dopo(0))).toBe(false)
    expect(novita(arrivo, dopo(6))).toBe(false)
  })

  it('raggruppa le voci consecutive dello stesso tipo', () => {
    const viaggi = [viaggio({}), viaggio({ partenza: dopo(6), arrivo: dopo(8), a: BASE, meta: BASE })]
    const gruppi = raggruppa(vociDiario(fonti({ viaggi, ora: dopo(9) })))
    expect(gruppi.map((g) => g.map((v) => v.tipo))).toEqual([['arrivo'], ['partenza'], ['arrivo'], ['partenza']])
    const doppi = raggruppa([...vociDiario(fonti({ viaggi: [viaggio({})], ora: dopo(6) })).slice(0, 1), ...vociDiario(fonti({ viaggi: [viaggio({})], ora: dopo(6) })).slice(0, 1)])
    expect(doppi).toHaveLength(1)
    expect(doppi[0]).toHaveLength(2)
  })
})
