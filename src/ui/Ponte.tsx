import { Suspense, lazy, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Scansione, Scoperta } from '../dati'
import { inViaggio, type Nave, type Viaggio } from '../dominio/navigazione'
import { settore as calcolaSettore, type Coordinate } from '../dominio/settore'
import { vaiA } from './indirizzo'
import { Cornice } from './Cornice'
import { Finestra } from './Finestra'
import { apri, FINESTRE, inPrimoPiano, useDisposizione, type IdFinestra } from './finestre'
import { useSfondoMappa } from './Mappa'
import { Pannello } from './plancia'
import { Rotta } from './Rotta'
import { Scanner } from './Scanner'
import { Scheda } from './Scheda'
import { usePC } from './schermo'
import { useOra } from './useNave'

const Scena = lazy(async () => ({ default: (await import('../grafica/Scena')).Scena }))

type Linguetta = 'qui' | 'scanner' | 'rotta'

interface Props {
  nave: Nave
  viaggio: Viaggio | null
  scarto: number
  scoperte: Scoperta[]
  scansioni: Scansione[]
  /** Una meta scelta altrove (dalla mappa): apre la rotta. */
  meta?: Coordinate
  onParti: (meta: Coordinate) => Promise<void>
  /** Su PC: le altre finestre della plancia (diario, wiki…), con il loro contenuto. */
  archivio?: Partial<Record<IdFinestra, { contenuto: ReactNode; onChiudi?: () => void }>>
}

/**
 * Il ponte di comando (M2): la vista del settore dove sta la nave (o il
 * viaggio, se è in volo), lo stato della nave in alto e in basso il settore,
 * lo scanner e la rotta: sul telefono come schede di un pannello, su PC come
 * tre finestre (doc/11-interfaccia.md#finestre), insieme a quelle dell'archivio.
 */
export function Ponte({ nave, viaggio, scarto, scoperte, scansioni, meta: metaScelta, onParti, archivio = {} }: Props) {
  const ora = useOra(scarto)
  const volo = inViaggio(nave, ora)
  const { x, y, z } = nave.posizione
  const settore = useMemo(() => calcolaSettore({ x, y, z }), [x, y, z])
  const scoperti = useMemo(() => new Set(scoperte.map(({ coordinate: c }) => `${c.x},${c.y},${c.z}`)), [scoperte])
  const [scheda, setScheda] = useState<Linguetta>(metaScelta ? 'rotta' : 'qui')
  const [meta, setMeta] = useState<Coordinate | null>(metaScelta ?? null)
  const pc = usePC()
  const disposizione = useDisposizione()

  const { x: mx, y: my, z: mz } = metaScelta ?? { x: null, y: null, z: null }
  useEffect(() => {
    if (mx === null || my === null || mz === null) return
    setMeta({ x: mx, y: my, z: mz })
    setScheda('rotta')
    apri('rotta')
  }, [mx, my, mz])

  // Scegliere una meta apre la rotta: la scheda sul telefono, la finestra su PC.
  const scegli = (c: Coordinate) => {
    setMeta(c)
    setScheda('rotta')
    apri('rotta')
  }

  const fondo = (
    <Suspense fallback={null}>
      <Scena settore={settore} inViaggio={volo} />
    </Suspense>
  )
  // Su PC dietro le finestre può esserci la mappa: un clic su un corpo apre la rotta.
  const mappa = useSfondoMappa({ nave: nave.posizione, scoperte, scansioni, meta, onScegli: scegli })
  const rotta = (
    <Rotta
      nave={nave}
      ora={ora}
      meta={meta}
      scoperti={scoperti}
      onMeta={setMeta}
      onParti={async (m) => {
        await onParti(m)
        setMeta(null)
        setScheda('qui')
        // La meta della mappa non serve più: l'indirizzo torna quello del ponte.
        if (metaScelta) vaiA({ pagina: 'ponte' })
      }}
    />
  )
  const inArrivo = <p className="m-0 text-xs text-testo-tenue">Disponibile all'arrivo.</p>

  if (pc) {
    const contenuti: Partial<Record<IdFinestra, { contenuto: ReactNode; onChiudi?: () => void }>> = {
      qui: { contenuto: <Scheda settore={settore} /> },
      scanner: {
        contenuto: volo ? inArrivo : <Scanner centro={nave.posizione} livello={nave.scanner} scoperti={scoperti} onScegli={scegli} />,
      },
      rotta: { contenuto: volo ? inArrivo : rotta },
      ...archivio,
    }
    const attiva = inPrimoPiano(disposizione)
    return (
      <Cornice
        pagina="ponte"
        nave={nave}
        viaggio={viaggio}
        scarto={scarto}
        fondo={disposizione.sfondo === 'mappa' ? mappa.fondo : fondo}
        barretta={disposizione.sfondo === 'mappa' ? mappa.barretta : undefined}
        finestre
      >
        {(Object.keys(FINESTRE) as IdFinestra[])
          .filter((id) => disposizione.finestre[id].stato === 'aperta' && contenuti[id])
          .map((id) => (
            <Finestra
              key={id}
              id={id}
              finestra={disposizione.finestre[id]}
              livello={disposizione.ordine.indexOf(id) + 1}
              attiva={attiva === id}
              onChiudi={contenuti[id]!.onChiudi}
            >
              {contenuti[id]!.contenuto}
            </Finestra>
          ))}
      </Cornice>
    )
  }

  const linguetta = (valore: Linguetta, testo: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={scheda === valore}
      className="etichetta border-b-2 border-transparent py-3 text-center aria-selected:border-ambra aria-selected:text-ambra"
      onClick={() => setScheda(valore)}
    >
      {testo}
    </button>
  )

  return (
    <Cornice pagina="ponte" nave={nave} viaggio={viaggio} scarto={scarto} fondo={fondo}>
      {volo ? (
        <Pannello className="p-3 text-xs text-testo-tenue">
          Lo scanner e la rotta tornano disponibili all'arrivo. Il nome di quello che c'è laggiù lo scoprirai arrivando.
        </Pannello>
      ) : (
        <Pannello className="flex max-h-[58dvh] flex-col">
          <div className="grid grid-cols-3 border-b border-linea" role="tablist">
            {linguetta('qui', 'Qui')}
            {linguetta('scanner', 'Scanner')}
            {linguetta('rotta', 'Rotta')}
          </div>
          <div className="min-h-0 overflow-y-auto p-3.5" role="tabpanel">
            {scheda === 'qui' ? (
              <Scheda settore={settore} />
            ) : scheda === 'scanner' ? (
              <Scanner centro={nave.posizione} livello={nave.scanner} scoperti={scoperti} onScegli={scegli} />
            ) : (
              rotta
            )}
          </div>
        </Pannello>
      )}
    </Cornice>
  )
}
