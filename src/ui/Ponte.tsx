import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import type { Scoperta } from '../dati'
import { inViaggio, type Nave, type Viaggio } from '../dominio/navigazione'
import { settore as calcolaSettore, type Coordinate } from '../dominio/settore'
import { vaiA } from './indirizzo'
import { Cornice } from './Cornice'
import { Pannello } from './plancia'
import { Rotta } from './Rotta'
import { Scanner } from './Scanner'
import { Scheda } from './Scheda'
import { useOra } from './useNave'

const Scena = lazy(async () => ({ default: (await import('../grafica/Scena')).Scena }))

type Linguetta = 'qui' | 'scanner' | 'rotta'

interface Props {
  nave: Nave
  viaggio: Viaggio | null
  scarto: number
  scoperte: Scoperta[]
  /** Una meta scelta altrove (dalla mappa): apre la rotta. */
  meta?: Coordinate
  onParti: (meta: Coordinate) => Promise<void>
}

/**
 * Il ponte di comando (M2): la vista del settore dove sta la nave (o il
 * viaggio, se è in volo), lo stato della nave in alto e in basso il settore,
 * lo scanner e la rotta.
 */
export function Ponte({ nave, viaggio, scarto, scoperte, meta: metaScelta, onParti }: Props) {
  const ora = useOra(scarto)
  const volo = inViaggio(nave, ora)
  const { x, y, z } = nave.posizione
  const settore = useMemo(() => calcolaSettore({ x, y, z }), [x, y, z])
  const scoperti = useMemo(() => new Set(scoperte.map(({ coordinate: c }) => `${c.x},${c.y},${c.z}`)), [scoperte])
  const [scheda, setScheda] = useState<Linguetta>(metaScelta ? 'rotta' : 'qui')
  const [meta, setMeta] = useState<Coordinate | null>(metaScelta ?? null)

  const { x: mx, y: my, z: mz } = metaScelta ?? { x: null, y: null, z: null }
  useEffect(() => {
    if (mx === null || my === null || mz === null) return
    setMeta({ x: mx, y: my, z: mz })
    setScheda('rotta')
  }, [mx, my, mz])

  const scegli = (c: Coordinate) => {
    setMeta(c)
    setScheda('rotta')
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
    <Cornice
      pagina="ponte"
      nave={nave}
      viaggio={viaggio}
      scarto={scarto}
      fondo={
        <Suspense fallback={null}>
          <Scena settore={settore} inViaggio={volo} />
        </Suspense>
      }
    >
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
            )}
          </div>
        </Pannello>
      )}
    </Cornice>
  )
}
