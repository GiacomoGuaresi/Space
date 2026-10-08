// Confronta con il database i valori del bilanciamento (bilanciamento.ts contro
// `space.bilanciamento()`) e il campione fisso dell'universo
// (src/dominio/campione.json): seed, tipi, rotte e raggi dello scanner devono
// essere identici.
//
//   SUPABASE_ACCESS_TOKEN=sbp_... npm run verifica-sql
//
// Usa la Management API, con il token personale (credenziali.local, mai nel
// repo). Va lanciato dopo ogni modifica alle funzioni dell'universo, in
// TypeScript o in SQL (doc/08-deploy.md).

import { readFileSync } from 'node:fs'
import { BILANCIAMENTO } from '../src/dominio/bilanciamento.ts'
import { raggioScanner } from '../src/dominio/navigazione.ts'
import { capacitaStiva } from '../src/dominio/risorse.ts'

const PROGETTO = 'fvsohjlrulwabvfvcfxo'
const token = process.env.SUPABASE_ACCESS_TOKEN
if (!token) {
  console.error('Manca SUPABASE_ACCESS_TOKEN')
  process.exit(1)
}

const campione = JSON.parse(readFileSync(new URL('../src/dominio/campione.json', import.meta.url), 'utf8')) as {
  settori: [number, number, number, number, string | null][]
  rotte: number[][]
}

async function interroga(sql: string): Promise<Record<string, number | boolean | string>> {
  const risposta = await fetch(`https://api.supabase.com/v1/projects/${PROGETTO}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  if (!risposta.ok) throw new Error(`${risposta.status}: ${await risposta.text()}`)
  return ((await risposta.json()) as Record<string, number | boolean | string>[])[0]
}

const esitoValori = await interroga(
  `select space.bilanciamento() = '${JSON.stringify(BILANCIAMENTO)}'::jsonb as uguali, space.bilanciamento()::text as sql`,
)
const settori = campione.settori
  .map(([x, y, z, seed, tipo]) => `(${x},${y},${z},${seed},${tipo === null ? 'null' : `'${tipo}'`})`)
  .join(',')
const rotte = campione.rotte.map((r) => `(${r.join(',')})`).join(',')

const esitoSettori = await interroga(`
  select
    count(*) filter (where space.seed_settore(x, y, z) <> seed) as seed_diversi,
    count(*) filter (where space.tipo_settore(x, y, z) is distinct from tipo::text) as tipi_diversi,
    count(*) as totale
  from (values ${settori}) as c(x, y, z, seed, tipo)`)
const esitoRotte = await interroga(`
  select
    count(*) filter (
      where (r.ax, r.ay, r.az) <> (c.ax, c.ay, c.az) or r.percorsa <> c.percorsa or r.consumo <> c.consumo
    ) as rotte_diverse,
    count(*) as totale
  from (values ${rotte}) as c(dx, dy, dz, mx, my, mz, f, q, ax, ay, az, percorsa, consumo),
    lateral space.rotta(dx, dy, dz, mx, my, mz, f::double precision, q::double precision) r`)

if (!esitoValori.uguali) console.error('Bilanciamento diverso. Nel database:', esitoValori.sql)
const raggi = Array.from({ length: 30 }, (_, i) => i + 1)
  .flatMap((livello) => (['vuoto', 'nebulosa', 'pulsar'] as const).map((tipo) => [livello, tipo] as const))
  .map(([livello, tipo]) => `(${livello},'${tipo}',${raggioScanner(livello, tipo === 'vuoto' ? null : tipo)})`)
  .join(',')
const esitoRaggi = await interroga(`
  select count(*) filter (where space.raggio_scanner(l, nullif(t, 'vuoto')) <> r) as raggi_diversi, count(*) as totale
  from (values ${raggi}) as c(l, t, r)`)

const capacita = Array.from({ length: 40 }, (_, i) => `(${i + 1},${capacitaStiva(i + 1)})`).join(',')
const esitoStiva = await interroga(`
  select count(*) filter (where space.capacita_stiva(l) <> c) as capacita_diverse, count(*) as totale
  from (values ${capacita}) as v(l, c)`)

console.log('Settori', esitoSettori)
console.log('Rotte', esitoRotte)
console.log('Raggi dello scanner', esitoRaggi)
console.log('Capacità della stiva', esitoStiva)
if (
  !esitoValori.uguali ||
  esitoSettori.seed_diversi ||
  esitoSettori.tipi_diversi ||
  esitoRotte.rotte_diverse ||
  esitoRaggi.raggi_diversi ||
  esitoStiva.capacita_diverse
) {
  console.error('TypeScript e SQL non danno lo stesso universo')
  process.exit(1)
}
console.log('TypeScript e SQL concordano')
