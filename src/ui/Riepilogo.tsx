import type { Evento } from './riepilogo'
import { orario } from './formato'

/** Cosa è successo dall'ultima visita: compare all'apertura, se c'è qualcosa. */
export function Riepilogo({ eventi, ora, onChiudi }: { eventi: Evento[]; ora: Date; onChiudi: () => void }) {
  return (
    <div className="pointer-events-auto fixed inset-0 z-10 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="riepilogo-titolo">
      <section className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-bordo bg-pannello p-4">
        <h2 id="riepilogo-titolo" className="m-0 text-base font-semibold">
          Mentre eri via
        </h2>
        <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
          {eventi.map((e, i) => (
            <li key={i} className="flex gap-2">
              <span className="shrink-0 text-xs text-testo-tenue tabular-nums">{orario(e.quando, ora)}</span>
              <span>{e.testo}</span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          autoFocus
          className="min-h-10 rounded-xl bg-nebula font-semibold text-fondo hover:bg-nebula-scura"
          onClick={onChiudi}
        >
          Ok
        </button>
      </section>
    </div>
  )
}
