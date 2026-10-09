import { describe, expect, it } from 'vitest'
import { corpiNoti, sosteRadar } from './mappa'
import { raggioRadar, scansione, tipiRilevabili } from './navigazione'
import { tipoSettore } from './settore'

const centro = { x: 1000, y: 0, z: 0 }

describe('corpiNoti', () => {
  it('ricalcola i corpi rilevati in una sosta, con i tipi del suo livello', () => {
    const punti = corpiNoti([{ centro, raggio: 6, livello: 1 }], [])
    expect(punti.length).toBe(scansione(centro, 6, tipiRilevabili(1)).length)
    for (const p of punti) {
      expect(p.tipo).toBe('sistema')
      expect(p.scoperto).toBe(false)
    }
  })

  it('aggiunge le scoperte, anche di tipi invisibili, una volta sola', () => {
    const sistema = scansione(centro, 6, tipiRilevabili(1))[0]
    const altro = scansione(centro, 6).find((r) => r.tipo !== 'sistema')!
    const punti = corpiNoti(
      [{ centro, raggio: 6, livello: 1 }],
      [
        { coordinate: sistema.coordinate, tipo: sistema.tipo },
        { coordinate: altro.coordinate, tipo: tipoSettore(altro.coordinate)! },
      ],
    )
    expect(punti.filter((p) => p.scoperto).length).toBe(2)
    expect(punti.find((p) => p.tipo === altro.tipo)?.scoperto).toBe(true)
    const chiavi = punti.map(({ coordinate: c }) => `${c.x},${c.y},${c.z}`)
    expect(new Set(chiavi).size).toBe(chiavi.length)
  })

  it('soste vicine non ripetono i corpi in comune', () => {
    const punti = corpiNoti(
      [
        { centro, raggio: 6, livello: 21 },
        { centro: { ...centro, x: centro.x + 2 }, raggio: 6, livello: 21 },
      ],
      [],
    )
    const chiavi = punti.map(({ coordinate: c }) => `${c.x},${c.y},${c.z}`)
    expect(new Set(chiavi).size).toBe(chiavi.length)
    expect(punti.length).toBeGreaterThan(scansione(centro, 6).length)
  })
})

describe('radar', () => {
  it('ha raggio 4 × 1,2^(livello − 1), e 0 se non c’è', () => {
    expect(raggioRadar(0)).toBe(0)
    expect(raggioRadar(1)).toBe(4)
    expect(raggioRadar(3)).toBeCloseTo(5.76, 10)
  })

  it('è una sosta fissa attorno alle basi che lo hanno, coi tipi dello scanner della nave', () => {
    const t = new Date('2026-10-09T00:00:00Z')
    const soste = sosteRadar(
      [
        { coordinate: centro, radar: 2 },
        { coordinate: { x: 0, y: 0, z: 0 }, radar: 0 },
      ],
      3,
      () => t,
    )
    expect(soste).toEqual([{ centro, raggio: 4.8, livello: 3, istante: t }])
  })
})
