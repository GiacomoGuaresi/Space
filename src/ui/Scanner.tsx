import { useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { IconaFatto, IconaScanner } from './icone'
import { BILANCIAMENTO } from '../dominio/bilanciamento'
import { CATALOGO, type Rarita, type TipoCorpo } from '../dominio/catalogo'
import { raggioQui, tipiRilevabili, type Rilevamento } from '../dominio/navigazione'
import { nomeSottotipo } from '../dominio/sottotipi'
import { settore, tipoSettore, type Coordinate } from '../dominio/settore'
import { CaricoAttuale } from './SchedaNave'
import { coordinatePlancia, numero } from './formato'
import { MenuContesto, menuCorpo, type Menu } from './MenuContesto'
import { Caricamento, Etichetta, SimboloRarita } from './plancia'
import { useScansione, type Lavoro } from './scansioni'
import { usePC } from './schermo'

/** Le righe aggiunte alla volta, scorrendo: allo scanner alto i corpi sono decine di migliaia. */
const PAGINA = 100

const RARITA: readonly Rarita[] = ['leggendaria', 'rara', 'non comune', 'comune']
const PESO_RARITA: Readonly<Record<Rarita, number>> = { comune: 0, 'non comune': 1, rara: 2, leggendaria: 3 }
const NOMI_RARITA: Readonly<Record<Rarita, string>> = {
  comune: 'Comuni',
  'non comune': 'Non comuni',
  rara: 'Rare',
  leggendaria: 'Leggendarie',
}

type Ordine = 'distanza' | 'rarita' | 'ricchezza'
const NOMI_ORDINE: Readonly<Record<Ordine, string>> = { distanza: 'Vicini', rarita: 'Rari', ricchezza: 'Ricchi' }

interface Props {
  centro: Coordinate
  /** Il livello dello scanner: decide raggio e tipi rilevati. */
  livello: number
  /** Le chiavi "x,y,z" dei settori già scoperti. */
  scoperti: ReadonlySet<string>
  onScegli: (meta: Coordinate) => void
}

const chiaveDi = ({ x, y, z }: Coordinate) => `${x},${y},${z}`

/**
 * I corpi attorno alla nave (doc/11-interfaccia.md#scanner). In cima il
 * raggio e il totale; a sinistra i filtri (rarità, tipo, da scoprire); a
 * destra l'elenco in colonne, che si allunga scorrendo. Se la finestra è
 * stretta i filtri si aprono da un tasto. Lo scanner vede il tipo, non il
 * nome: quello si scopre arrivando.
 */
export function Scanner({ centro, livello, scoperti, onScegli }: Props) {
  const tipoQui = tipoSettore(centro)
  const fatte = useContext(CaricoAttuale)?.fatte
  const raggio = raggioQui(livello, centro, fatte)
  const filtriNebulari = tipoQui === 'nebulosa' && (fatte?.has('S5') ?? false)
  const tipi = useMemo(() => tipiRilevabili(livello), [livello])
  // *Rilevamento gravitazionale* (S10): buchi neri e wormhole al doppio del raggio, solo nello scanner dal vivo.
  const gravitazionale = fatte?.has('S10') ? raggio * BILANCIAMENTO.ricerche.effetti.S10 : raggio
  // La scansione la fa il worker (ui/scansioni.ts): con uno scanner alto ci vuole qualche secondo.
  const { x, y, z } = centro
  const lavoro = useMemo<Lavoro>(
    () => ({ tipo: 'scansione', centro: { x, y, z }, raggio, tipi: [...tipi], gravitazionale }),
    [x, y, z, raggio, tipi, gravitazionale],
  )
  const { valore: trovati, avanzamento } = useScansione<Rilevamento[]>(lavoro, { priorita: 'alta', canale: 'scanner' })
  const pc = usePC()
  const spettrometria = fatte?.has('S2') ?? false
  // *Analisi stellare* (S6): i sottotipi dei corpi rilevati.
  const analisi = fatte?.has('S6') ?? false
  const [menu, setMenu] = useState<Menu | null>(null)
  const chiudiMenu = useCallback(() => setMenu(null), [])

  const [tipo, setTipo] = useState<TipoCorpo | null>(null)
  const [rarita, setRarita] = useState<Rarita | null>(null)
  const [nuovi, setNuovi] = useState(false)
  const [ordine, setOrdine] = useState<Ordine>('distanza')
  const [aperti, setAperti] = useState(false)
  const [quanti, setQuanti] = useState(PAGINA)
  const elencoRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    setQuanti(PAGINA)
    elencoRef.current?.scrollTo({ top: 0 })
  }, [lavoro, tipo, rarita, nuovi, ordine])

  // I conteggi, sull'intera scansione.
  const conti = useMemo(() => {
    const perRarita: Record<Rarita, number> = { comune: 0, 'non comune': 0, rara: 0, leggendaria: 0 }
    const perTipo = new Map<TipoCorpo, number>()
    let daScoprire = 0
    for (const r of trovati ?? []) {
      perRarita[CATALOGO[r.tipo].rarita]++
      perTipo.set(r.tipo, (perTipo.get(r.tipo) ?? 0) + 1)
      if (!scoperti.has(chiaveDi(r.coordinate))) daScoprire++
    }
    // I tipi dal più raro, poi dal più frequente.
    const tipiTrovati = [...perTipo.entries()].sort(
      ([a, na], [b, nb]) => PESO_RARITA[CATALOGO[b].rarita] - PESO_RARITA[CATALOGO[a].rarita] || nb - na,
    )
    return { perRarita, tipiTrovati, daScoprire }
  }, [trovati, scoperti])

  // L'elenco filtrato e ordinato. La scansione arriva già dal più vicino.
  const elenco = useMemo(() => {
    if (!trovati) return []
    const scelti = trovati.filter(
      (r) =>
        (tipo === null || r.tipo === tipo) &&
        (rarita === null || CATALOGO[r.tipo].rarita === rarita) &&
        (!nuovi || !scoperti.has(chiaveDi(r.coordinate))),
    )
    if (ordine === 'rarita')
      return scelti.sort((a, b) => PESO_RARITA[CATALOGO[b.tipo].rarita] - PESO_RARITA[CATALOGO[a.tipo].rarita] || a.distanza - b.distanza)
    if (ordine === 'ricchezza')
      // Il settore pesa: si calcola una volta per corpo.
      return scelti
        .map((r) => ({ r, k: settore(r.coordinate).corpo?.ricchezza ?? 0 }))
        .sort((a, b) => b.k - a.k || a.r.distanza - b.r.distanza)
        .map(({ r }) => r)
    return scelti
  }, [trovati, tipo, rarita, nuovi, scoperti, ordine])

  // Scorrendo fino in fondo si aggiungono altre righe.
  const fondo = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = fondo.current
    if (!el || elenco.length <= quanti) return
    const osserva = new IntersectionObserver(([v]) => v.isIntersecting && setQuanti((n) => n + PAGINA), {
      root: elencoRef.current,
      rootMargin: '300px',
    })
    osserva.observe(el)
    return () => osserva.disconnect()
  }, [elenco.length, quanti])

  const modificatore =
    tipoQui === 'nebulosa'
      ? filtriNebulari
        ? 'nebulosa, nessun calo'
        : 'ridotto dalla nebulosa'
      : tipoQui === 'pulsar'
        ? fatte?.has('S7')
          ? '×3 dalla pulsar'
          : '×2 dalla pulsar'
        : null
  const attivi = (tipo !== null ? 1 : 0) + (rarita !== null ? 1 : 0) + (nuovi ? 1 : 0)
  const azzera = () => {
    setTipo(null)
    setRarita(null)
    setNuovi(false)
  }

  const filtri = trovati && trovati.length > 0 && (
    <>
      <Gruppo nome="Rarità">
        {RARITA.filter((r) => conti.perRarita[r] > 0).map((r) => (
          <Voce key={r} acceso={rarita === r} onClick={() => setRarita(rarita === r ? null : r)} conto={conti.perRarita[r]}>
            <SimboloRarita rarita={r} className="w-3 text-center" />
            {NOMI_RARITA[r]}
          </Voce>
        ))}
      </Gruppo>
      <Gruppo nome="Tipo">
        {conti.tipiTrovati.map(([t, n]) => (
          <Voce key={t} acceso={tipo === t} onClick={() => setTipo(tipo === t ? null : t)} conto={n}>
            <SimboloRarita rarita={CATALOGO[t].rarita} className="w-3 text-center" />
            <span className="truncate">{CATALOGO[t].nome}</span>
          </Voce>
        ))}
      </Gruppo>
      <Gruppo nome="Mostra">
        <Voce acceso={nuovi} onClick={() => setNuovi((v) => !v)} conto={conti.daScoprire}>
          <span className={`grid size-3 place-items-center border ${nuovi ? 'border-ambra bg-ambra text-su-ambra' : 'border-linea'}`}>
            {nuovi && <IconaFatto className="size-2.5" />}
          </span>
          Solo da scoprire
        </Voce>
      </Gruppo>
    </>
  )

  return (
    <div className="@container flex min-h-0 flex-1 flex-col">
      {/* La testata: lo scanner e il totale. */}
      <div className="flex shrink-0 items-center gap-3 border-b border-separatore px-3 py-2.5">
        <Radar attivo={!trovati} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-baseline gap-1.5 leading-none">
            <span className="cifre text-[17px] text-ambra">{numero(raggio, 1)}</span>
            <span className="text-[11px] text-testo-tenue">settori di raggio</span>
          </span>
          <span className="truncate text-[11px] leading-none text-testo-tenue" title={[...tipi].map((t) => CATALOGO[t].nome).join(', ')}>
            {modificatore && <span className="text-ambra">{modificatore} · </span>}
            rileva {tipi.size} {tipi.size === 1 ? 'tipo' : 'tipi'} di corpo
          </span>
        </div>
        <span className="flex shrink-0 flex-col items-end gap-1 leading-none">
          <span className="cifre text-[17px] text-testo">{trovati ? trovati.length.toLocaleString('it-IT') : '—'}</span>
          <Etichetta className="text-[9px]">rilevati</Etichetta>
        </span>
      </div>

      <div className="relative flex min-h-0 flex-1">
        {/* I filtri: a lato se c'è spazio, altrimenti dal tasto Filtri. */}
        {filtri && (
          <aside
            aria-label="Filtri"
            className={`${aperti ? 'flex' : 'hidden'} absolute inset-x-0 z-20 max-h-[70%] flex-col gap-3 overflow-y-auto border-b border-linea bg-pannello p-3 shadow-lg @[34rem]:static @[34rem]:z-auto @[34rem]:flex @[34rem]:max-h-none @[34rem]:w-[200px] @[34rem]:shrink-0 @[34rem]:border-r @[34rem]:border-b-0 @[34rem]:border-separatore @[34rem]:bg-fondo/30 @[34rem]:shadow-none`}
          >
            {filtri}
          </aside>
        )}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* L'ordine, i filtri attivi, quanti risultati. */}
          {trovati && trovati.length > 0 && (
            <div className="flex shrink-0 items-center gap-2 border-b border-separatore px-3 py-2">
              <button
                type="button"
                aria-expanded={aperti}
                onClick={() => setAperti((v) => !v)}
                className={`etichetta flex items-center gap-1.5 border px-2 py-1 @[34rem]:hidden ${
                  attivi ? 'border-ambra text-ambra!' : 'border-separatore'
                }`}
              >
                Filtri{attivi ? ` · ${attivi}` : ''}
              </button>
              <div className="flex border border-separatore" role="radiogroup" aria-label="Ordina per">
                {(['distanza', 'rarita', ...(spettrometria ? (['ricchezza'] as const) : [])] as Ordine[]).map((o) => (
                  <button
                    key={o}
                    type="button"
                    role="radio"
                    aria-checked={ordine === o}
                    onClick={() => setOrdine(o)}
                    className={`px-2 py-1 text-[10px] font-semibold tracking-[0.14em] uppercase ${
                      ordine === o ? 'bg-ambra text-su-ambra' : 'text-testo-tenue hover:text-testo'
                    }`}
                  >
                    {NOMI_ORDINE[o]}
                  </button>
                ))}
              </div>
              <span className="ml-auto flex items-center gap-2 text-[11px] text-testo-tenue">
                <span className="cifre">{elenco.length.toLocaleString('it-IT')}</span>
                {attivi > 0 && (
                  <button type="button" className="etichetta text-ambra! hover:underline" onClick={azzera}>
                    Azzera
                  </button>
                )}
              </span>
            </div>
          )}

          <div ref={elencoRef} className="@container/elenco min-h-0 flex-1 overflow-y-auto">
            {!trovati ? (
              <Caricamento testo="Scansione in corso" avanzamento={avanzamento} className="p-3" />
            ) : trovati.length === 0 ? (
              <p className="m-0 p-3 text-xs leading-snug text-testo-tenue">
                Nessun corpo nel raggio. Prova a spostarti: gli altri tipi di corpo si scoprono solo arrivandoci.
              </p>
            ) : elenco.length === 0 ? (
              <p className="m-0 p-3 text-xs text-testo-tenue">Nessun corpo con questi filtri.</p>
            ) : (
              <table className="w-full table-fixed border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-pannello">
                  <tr className="etichetta text-[9px] [&>th]:border-b [&>th]:border-separatore [&>th]:py-1.5 [&>th]:font-semibold">
                    <th className="w-8 pl-3" aria-label="Rarità" />
                    <th>Corpo</th>
                    <th className="hidden w-28 @[30rem]/elenco:table-cell">Coordinate</th>
                    {spettrometria && <th className="w-14 text-right">Ricch.</th>}
                    <th className="w-16 pr-3 text-right">Sett.</th>
                  </tr>
                </thead>
                <tbody>
                  {elenco.slice(0, quanti).map(({ coordinate: c, tipo: t, distanza }) => {
                    const chiave = chiaveDi(c)
                    const visto = scoperti.has(chiave)
                    const scegli = () => onScegli(c)
                    return (
                      <tr
                        key={chiave}
                        tabIndex={0}
                        className="cursor-pointer text-[13px] outline-none even:bg-fondo/25 hover:bg-ambra/10 focus-visible:bg-ambra/10 [&>td]:py-1.5"
                        onClick={scegli}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            scegli()
                          }
                        }}
                        onContextMenu={(e) => {
                          if (!pc) return
                          e.preventDefault()
                          setMenu(menuCorpo(e.clientX, e.clientY, t, c, scegli))
                        }}
                      >
                        <td className="pl-3">
                          <SimboloRarita rarita={CATALOGO[t].rarita} />
                        </td>
                        <td className="max-w-0">
                          <span className="flex items-center gap-1.5">
                            <span className={`truncate ${visto ? 'text-testo-tenue' : 'text-testo'}`}>
                              {CATALOGO[t].nome}
                              {analisi && <Sottotipo c={c} />}
                            </span>
                            {visto && <IconaFatto className="size-3.5 shrink-0 text-[#7fd1c7]" aria-label="Già scoperto" />}
                          </span>
                        </td>
                        <td className="cifre hidden text-[11px] text-testo-tenue @[30rem]/elenco:table-cell">{coordinatePlancia(c)}</td>
                        {spettrometria && (
                          <td className="cifre text-right text-[12px] text-ambra">×{numero(settore(c).corpo?.ricchezza ?? 0, 2)}</td>
                        )}
                        <td className="cifre pr-3 text-right text-[12px]">{numero(distanza, 1)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
            {trovati && elenco.length > quanti && (
              <div ref={fondo} className="p-3 text-center">
                <Etichetta className="text-[9px]">
                  {quanti.toLocaleString('it-IT')} di {elenco.length.toLocaleString('it-IT')} · scorri per altri
                </Etichetta>
              </div>
            )}
          </div>
        </div>
      </div>
      <MenuContesto menu={menu} onChiudi={chiudiMenu} />
    </div>
  )
}

/** Un gruppo di filtri a lato: il titolo e le voci. */
function Gruppo({ nome, children }: { nome: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5" role="group" aria-label={nome}>
      <Etichetta className="mb-1 text-[9px]">{nome}</Etichetta>
      {children}
    </div>
  )
}

/** Una voce dei filtri: accesa ha il filo ambra a sinistra. */
function Voce({ acceso, onClick, conto, children }: { acceso: boolean; onClick: () => void; conto: number; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={acceso}
      onClick={onClick}
      className={`flex items-center gap-2 border-l-2 py-1 pr-1 pl-2 text-left text-[12px] ${
        acceso ? 'border-ambra bg-ambra/10 text-testo' : 'border-transparent text-testo-tenue hover:bg-ambra/5 hover:text-testo'
      }`}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">{children}</span>
      <span className="cifre shrink-0 text-[11px] text-testo-tenue">{abbreviaConto(conto)}</span>
    </button>
  )
}

/** Un conto breve per i filtri: 980, 12 k, 1,2 M. */
function abbreviaConto(n: number): string {
  if (n < 1000) return String(n)
  if (n < 1_000_000) return `${numero(n / 1000, n < 10_000 ? 1 : 0)} k`
  return `${numero(n / 1_000_000, 1)} M`
}

/** Un piccolo radar: ruota mentre la scansione è in corso. */
function Radar({ attivo }: { attivo: boolean }) {
  return (
    <span className="smussato relative grid size-9 shrink-0 place-items-center overflow-hidden border border-ambra-scura/70 bg-ambra/5 text-ambra [--smusso-colore:color-mix(in_oklab,var(--color-ambra-scura)_70%,transparent)] [--smusso:6px]">
      {attivo && (
        <span
          aria-hidden="true"
          className="absolute inset-0 animate-spin bg-[conic-gradient(from_0deg,transparent_0deg,rgb(255_181_71/0.35)_60deg,transparent_61deg)] [animation-duration:1.6s]"
        />
      )}
      <IconaScanner className="relative size-5" />
    </span>
  )
}

/** Il sottotipo di un corpo rilevato, se il suo tipo ne ha uno. */
function Sottotipo({ c }: { c: Coordinate }) {
  const corpo = settore(c).corpo
  const nome = corpo && nomeSottotipo(corpo.dettagli)
  return nome ? <span className="text-testo-tenue"> · {nome.toLowerCase()}</span> : null
}
