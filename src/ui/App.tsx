import { Suspense, lazy, useMemo } from 'react'
import { settore as calcolaSettore } from '../dominio/settore'
import { useCoordinate } from './indirizzo'
import { Osservatorio } from './Osservatorio'
import { Scheda } from './Scheda'

// three.js pesa: si carica a parte, così i comandi compaiono subito.
const Scena = lazy(async () => ({ default: (await import('../grafica/Scena')).Scena }))

/**
 * L'osservatorio (M1, doc/06-roadmap.md): la vista del settore a tutto
 * schermo, i comandi in alto e la scheda del corpo in basso.
 */
export function App() {
  const { x, y, z } = useCoordinate()
  // Un oggetto nuovo solo quando cambiano le coordinate: la scena si rifà solo allora.
  const settore = useMemo(() => calcolaSettore({ x, y, z }), [x, y, z])

  return (
    <main className="relative h-dvh overflow-hidden bg-black">
      <Suspense fallback={null}>
        <Scena settore={settore} />
      </Suspense>
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between gap-3 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <header className="pointer-events-auto flex flex-col gap-2 self-start">
          <h1 className="m-0 text-xs font-semibold tracking-[0.3em] text-testo-tenue">SPACE · OSSERVATORIO</h1>
          <Osservatorio settore={settore} />
        </header>
        <div className="pointer-events-auto w-full max-w-sm self-start">
          <Scheda settore={settore} />
        </div>
      </div>
    </main>
  )
}
