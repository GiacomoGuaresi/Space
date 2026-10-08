import { Suspense, lazy, useMemo, useState } from 'react'
import type { Scoperta } from '../dati'
import { inViaggio, type Nave, type Viaggio } from '../dominio/navigazione'
import { settore as calcolaSettore, type Coordinate } from '../dominio/settore'
import { Menu } from './Menu'
import { Riepilogo } from './Riepilogo'
import { Rotta } from './Rotta'
import { Scanner } from './Scanner'
import { Scheda } from './Scheda'
import { StatoNave } from './StatoNave'
import type { Evento } from './riepilogo'
import { useOra } from './useNave'

const Scena = lazy(async () => ({ default: (await import('../grafica/Scena')).Scena }))

type Linguetta = 'qui' | 'scanner' | 'rotta'

interface Props {
  nave: Nave
  viaggio: Viaggio | null
  scarto: number
  scoperte: Scoperta[]
  riepilogo: Evento[]
  onChiudiRiepilogo: () => void
  onParti: (meta: Coordinate) => Promise<void>
}

/**
 * Il ponte di comando (M2): la vista del settore dove sta la nave (o il
 * viaggio, se è in volo), lo stato della nave in alto e in basso il settore,
 * lo scanner e la rotta.
 */
export function Ponte({ nave, viaggio, scarto, scoperte, riepilogo, onChiudiRiepilogo, onParti }: Props) {
  const ora = useOra(scarto)
  const volo = inViaggio(nave, ora)
  const { x, y, z } = nave.posizione
  const settore = useMemo(() => calcolaSettore({ x, y, z }), [x, y, z])
  const scoperti = useMemo(() => new Set(scoperte.map(({ coordinate: c }) => `${c.x},${c.y},${c.z}`)), [scoperte])
  const [scheda, setScheda] = useState<Linguetta>('qui')
  const [meta, setMeta] = useState<Coordinate | null>(null)

  const scegli = (c: Coordinate) => {
    setMeta(c)
    setScheda('rotta')
  }

  const linguetta = (valore: Linguetta, testo: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={scheda === valore}
      className="flex-1 rounded-lg px-2 py-1.5 text-xs text-testo-tenue aria-selected:bg-fondo/70 aria-selected:text-testo"
      onClick={() => setScheda(valore)}
    >
      {testo}
    </button>
  )

  return (
    <main className="relative h-dvh overflow-hidden bg-black">
      <Suspense fallback={null}>
        <Scena settore={settore} inViaggio={volo} />
      </Suspense>
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between gap-3 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <header className="pointer-events-auto flex items-start justify-between gap-2">
          <StatoNave nave={nave} viaggio={viaggio} ora={ora} />
          <Menu attuale="ponte" />
        </header>

        <section className="pointer-events-auto w-full max-w-md self-start">
          {volo ? (
            <div className="rounded-2xl border border-bordo/70 bg-pannello/75 p-3 text-xs text-testo-tenue backdrop-blur">
              Lo scanner e la rotta tornano disponibili all'arrivo. Il nome di quello che c'è laggiù lo scoprirai arrivando.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex gap-1 rounded-xl border border-bordo/70 bg-pannello/75 p-1 backdrop-blur" role="tablist">
                {linguetta('qui', 'Qui')}
                {linguetta('scanner', 'Scanner')}
                {linguetta('rotta', 'Rotta')}
              </div>
              {scheda === 'qui' ? (
                <Scheda settore={settore} />
              ) : (
                <div className="max-h-[42dvh] overflow-y-auto rounded-2xl border border-bordo/70 bg-pannello/75 p-3 backdrop-blur">
                  {scheda === 'scanner' ? (
                    <Scanner centro={nave.posizione} scoperti={scoperti} onScegli={scegli} />
                  ) : (
                    <Rotta
                      nave={nave}
                      ora={ora}
                      meta={meta}
                      onMeta={setMeta}
                      onParti={async (m) => {
                        await onParti(m)
                        setMeta(null)
                        setScheda('qui')
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
      {riepilogo.length > 0 && <Riepilogo eventi={riepilogo} ora={ora} onChiudi={onChiudiRiepilogo} />}
    </main>
  )
}
