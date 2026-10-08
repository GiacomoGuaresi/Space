// Confronta con il database i valori del bilanciamento (bilanciamento.ts contro
// `space.bilanciamento()`) e il campione fisso dell'universo
// (src/dominio/campione.json): seed, tipi, rotte e raggi dello scanner devono
// essere identici. In più ricchezza, sottotipo, pianeti e raccolta a mano su
// un campione di corpi con risorse, calcolato qui.
//
//   SUPABASE_ACCESS_TOKEN=sbp_... npm run verifica-sql
//
// Usa la Management API, con il token personale (credenziali.local, mai nel
// repo). Va lanciato dopo ogni modifica alle funzioni dell'universo, in
// TypeScript o in SQL (doc/08-deploy.md).

import { readFileSync } from 'node:fs'
import { BILANCIAMENTO } from '../src/dominio/bilanciamento.ts'
import { raggioScanner } from '../src/dominio/navigazione.ts'
import { capacitaStiva, ritmoMano } from '../src/dominio/risorse.ts'
import { settore, tipoSettore } from '../src/dominio/settore.ts'
import { sottotipo } from '../src/dominio/sottotipi.ts'

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

// I primi 40 corpi di ogni tipo con risorse, lungo tre rette: abbastanza sistemi da provare i pianeti.
const corpi: string[] = []
for (const tipo of ['asteroidi', 'nebulosa', 'gigante', 'sistema', 'stella', 'cometa'] as const) {
  let trovati = 0
  for (let i = 1; trovati < 40 && i < 20000; i++) {
    const c = i % 3 === 0 ? { x: i, y: 7, z: -3 } : i % 3 === 1 ? { x: -5, y: i, z: 11 } : { x: 2, y: -9, z: -i }
    if (tipoSettore(c) !== tipo) continue
    trovati++
    const corpo = settore(c).corpo!
    const d = corpo.dettagli
    const sotto = d.tipo === 'asteroidi' || d.tipo === 'gigante' ? sottotipo(d) : null
    const pianeti = d.tipo === 'sistema' ? `'{${d.pianeti.map((p) => p.tipo).join(',')}}'` : 'null'
    const ritmo = ritmoMano(corpo)
    corpi.push(
      `(${c.x},${c.y},${c.z},${corpo.ricchezza},${sotto ? `'${sotto}'` : 'null'},${pianeti}::text[],${ritmo ? `'${JSON.stringify(ritmo)}'` : 'null'}::jsonb)`,
    )
  }
}
const esitoCorpi = await interroga(`
  select
    count(*) filter (where space.ricchezza(x, y, z) <> ricchezza) as ricchezze_diverse,
    count(*) filter (where space.sottotipo(x, y, z) is distinct from sotto) as sottotipi_diversi,
    count(*) filter (where space.pianeti(x, y, z) is distinct from pianeti) as pianeti_diversi,
    -- jsonb tiene 15 cifre significative: i ritmi si confrontano a meno di un miliardesimo.
    count(*) filter (
      where (space.ritmo_mano(x, y, z) is null) <> (ritmo is null)
        or (select array_agg(k order by k) from jsonb_object_keys(space.ritmo_mano(x, y, z)) k)
          is distinct from (select array_agg(k order by k) from jsonb_object_keys(ritmo) k)
        or exists (
          select 1 from jsonb_each_text(ritmo) e
          where abs((space.ritmo_mano(x, y, z) ->> e.key)::double precision - e.value::double precision) > 1e-9 * e.value::double precision
        )
    ) as ritmi_diversi,
    count(*) as totale
  from (values ${corpi.join(',')}) as c(x, y, z, ricchezza, sotto, pianeti, ritmo)`)

console.log('Settori', esitoSettori)
console.log('Rotte', esitoRotte)
console.log('Raggi dello scanner', esitoRaggi)
console.log('Capacità della stiva', esitoStiva)
console.log('Corpi con risorse', esitoCorpi)
if (
  !esitoValori.uguali ||
  esitoSettori.seed_diversi ||
  esitoSettori.tipi_diversi ||
  esitoRotte.rotte_diverse ||
  esitoRaggi.raggi_diversi ||
  esitoStiva.capacita_diverse ||
  esitoCorpi.ricchezze_diverse ||
  esitoCorpi.sottotipi_diversi ||
  esitoCorpi.pianeti_diversi ||
  esitoCorpi.ritmi_diversi
) {
  console.error('TypeScript e SQL non danno lo stesso universo')
  process.exit(1)
}
console.log('TypeScript e SQL concordano')
