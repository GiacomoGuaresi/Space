import { Suspense, lazy } from 'react'

// three.js pesa: si carica a parte, così la scritta compare subito.
const Cielo = lazy(async () => ({ default: (await import('../grafica/Cielo')).Cielo }))

/**
 * La pagina di M0 (doc/06-roadmap.md): solo il cielo e il nome, dietro
 * l'accesso. L'universo arriva con M1.
 */
export function App() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-fondo">
      <Suspense fallback={null}>
        <Cielo />
      </Suspense>
      <div className="pointer-events-none relative grid min-h-dvh place-items-center p-4 text-center">
        <div>
          <h1 className="m-0 text-3xl font-semibold tracking-[0.3em]">SPACE</h1>
          <p className="mt-2 text-testo-tenue">Base in (0, 0, 0). L'universo è in costruzione.</p>
        </div>
      </div>
    </main>
  )
}
