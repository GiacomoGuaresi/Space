// Rigenera il campione fisso dell'universo (src/dominio/campione.json): settori
// con seed e tipo, rotte con il loro esito, calcolati in TypeScript.
//
//   npm run campione
//
// Va lanciato solo quando l'universo o le rotte cambiano DI PROPOSITO; poi
// `npm test` lo confronta con TypeScript e `npm run verifica-sql` con il
// database (doc/08-deploy.md).

import { writeFileSync } from 'node:fs'
import { casuale, seedSettore } from '../src/dominio/casuale.ts'
import { TIPI } from '../src/dominio/catalogo.ts'
import { rotta } from '../src/dominio/navigazione.ts'
import { piuVicino } from '../src/dominio/ricerca.ts'
import { tipoSettore, type Coordinate } from '../src/dominio/settore.ts'

const c = casuale(20261008)
const MASSIMO = 2 ** 31 - 1
const punto = (raggio: number): Coordinate => ({
  x: c.intero(-raggio, raggio),
  y: c.intero(-raggio, raggio),
  z: c.intero(-raggio, raggio),
})

const punti: Coordinate[] = []
for (let i = 0; i < 150; i++) punti.push(punto(60))
for (let i = 0; i < 150; i++) punti.push(punto(3000))
for (let i = 0; i < 50; i++) punti.push(punto(MASSIMO))
// Almeno un corpo per tipo, e i settori attorno alle soglie dei rari.
for (const tipo of TIPI) punti.push(piuVicino({ x: 2000, y: 0, z: 0 }, tipo, 40)!)
for (const d of [24, 25, 26, 79, 80, 81, 149, 150, 151, 499, 500, 501])
  for (let i = 0; i < 4; i++) punti.push({ x: d, y: i - 2, z: c.intero(-3, 3) })

const settori = punti.map(({ x, y, z }) => [x, y, z, seedSettore(x, y, z), tipoSettore({ x, y, z })])

const rotte: number[][] = []
for (const quota of [1, 1, 1, 0.8]) {
  for (let i = 0; i < 50; i++) {
    const da = punto(60)
    const meta = { x: da.x + c.intero(-80, 80), y: da.y + c.intero(-80, 80), z: da.z + c.intero(-80, 80) }
    const carburante = Math.round(c.tra(0, 40) * 1000) / 1000
    const r = rotta(da, meta, carburante, quota)
    rotte.push([da.x, da.y, da.z, meta.x, meta.y, meta.z, carburante, quota, r.a.x, r.a.y, r.a.z, r.percorsa, r.consumo])
  }
}

writeFileSync(new URL('../src/dominio/campione.json', import.meta.url), JSON.stringify({ settori, rotte }) + '\n')
console.log(`${settori.length} settori, ${rotte.length} rotte`)
