// Il diario di bordo (doc/11-interfaccia.md#diario-di-bordo): la cronologia di
// ciò che è successo, ricostruita ogni volta da viaggi, scoperte, scansioni e
// stato della nave. Non si salva nulla, salvo fin dove l'hai già letto.

import { createContext, useSyncExternalStore } from 'react'
import type { Costruzione, Prelievo, Raccolto, RicercaAvviata, Scansione, Scoperta } from '../dati'
import { NOMI_LAVORI } from '../dominio/cantiere'
import { RICERCHE, type IdRicerca } from '../dominio/ricerche'
import { coordinateBasi, pienoIl, ritmoInsediamento, type Insediamento } from '../dominio/insediamenti'
import { NOMI_RISORSE } from '../dominio/catalogo'
import { RISORSE } from '../dominio/risorse'
import { CATALOGO, type TipoCorpo } from '../dominio/catalogo'
import {
  carburanteOra,
  inViaggio,
  ricaricaQui,
  scansione,
  tettoQui,
  tipiRilevabili,
  type Dintorni,
  type Nave,
  type Viaggio,
} from '../dominio/navigazione'
import { BASE, distanza, settore, stessoSettore, type Coordinate } from '../dominio/settore'
import { coordinatePlancia, numero, orario } from './formato'

export type TipoVoce =
  'partenza' | 'arrivo' | 'sosta' | 'ricarica' | 'rilevato' | 'scoperto' | 'raccolto' | 'fondazione' | 'pieno' | 'lavoro' | 'ricerca'

export interface Voce {
  quando: Date
  tipo: TipoVoce
  testo: string
  /** Il nome breve, per i gruppi: "3 arrivi: Kumion, Talir, Odressa". */
  breve: string
}

/** L'ultima voce e quante novità ci sono, per la barra di stato del PC: le calcola l'App. */
export const UltimaVoce = createContext<{ voce: Voce | null; nuove: number }>({ voce: null, nuove: 0 })

/** Il diario tiene gli ultimi 30 giorni. */
export const GIORNI_DIARIO = 30
const ORA_MS = 3_600_000

export const NOMI_VOCI: Readonly<Record<TipoVoce, { uno: string; tanti: string }>> = {
  partenza: { uno: 'Partenza', tanti: 'partenze' },
  arrivo: { uno: 'Arrivo', tanti: 'arrivi' },
  sosta: { uno: 'Sosta forzata', tanti: 'soste forzate' },
  ricarica: { uno: 'Nave', tanti: 'ricariche' },
  rilevato: { uno: 'Rilevato', tanti: 'corpi rilevati' },
  scoperto: { uno: 'Scoperta', tanti: 'nuovi nel catalogo' },
  raccolto: { uno: 'Raccolta', tanti: 'raccolte' },
  fondazione: { uno: 'Fondazione', tanti: 'fondazioni' },
  pieno: { uno: 'Magazzino pieno', tanti: 'magazzini pieni' },
  lavoro: { uno: 'Cantiere', tanti: 'lavori finiti' },
  ricerca: { uno: 'Ricerca', tanti: 'ricerche completate' },
}

/** Come si chiama un settore nel diario: il nome del corpo, la base madre o le coordinate. */
function luogo(c: Coordinate): { lungo: string; breve: string } {
  if (stessoSettore(c, BASE)) return { lungo: 'base madre', breve: 'base madre' }
  const { corpo } = settore(c)
  if (!corpo) return { lungo: `${coordinatePlancia(c)}, spazio vuoto`, breve: coordinatePlancia(c) }
  return { lungo: `${corpo.nome} (${coordinatePlancia(c)}), ${CATALOGO[corpo.tipo].nome.toLowerCase()}`, breve: corpo.nome }
}

const chiave = ({ x, y, z }: Coordinate) => `${x},${y},${z}`

interface Fonti {
  viaggi: readonly Viaggio[]
  scoperte: readonly Scoperta[]
  scansioni: readonly Scansione[]
  raccolti: readonly Raccolto[]
  prelievi: readonly Prelievo[]
  insediamenti: readonly Insediamento[]
  costruzioni?: readonly Costruzione[]
  ricerche?: readonly RicercaAvviata[]
  /** Le ricerche completate: cambiano i tetti dei magazzini. */
  fatte?: ReadonlySet<string>
  nave: Nave
  ora: Date
}

/** Le voci dei viaggi: partenze, arrivi e soste forzate già successi. */
function vociViaggi(viaggi: readonly Viaggio[], ora: Date): Voce[] {
  const voci: Voce[] = []
  // La prima fionda apre la sua pagina della wiki.
  const primaFionda = [...viaggi].sort((a, b) => a.partenza.getTime() - b.partenza.getTime()).find((v) => v.fionda)
  for (const v of viaggi) {
    if (v.partenza <= ora) {
      voci.push({
        quando: v.partenza,
        tipo: 'partenza',
        testo: `Verso ${coordinatePlancia(v.meta)}, arrivo ${orario(v.arrivo, v.partenza)}${v.fionda ? ' · fionda gravitazionale' : ''}${
          v.ponte ? ' · ponte di curvatura' : ''
        }.${
          v === primaFionda ? ' Nuova pagina della wiki: Fionda gravitazionale.' : ''
        }`,
        breve: coordinatePlancia(v.meta),
      })
    }
    if (v.arrivo > ora) continue
    const dove = luogo(v.a)
    if (stessoSettore(v.a, v.meta)) {
      voci.push({ quando: v.arrivo, tipo: 'arrivo', testo: `Arrivo: ${dove.lungo}.`, breve: dove.breve })
    } else {
      voci.push({
        quando: v.arrivo,
        tipo: 'sosta',
        testo: `Carburante finito: nave ferma in ${dove.lungo}, a ${numero(distanza(v.a, v.meta), 1)} sett. dalla meta.`,
        breve: dove.breve,
      })
    }
  }
  return voci
}

/** La ricarica completata della sosta in corso, se è già arrivata al tetto. */
function vociRicarica(nave: Nave, ora: Date, dintorni: Dintorni): Voce[] {
  if (inViaggio(nave, ora)) return []
  const tetto = tettoQui(nave, nave.posizione, dintorni)
  if (nave.carburante >= tetto || carburanteOra(nave, ora, dintorni) < tetto) return []
  const quando = new Date(nave.dal.getTime() + ((tetto - nave.carburante) / ricaricaQui(nave, nave.posizione, dintorni)) * ORA_MS)
  const percento = Math.round((tetto / nave.serbatoio) * 100)
  const dove = luogo(nave.posizione)
  return [
    {
      quando,
      tipo: 'ricarica',
      testo: `Ricarica completata: ${numero(tetto, 1)} di carburante (${percento} % del serbatoio) a ${dove.breve}.`,
      breve: dove.breve,
    },
  ]
}

/** Le scoperte: ogni corpo nuovo nel catalogo, e il primo di ogni tipo. */
function vociScoperte(scoperte: readonly Scoperta[]): Voce[] {
  const primi = new Map<TipoCorpo, Scoperta>()
  for (const s of scoperte) {
    const primo = primi.get(s.tipo)
    if (!primo || s.scoperta < primo.scoperta) primi.set(s.tipo, s)
  }
  return scoperte.map((s) => {
    const nome = settore(s.coordinate).corpo?.nome ?? coordinatePlancia(s.coordinate)
    const tipo = CATALOGO[s.tipo].nome.toLowerCase()
    return {
      quando: s.scoperta,
      tipo: 'scoperto',
      testo: primi.get(s.tipo) === s ? `Primo nel catalogo di questo tipo: ${nome}, ${tipo}.` : `Nuovo nel catalogo: ${nome}, ${tipo}.`,
      breve: nome,
    }
  })
}

/**
 * I corpi rilevati dallo scanner, solo le novità: i rari e il primo di ogni
 * tipo. Le soste si ripercorrono in ordine, ricordando cosa si era già visto.
 */
function vociRilevamenti(scansioni: readonly Scansione[]): Voce[] {
  const visti = new Set<string>()
  const tipiVisti = new Set<TipoCorpo>()
  const voci: Voce[] = []
  for (const s of [...scansioni].sort((a, b) => a.istante.getTime() - b.istante.getTime())) {
    for (const { coordinate, tipo } of scansione(s.centro, s.raggio, tipiRilevabili(s.livello))) {
      const k = chiave(coordinate)
      if (visti.has(k)) continue
      visti.add(k)
      const { rarita, nome } = CATALOGO[tipo]
      const raro = rarita === 'rara' || rarita === 'leggendaria'
      const primo = !tipiVisti.has(tipo)
      if (!raro && !primo) continue
      tipiVisti.add(tipo)
      voci.push({
        quando: s.istante,
        tipo: 'rilevato',
        testo: `${nome} (${rarita}) in ${coordinatePlancia(coordinate)}, a ${numero(distanza(coordinate, BASE), 1)} sett. dalla base madre.${
          primo ? ` Nuova pagina della wiki: ${nome}.` : ''
        }`,
        breve: nome.toLowerCase(),
      })
    }
  }
  return voci
}

/** I bottini presi all'arrivo, con quello che è entrato nella stiva. */
function vociRaccolti(raccolti: readonly Raccolto[]): Voce[] {
  return raccolti.map((r) => {
    const dove = luogo(r.coordinate)
    const preso = RISORSE.filter((k) => (r.bottino[k] ?? 0) > 0)
      .map((k) => `+${numero(r.bottino[k]!, 0)} ${NOMI_RISORSE[k]}`)
      .join(', ')
    return {
      quando: r.istante,
      tipo: 'raccolto',
      testo: preso
        ? `Bottino di ${dove.breve}: ${preso}. Quello che non entrava nella stiva è perso.`
        : `Bottino di ${dove.breve}: la stiva era già piena.`,
      breve: dove.breve,
    }
  })
}

/** I magazzini passati nella stiva, arrivando o ripartendo da un insediamento. */
function vociPrelievi(prelievi: readonly Prelievo[], insediamenti: readonly Insediamento[]): Voce[] {
  return prelievi.flatMap((p) => {
    const insediamento = insediamenti.find((i) => i.id === p.insediamento)
    if (!insediamento) return []
    const dove = luogo(insediamento.coordinate)
    const preso = RISORSE.filter((k) => (p.preso[k] ?? 0) > 0)
      .map((k) => `+${numero(p.preso[k]!, 0)} ${NOMI_RISORSE[k]}`)
      .join(', ')
    return [{ quando: p.istante, tipo: 'raccolto' as const, testo: `Magazzino di ${dove.breve} nella stiva: ${preso}.`, breve: dove.breve }]
  })
}

/** Le fondazioni delle basi e i magazzini arrivati al tetto. */
function vociInsediamenti(insediamenti: readonly Insediamento[], fatte: ReadonlySet<string>): Voce[] {
  return insediamenti.flatMap((i) => {
    const dove = luogo(i.coordinate)
    const voci: Voce[] = []
    if (i.tipo === 'base') {
      const d = settore(i.coordinate).corpo?.dettagli
      const pianeta = d?.tipo === 'sistema' && i.pianeta !== null ? d.pianeti[i.pianeta] : null
      voci.push({
        quando: i.fondazione,
        tipo: 'fondazione',
        testo: `Fondata la base su ${dove.breve}${pianeta ? `, pianeta ${pianeta.nome} (${pianeta.tipo})` : ''}. Nuova voce nella Rete.`,
        breve: dove.breve,
      })
    } else if (i.tipo === 'estrattore') {
      voci.push({
        quando: i.fondazione,
        tipo: 'fondazione',
        testo: `Fondato un estrattore su ${dove.lungo}. Nuova voce nella Rete.`,
        breve: dove.breve,
      })
    }
    // Senza produzione (un pianeta che non c'è) non si riempie mai.
    if (Object.keys(ritmoInsediamento(i)).length === 0) return voci
    voci.push({
      quando: pienoIl(i, fatte),
      tipo: 'pieno',
      testo: `Magazzino pieno: ${i.tipo === 'madre' ? 'base madre' : dove.breve}. La produzione è ferma finché non passi a raccogliere.`,
      breve: i.tipo === 'madre' ? 'base madre' : dove.breve,
    })
    return voci
  })
}

/** I lavori del cantiere finiti e le ricerche completate. */
function vociLaboratorio(
  costruzioni: readonly Costruzione[],
  ricerche: readonly RicercaAvviata[],
  insediamenti: readonly Insediamento[],
): Voce[] {
  return [
    ...costruzioni.map((c): Voce => {
      const i = insediamenti.find((k) => k.id === c.insediamento)
      const dove = i ? (i.tipo === 'madre' ? 'base madre' : luogo(i.coordinate).breve) : 'base'
      return {
        quando: c.fine,
        tipo: 'lavoro',
        testo: `${NOMI_LAVORI[c.lavoro]} ${c.livello} pronto${c.coda === 'nave' ? ': la nave può ripartire' : `, a ${dove}`}.`,
        breve: `${NOMI_LAVORI[c.lavoro].toLowerCase()} ${c.livello}`,
      }
    }),
    ...ricerche.map((r): Voce => {
      const nodo = RICERCHE[r.nodo as IdRicerca]
      return {
        quando: r.fine,
        tipo: 'ricerca',
        testo: nodo ? `Ricerca completata: ${nodo.nome}. ${nodo.effetto}.` : `Ricerca completata: ${r.nodo}.`,
        breve: nodo?.nome ?? r.nodo,
      }
    }),
  ]
}

/** Tutte le voci degli ultimi 30 giorni già successe, dalla più recente. */
export function vociDiario({
  viaggi,
  scoperte,
  scansioni,
  raccolti,
  prelievi,
  insediamenti,
  costruzioni = [],
  ricerche = [],
  fatte = new Set(),
  nave,
  ora,
}: Fonti): Voce[] {
  const dal = ora.getTime() - GIORNI_DIARIO * 24 * ORA_MS
  return [
    ...vociViaggi(viaggi, ora),
    ...vociRicarica(nave, ora, { fatte, basi: coordinateBasi(insediamenti) }),
    ...vociScoperte(scoperte),
    ...vociRilevamenti(scansioni),
    ...vociRaccolti(raccolti),
    ...vociPrelievi(prelievi, insediamenti),
    ...vociInsediamenti(insediamenti, fatte),
    ...vociLaboratorio(costruzioni, ricerche, insediamenti),
  ]
    .filter((v) => v.quando.getTime() >= dal && v.quando <= ora)
    .sort((a, b) => b.quando.getTime() - a.quando.getTime())
}

/** Una novità è ciò che è successo dopo l'ultima lettura, tranne le partenze: quelle le hai decise tu. */
export function novita(voce: Voce, letto: Date | null): boolean {
  return voce.tipo !== 'partenza' && (!letto || voce.quando > letto)
}

/** Le voci consecutive dello stesso tipo stanno in un gruppo, che si apre al tocco. */
export function raggruppa(voci: readonly Voce[]): Voce[][] {
  const gruppi: Voce[][] = []
  for (const v of voci) {
    const ultimo = gruppi.at(-1)
    if (ultimo && ultimo[0].tipo === v.tipo) ultimo.push(v)
    else gruppi.push([v])
  }
  return gruppi
}

const ascoltatori = new Set<() => void>()
let ultimoLetto: { valore: string | null; data: Date | null } = { valore: null, data: null }

/** Fin dove hai letto, come stato React: cambia quando lo segni. */
export function useLetto(): Date | null {
  return useSyncExternalStore(
    (avvisa) => {
      ascoltatori.add(avvisa)
      return () => ascoltatori.delete(avvisa)
    },
    () => {
      // Lo stesso oggetto finché il valore non cambia: React confronta per identità.
      const data = letto()
      const valore = data?.toISOString() ?? null
      if (valore !== ultimoLetto.valore) ultimoLetto = { valore, data }
      return ultimoLetto.data
    },
  )
}

const CHIAVE = 'space_diario_letto'
// Prima del diario c'era il riepilogo, con la sua ultima visita.
const CHIAVE_VECCHIA = 'space_ultima_visita'

/** Fin dove hai letto il diario su questo dispositivo, o `null` se mai. */
export function letto(): Date | null {
  try {
    const valore = localStorage.getItem(CHIAVE) ?? localStorage.getItem(CHIAVE_VECCHIA)
    return valore ? new Date(valore) : null
  } catch {
    return null
  }
}

export function segnaLetto(fino: Date) {
  try {
    const prima = letto()
    if (prima && prima >= fino) return
    localStorage.setItem(CHIAVE, fino.toISOString())
    localStorage.removeItem(CHIAVE_VECCHIA)
    for (const avvisa of ascoltatori) avvisa()
  } catch {
    // Senza memoria locale il diario mostra tutto come novità: pazienza.
  }
}
