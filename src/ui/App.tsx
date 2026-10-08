import { Suspense, lazy, useMemo } from 'react'
import { settore as calcolaSettore } from '../dominio/settore'
import { Catalogo } from './Catalogo'
import { usePagina, type Pagina } from './indirizzo'
import { Menu } from './Menu'
import { Osservatorio } from './Osservatorio'
import { Ponte } from './Ponte'
import { Scheda } from './Scheda'
import { useNave } from './useNave'

// three.js pesa: si carica a parte, così i comandi compaiono subito.
const Scena = lazy(async () => ({ default: (await import('../grafica/Scena')).Scena }))

/** Le pagine dell'app (ui/indirizzo.ts): il ponte, il catalogo, l'osservatorio in sviluppo. */
export function App() {
  const pagina = usePagina()
  const { stato, scarto, scoperte, riepilogo, chiudiRiepilogo, parti, ricarica } = useNave()

  if (pagina.pagina === 'osservatorio' && import.meta.env.DEV) return <PaginaOsservatorio pagina={pagina} />

  if (stato.fase === 'carico') {
    return <main className="grid min-h-dvh place-items-center bg-black text-xs text-testo-tenue">Collegamento con la nave…</main>
  }
  if (stato.fase === 'errore') {
    return (
      <main className="grid min-h-dvh place-items-center bg-black p-4 text-center">
        <div className="flex flex-col items-center gap-3">
          <p className="m-0 text-sm text-pericolo" role="alert">
            {stato.messaggio}
          </p>
          <button type="button" className="rounded-xl border border-bordo px-4 py-2 text-sm hover:border-nebula" onClick={() => void ricarica()}>
            Riprova
          </button>
        </div>
      </main>
    )
  }
  if (pagina.pagina === 'catalogo') return <Catalogo scoperte={scoperte} />
  return (
    <Ponte
      nave={stato.nave}
      viaggio={stato.viaggio}
      scarto={scarto}
      scoperte={scoperte}
      riepilogo={riepilogo}
      onChiudiRiepilogo={chiudiRiepilogo}
      onParti={parti}
    />
  )
}

/**
 * L'osservatorio di M1: guarda qualsiasi settore, senza nave né viaggi. Resta
 * solo in sviluppo, per provare i corpi e le loro grafiche (doc/06-roadmap.md).
 */
function PaginaOsservatorio({ pagina }: { pagina: Extract<Pagina, { pagina: 'osservatorio' }> }) {
  const { x, y, z } = pagina.coordinate
  // Un oggetto nuovo solo quando cambiano le coordinate: la scena si rifà solo allora.
  const settore = useMemo(() => calcolaSettore({ x, y, z }), [x, y, z])
  return (
    <main className="relative h-dvh overflow-hidden bg-black">
      <Suspense fallback={null}>
        <Scena settore={settore} />
      </Suspense>
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between gap-3 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <header className="pointer-events-auto flex items-start justify-between gap-2">
          <div className="flex flex-col gap-2">
            <h1 className="m-0 text-xs font-semibold tracking-[0.3em] text-testo-tenue">SPACE · OSSERVATORIO</h1>
            <Osservatorio settore={settore} />
          </div>
          <Menu attuale="osservatorio" />
        </header>
        <div className="pointer-events-auto w-full max-w-sm self-start">
          <Scheda settore={settore} />
        </div>
      </div>
    </main>
  )
}
