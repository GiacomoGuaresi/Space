// Il campione fisso dell'universo: seed, tipi e rotte che TypeScript e SQL
// devono dare uguali. Lo stesso file lo usa `npm run verifica-sql` contro il
// database (doc/08-deploy.md). Se questo test fallisce, è cambiato l'universo;
// se il cambiamento è voluto, si rigenera con `npm run campione`.

import { describe, expect, it } from 'vitest'
import { seedSettore } from './casuale'
import campione from './campione.json'
import { rotta } from './navigazione'
import { tipoSettore } from './settore'

describe('campione fisso', () => {
  it('seed e tipi dei settori non cambiano', () => {
    for (const [x, y, z, seed, tipo] of campione.settori as [number, number, number, number, string | null][]) {
      expect(seedSettore(x, y, z)).toBe(seed)
      expect(tipoSettore({ x, y, z })).toBe(tipo)
    }
  })

  it('le rotte non cambiano', () => {
    for (const [dx, dy, dz, mx, my, mz, carburante, quota, ax, ay, az, percorsa, consumo] of campione.rotte) {
      const r = rotta({ x: dx, y: dy, z: dz }, { x: mx, y: my, z: mz }, carburante, quota)
      expect([r.a.x, r.a.y, r.a.z, r.percorsa, r.consumo]).toEqual([ax, ay, az, percorsa, consumo])
    }
  })
})
