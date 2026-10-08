import { Suspense, lazy, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Navigation } from 'lucide-react'
import type { Scansione, Scoperta } from '../dati'
import { CATALOGO } from '../dominio/catalogo'
import { corpiNoti, type PuntoMappa } from '../dominio/mappa'
import { anteprima, inViaggio, type Nave, type Viaggio } from '../dominio/navigazione'
import { BASE, distanza, settore, stessoSettore, type Coordinate } from '../dominio/settore'
import { COLORI_RARITA } from './colori'
import { Cornice } from './Cornice'
import { coordinatePlancia, durata, numero, orario } from './formato'
import { vaiA } from './indirizzo'
import { MenuContesto, menuCorpo, type Menu } from './MenuContesto'
import { segnaRaroVisto } from './pallini'
import { BottonePrimario, Etichetta, Pannello, SimboloRarita } from './plancia'
import { CaricoAttuale } from './SchedaNave'
import { useOra } from './useNave'

// three.js pesa: si carica a parte, come la scena del ponte.
const Mappa3D = lazy(async () => ({ default: (await import('../grafica/Mappa3D')).Mappa3D }))

interface Props {
  nave: Nave
  viaggio: Viaggio | null
  scarto: number
  scoperte: Scoperta[]
  scansioni: Scansione[]
}

/**
 * La mappa dei settori scansionati (doc/02-meccaniche.md#scanner): tutto ciò
 * che lo scanner ha visto nelle soste, più le scoperte. Toccando un corpo se
 * ne vede la scheda e si può impostare la rotta.
 */
export function Mappa({ nave, viaggio, scarto, scoperte, scansioni }: Props) {
  const ora = useOra(scarto)
  const fatte = useContext(CaricoAttuale)?.fatte
  const spettrometria = fatte?.has('S2') ?? false
  const tutti = useMemo(() => corpiNoti(scansioni, scoperte), [scansioni, scoperte])
  const [filtro, setFiltro] = useState<Filtro>('tutti')
  const punti = useMemo(() => tutti.filter(FILTRI[filtro].tiene), [tutti, filtro])
  const [centra, setCentra] = useState<{ su: Coordinate; volta: number } | null>(null)
  const [scelto, setScelto] = useState<Coordinate | null>(null)
  const punto = scelto && punti.find((p) => stessoSettore(p.coordinate, scelto))
  // Aprire la scheda di un raro spegne il suo pallino sulla barra.
  useEffect(() => {
    if (punto && ['rara', 'leggendaria'].includes(CATALOGO[punto.tipo].rarita)) {
      segnaRaroVisto(`${punto.coordinate.x},${punto.coordinate.y},${punto.coordinate.z}`)
    }
  }, [punto])
  const scoperta = scelto && scoperte.find((s) => stessoSettore(s.coordinate, scelto))
  const volo = inViaggio(nave, ora)
  const prova = punto && !volo && !stessoSettore(punto.coordinate, nave.posizione) ? anteprima(nave, punto.coordinate, ora, fatte) : null

  return (
    <Cornice
      pagina="mappa"
      nave={nave}
      viaggio={viaggio}
      scarto={scarto}
      fondo={
        <Suspense fallback={null}>
          <Mappa3D punti={punti} soste={scansioni} nave={nave.posizione} centra={centra} selezionato={scelto} onSeleziona={setScelto} />
        </Suspense>
      }
    >
      <div className="mb-auto flex items-start gap-2 pointer-events-none!">
        <Filtri
          filtro={filtro}
          onFiltro={(f) => {
            setFiltro(f)
            setScelto(null)
          }}
        />
        <div className="pointer-events-auto flex flex-col gap-1.5">
          <TastiCentra nave={nave.posizione} onCentra={setCentra} />
        </div>
      </div>
      {punto ? (
        <Pannello className="flex flex-col gap-2.5 p-3.5" etichetta="Corpo scelto">
          <div className="flex items-baseline justify-between gap-2">
            <Etichetta className={COLORI_RARITA[CATALOGO[punto.tipo].rarita].testo}>
              <SimboloRarita rarita={CATALOGO[punto.tipo].rarita} /> {CATALOGO[punto.tipo].nome} · {CATALOGO[punto.tipo].rarita} ·{' '}
              {scoperta ? 'visitato' : 'non visitato'}
            </Etichetta>
            <span className="cifre shrink-0 text-xs text-testo-tenue">{coordinatePlancia(punto.coordinate)}</span>
          </div>
          {scoperta && <p className="m-0 text-base font-semibold tracking-[0.1em] uppercase">{settore(punto.coordinate).corpo?.nome}</p>}
          <div className="flex gap-5">
            <Valore etichetta="Distanza">{numero(distanza(nave.posizione, punto.coordinate), 1)} sett.</Valore>
            {spettrometria && <Valore etichetta="Ricchezza">×{numero(settore(punto.coordinate).corpo?.ricchezza ?? 0, 2)}</Valore>}
            {prova && <Valore etichetta="Durata">{durata(prova.durata)}</Valore>}
            {prova && <Valore etichetta="Carb">{numero(prova.consumo, 1)}</Valore>}
          </div>
          {prova?.fermata && prova.possibile && (
            <p className="m-0 text-xs text-ambra">Il carburante non basta: ci si fermerà in {coordinatePlancia(prova.a)}.</p>
          )}
          <p className="m-0 text-xs text-testo-tenue">
            {scoperta ? `Scoperto ${orario(scoperta.scoperta, ora)}` : 'Rilevato dallo scanner: il nome si scopre arrivando.'}
          </p>
          {!stessoSettore(punto.coordinate, nave.posizione) && (
            <BottonePrimario disabled={volo} onClick={() => vaiA({ pagina: 'ponte', meta: punto.coordinate })}>
              <Navigation className="size-4" aria-hidden="true" />
              {volo ? 'In viaggio' : 'Imposta rotta'}
            </BottonePrimario>
          )}
        </Pannello>
      ) : (
        <Pannello className="p-3 text-xs text-testo-tenue">
          <span className="cifre text-testo">{punti.length}</span> {punti.length === 1 ? 'corpo noto' : 'corpi noti'} ·{' '}
          <span className="cifre text-testo">{scansioni.length}</span> {scansioni.length === 1 ? 'sosta' : 'soste'}. Tocca un corpo per la
          sua scheda: ● comune, ◆ non comune, ★ raro, ✦ leggendario; pieni i visitati, vuoti quelli solo rilevati; ▲ la nave, ○ la base
          madre. Un quadretto è un settore.
        </Pannello>
      )}
    </Cornice>
  )
}

type Filtro = 'tutti' | 'sistemi' | 'rari' | 'nuovi'

// "Insediamenti" arriva con le basi (M4).
const FILTRI: Readonly<Record<Filtro, { nome: string; tiene: (p: PuntoMappa) => boolean }>> = {
  tutti: { nome: 'Tutti', tiene: () => true },
  sistemi: { nome: 'Sistemi', tiene: (p) => p.tipo === 'sistema' },
  rari: { nome: 'Rari', tiene: (p) => ['rara', 'leggendaria'].includes(CATALOGO[p.tipo].rarita) },
  nuovi: { nome: 'Non visitati', tiene: (p) => !p.scoperto },
}

function Valore({ etichetta, children }: { etichetta: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <Etichetta>{etichetta}</Etichetta>
      <span className="cifre text-[15px]">{children}</span>
    </div>
  )
}

/** I filtri della mappa: tutti, sistemi, rari, non visitati. */
function Filtri({ filtro, onFiltro, compatti = false }: { filtro: Filtro; onFiltro: (f: Filtro) => void; compatti?: boolean }) {
  return (
    <div role="group" aria-label="Filtri" className="pointer-events-auto flex flex-1 flex-wrap gap-1.5">
      {(Object.keys(FILTRI) as Filtro[]).map((f) => (
        <button
          key={f}
          type="button"
          aria-pressed={filtro === f}
          className={`etichetta rounded-plancia border border-linea bg-pannello/80 px-2.5 aria-pressed:border-ambra aria-pressed:bg-ambra/12 aria-pressed:text-ambra ${compatti ? 'h-7' : 'h-8'}`}
          onClick={() => onFiltro(f)}
        >
          {FILTRI[f].nome}
        </button>
      ))}
    </div>
  )
}

/** I tasti per riportare il centro della mappa sulla nave o sulla base madre. */
function TastiCentra({
  nave,
  onCentra,
  compatti = false,
}: {
  nave: Coordinate
  onCentra: (c: { su: Coordinate; volta: number }) => void
  compatti?: boolean
}) {
  return (
    <>
      {(
        [
          ['Nave', nave],
          ['Madre', BASE],
        ] as const
      ).map(([nome, su]) => (
        <button
          key={nome}
          type="button"
          aria-label={`Centra su ${nome === 'Nave' ? 'la nave' : 'la base madre'}`}
          className={`etichetta rounded-plancia border border-linea bg-pannello/85 text-testo! ${compatti ? 'h-7 px-2.5' : 'h-11 w-16'}`}
          onClick={() => onCentra({ su, volta: Date.now() })}
        >
          {nome}
        </button>
      ))}
    </>
  )
}

/**
 * La mappa come sfondo della plancia per PC (doc/11-interfaccia.md#pc--plancia-a-finestre):
 * la mappa 3D dietro le finestre e la barretta con i filtri e i tasti per
 * ricentrare. Un clic su un corpo lo mette nella Rotta.
 */
export function useSfondoMappa({
  nave,
  scoperte,
  scansioni,
  meta,
  onScegli,
}: {
  nave: Coordinate
  scoperte: readonly Scoperta[]
  scansioni: readonly Scansione[]
  /** La meta della rotta, evidenziata sulla mappa. */
  meta: Coordinate | null
  onScegli: (c: Coordinate) => void
}): { fondo: ReactNode; barretta: ReactNode } {
  const tutti = useMemo(() => corpiNoti(scansioni, scoperte), [scansioni, scoperte])
  const [filtro, setFiltro] = useState<Filtro>('tutti')
  const punti = useMemo(() => tutti.filter(FILTRI[filtro].tiene), [tutti, filtro])
  const [centra, setCentra] = useState<{ su: Coordinate; volta: number } | null>(null)
  const [menu, setMenu] = useState<Menu | null>(null)
  const chiudiMenu = useCallback(() => setMenu(null), [])
  const contesto = (c: Coordinate, x: number, y: number) => {
    const punto = punti.find((p) => stessoSettore(p.coordinate, c))
    if (punto) setMenu(menuCorpo(x, y, punto.tipo, c, stessoSettore(c, nave) ? undefined : () => onScegli(c)))
  }
  const seleziona = (c: Coordinate | null) => {
    const punto = c && punti.find((p) => stessoSettore(p.coordinate, c))
    if (!punto) return
    // Scegliere un raro spegne il suo pallino.
    if (['rara', 'leggendaria'].includes(CATALOGO[punto.tipo].rarita)) segnaRaroVisto(`${c.x},${c.y},${c.z}`)
    if (!stessoSettore(c, nave)) onScegli(c)
  }
  return {
    fondo: (
      <Suspense fallback={null}>
        <Mappa3D
          punti={punti}
          soste={scansioni}
          nave={nave}
          centra={centra}
          selezionato={meta}
          onSeleziona={seleziona}
          onContesto={contesto}
        />
        <MenuContesto menu={menu} onChiudi={chiudiMenu} />
      </Suspense>
    ),
    barretta: (
      <div className="flex items-center gap-1.5 border-b border-separatore bg-barra/80 px-3 py-1.5 backdrop-blur">
        <Filtri filtro={filtro} onFiltro={setFiltro} compatti />
        <span className="etichetta mr-2">
          {punti.length} {punti.length === 1 ? 'corpo' : 'corpi'} · clic → Rotta
        </span>
        <TastiCentra nave={nave} onCentra={setCentra} compatti />
      </div>
    ),
  }
}
