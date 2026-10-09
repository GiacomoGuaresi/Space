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
import { aLivello, ricercaEstrattore, ritmoInsediamento } from '../src/dominio/insediamenti.ts'
import { costoLavoro, durataLavoro, STATISTICHE, STRUTTURE } from '../src/dominio/cantiere.ts'
import { bottinoCometa, capacitaStiva, ritmoMano } from '../src/dominio/risorse.ts'
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
const livelli = [
  [1.5, 1.13],
  [252, 1.45],
  [60, 1.45],
].flatMap(([base, crescita]) => Array.from({ length: 30 }, (_, i) => `(${base},${crescita},${i + 1},${aLivello(base, crescita, i + 1)})`))
const esitoLivelli = await interroga(`
  select count(*) filter (where space.a_livello(b, c, l) <> v) as livelli_diversi, count(*) as totale
  from (values ${livelli.join(',')}) as t(b, c, l, v)`)
// Costi e tempi del cantiere, per ogni lavoro, livello e cantiere.
const lavori: string[] = []
for (const lavoro of [...STATISTICHE, ...STRUTTURE]) {
  for (let livello = 2; livello <= 25; livello++) {
    for (const cantiere of [0, 1, 3]) {
      lavori.push(
        `('${lavoro}',${livello},${cantiere},'${JSON.stringify(costoLavoro(lavoro, livello))}'::jsonb,${durataLavoro(lavoro, livello, cantiere)})`,
      )
    }
  }
}
const esitoCantiere = await interroga(`
  select
    count(*) filter (where abs(space.durata_lavoro(l, v, c) - d) > 1e-12 * d) as durate_diverse,
    count(*) filter (
      where (select count(*) from jsonb_object_keys(space.costo_lavoro(l, v))) <> (select count(*) from jsonb_object_keys(costo))
        or exists (
          select 1 from jsonb_each_text(costo) e
          where abs((space.costo_lavoro(l, v) ->> e.key)::double precision - e.value::double precision) > 1e-9 * e.value::double precision
        )
    ) as costi_diversi,
    count(*) as totale
  from (values ${lavori.join(',')}) as t(l, v, c, costo, d)`)
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
    const ritmo = ritmoMano(corpo) ?? bottinoCometa(corpo)
    corpi.push(
      `(${c.x},${c.y},${c.z},${corpo.ricchezza},${sotto ? `'${sotto}'` : 'null'},${pianeti}::text[],${ritmo ? `'${JSON.stringify(ritmo)}'` : 'null'}::jsonb)`,
    )
  }
}
// La produzione delle colonie, pianeta per pianeta, ai primi livelli.
const colonie: string[] = []
for (const riga of corpi) {
  const [x, y, z] = riga.slice(1).split(',').map(Number)
  const d = settore({ x, y, z }).corpo!.dettagli
  if (d.tipo !== 'sistema') continue
  d.pianeti.forEach((_, p) => {
    for (const livello of [1, 2, 7]) {
      const ritmo = ritmoInsediamento({ tipo: 'base', coordinate: { x, y, z }, pianeta: p, produzione: livello })
      colonie.push(`(${x},${y},${z},'base',${p},${livello},'${JSON.stringify(ritmo)}'::jsonb)`)
    }
  })
}
// E quella degli estrattori, sui corpi dove si fondano.
for (const riga of corpi) {
  const [x, y, z] = riga.slice(1).split(',').map(Number)
  const tipo = tipoSettore({ x, y, z })
  if (!tipo || !ricercaEstrattore(tipo)) continue
  for (const livello of [1, 3]) {
    const ritmo = ritmoInsediamento({ tipo: 'estrattore', coordinate: { x, y, z }, pianeta: null, produzione: livello })
    colonie.push(`(${x},${y},${z},'estrattore',null,${livello},'${JSON.stringify(ritmo)}'::jsonb)`)
  }
}
const esitoColonie = await interroga(`
  select count(*) filter (
    where exists (
      select 1 from jsonb_each_text(ritmo) e
      where abs((space.ritmo_insediamento(row(0, null, x, y, z, t, p, now(), now(), '{}', l, 1, 0, 0, 0, 0, '{}')::space.insediamento, l) ->> e.key)::double precision
        - e.value::double precision) > 1e-9 * e.value::double precision
    )
      or (select count(*) from jsonb_object_keys(space.ritmo_insediamento(row(0, null, x, y, z, t, p, now(), now(), '{}', l, 1, 0, 0, 0, 0, '{}')::space.insediamento, l)))
        <> (select count(*) from jsonb_object_keys(ritmo))
  ) as colonie_diverse, count(*) as totale
  from (values ${colonie.join(',')}) as c(x, y, z, t, p, l, ritmo)`)
const esitoCorpi = await interroga(`
  select
    count(*) filter (where space.ricchezza(x, y, z) <> ricchezza) as ricchezze_diverse,
    count(*) filter (where space.sottotipo(x, y, z) is distinct from sotto) as sottotipi_diversi,
    count(*) filter (where space.pianeti(x, y, z) is distinct from pianeti) as pianeti_diversi,
    -- Ritmi della raccolta a mano, o bottino delle comete. jsonb tiene 15 cifre
    -- significative: si confrontano a meno di un miliardesimo.
    count(*) filter (
      where (coalesce(space.ritmo_mano(x, y, z), space.bottino_cometa(x, y, z)) is null) <> (ritmo is null)
        or (select array_agg(k order by k) from jsonb_object_keys(coalesce(space.ritmo_mano(x, y, z), space.bottino_cometa(x, y, z))) k)
          is distinct from (select array_agg(k order by k) from jsonb_object_keys(ritmo) k)
        or exists (
          select 1 from jsonb_each_text(ritmo) e
          where abs((coalesce(space.ritmo_mano(x, y, z), space.bottino_cometa(x, y, z)) ->> e.key)::double precision - e.value::double precision) > 1e-9 * e.value::double precision
        )
    ) as ritmi_diversi,
    count(*) as totale
  from (values ${corpi.join(',')}) as c(x, y, z, ricchezza, sotto, pianeti, ritmo)`)

console.log('Settori', esitoSettori)
console.log('Rotte', esitoRotte)
console.log('Raggi dello scanner', esitoRaggi)
console.log('Capacità della stiva', esitoStiva)
console.log('Crescita per livello', esitoLivelli)
console.log('Cantiere', esitoCantiere)
console.log('Corpi con risorse', esitoCorpi)
console.log('Produzione di colonie ed estrattori', esitoColonie)
if (
  !esitoValori.uguali ||
  esitoSettori.seed_diversi ||
  esitoSettori.tipi_diversi ||
  esitoRotte.rotte_diverse ||
  esitoRaggi.raggi_diversi ||
  esitoStiva.capacita_diverse ||
  esitoLivelli.livelli_diversi ||
  esitoCantiere.durate_diverse ||
  esitoCantiere.costi_diversi ||
  esitoColonie.colonie_diverse ||
  esitoCorpi.ricchezze_diverse ||
  esitoCorpi.sottotipi_diversi ||
  esitoCorpi.pianeti_diversi ||
  esitoCorpi.ritmi_diversi
) {
  console.error('TypeScript e SQL non danno lo stesso universo')
  process.exit(1)
}
console.log('TypeScript e SQL concordano')
