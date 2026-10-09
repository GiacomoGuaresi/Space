// Il ritmo vero contro quello atteso (doc/09-bilanciamento.md#ritmo-atteso):
// legge dal database i dati di ogni giocatore e li mette accanto alla tabella,
// interpolata al suo giorno di gioco. Serve a rifinire il bilanciamento (M10.2)
// quando ci saranno settimane di gioco vero.
//
//   SUPABASE_ACCESS_TOKEN=sbp_... npm run ritmo
//
// Usa la Management API, con il token personale (credenziali.local, mai nel
// repo), e legge soltanto.

const PROGETTO = 'fvsohjlrulwabvfvcfxo'
const token = process.env.SUPABASE_ACCESS_TOKEN
if (!token) {
  console.error('Manca SUPABASE_ACCESS_TOKEN')
  process.exit(1)
}

// La tabella del ritmo atteso: giorno, livello della nave, settori al giorno, frontiera, basi, estrattori,
// ricerche, livello più lungo in ore. Tenerla uguale a doc/09.
const ATTESO: readonly [number, number, number, number, number, number, number, number][] = [
  [1, 1, 3.5, 0, 1, 0, 0, 0],
  [30, 5.5, 5.5, 24, 2, 3, 2, 5],
  [60, 9, 8.7, 63, 4, 5, 10, 12],
  [90, 13, 13.6, 128, 4, 7, 14, 1.3 * 24],
  [180, 17, 21.5, 502, 6, 9, 22, 3.3 * 24],
  [365, 20, 30, 1640, 6, 9, 30, 6 * 24],
]

/** La riga attesa al giorno `giorno`, interpolando in modo lineare tra le righe della tabella. */
function attesoAl(giorno: number): number[] {
  const dopo = ATTESO.findIndex((r) => r[0] >= giorno)
  if (dopo <= 0) return [...(dopo === 0 ? ATTESO[0] : ATTESO.at(-1)!)]
  const [a, b] = [ATTESO[dopo - 1], ATTESO[dopo]]
  const t = (giorno - a[0]) / (b[0] - a[0])
  return a.map((v, i) => v + (b[i] - v) * t)
}

const risposta = await fetch(`https://api.supabase.com/v1/projects/${PROGETTO}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: `
      select
        n.giocatore,
        greatest(1, extract(epoch from now() - coalesce((select min(v.partenza) from space.viaggio v where v.giocatore = n.giocatore), now())) / 86400) as giorno,
        (n.liv_motore + n.liv_serbatoio + n.liv_ricarica) / 3.0 as livello,
        coalesce((select sum(space.distanza(v.da_x, v.da_y, v.da_z, v.a_x, v.a_y, v.a_z)) from space.viaggio v
          where v.giocatore = n.giocatore and v.arrivo <= now() and not v.wormhole), 0) as percorsi,
        coalesce((select max(space.distanza(v.a_x, v.a_y, v.a_z, 0, 0, 0)) from space.viaggio v
          where v.giocatore = n.giocatore and v.arrivo <= now()), 0) as frontiera,
        (select count(*) from space.insediamento i where i.giocatore = n.giocatore and i.tipo = 'base') as basi,
        (select count(*) from space.insediamento i where i.giocatore = n.giocatore and i.tipo = 'estrattore') as estrattori,
        (select count(*) from space.ricerca r where r.giocatore = n.giocatore and r.fine <= now()) as ricerche,
        coalesce((select max(extract(epoch from c.fine - c.inizio)) / 3600 from space.costruzione c
          where c.giocatore = n.giocatore and c.coda = 'nave' and c.lavoro <> 'stiva'), 0) as piu_lungo
      from space.nave n`,
  }),
})
if (!risposta.ok) throw new Error(`${risposta.status}: ${await risposta.text()}`)
const righe = (await risposta.json()) as Record<string, number | string>[]

const uno = (v: number, cifre = 1) => v.toLocaleString('it-IT', { maximumFractionDigits: cifre })
for (const r of righe) {
  const giorno = Number(r.giorno)
  const atteso = attesoAl(giorno)
  console.log(`\nGiocatore ${String(r.giocatore).slice(0, 8)}… · giorno ${uno(giorno)}`)
  const confronto: [string, number, number][] = [
    ['Livello medio della nave', Number(r.livello), atteso[1]],
    ['Settori al giorno', Number(r.percorsi) / giorno, atteso[2]],
    ['Frontiera', Number(r.frontiera), atteso[3]],
    ['Basi (colonie)', Number(r.basi), atteso[4]],
    ['Estrattori', Number(r.estrattori), atteso[5]],
    ['Ricerche', Number(r.ricerche), atteso[6]],
    ['Livello più lungo (ore)', Number(r.piu_lungo), atteso[7]],
  ]
  for (const [nome, vero, previsto] of confronto) {
    const scarto = previsto > 0 ? ` (${vero >= previsto ? '+' : ''}${uno(((vero - previsto) / previsto) * 100, 0)} %)` : ''
    console.log(`  ${nome.padEnd(26)} ${uno(vero).padStart(8)}   atteso ${uno(previsto).padStart(8)}${scarto}`)
  }
}
if (righe.length === 0) console.log('Nessuna nave nel database.')
