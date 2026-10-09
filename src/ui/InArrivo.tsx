import type { Nave, Viaggio } from '../dominio/navigazione'
import { coordinatePlancia, orario, rovescia } from './formato'
import { IconaInVolo } from './icone'
import { Etichetta } from './plancia'

// Le scie: posizione orizzontale, ritardo e durata, fisse perché non saltino a ogni secondo.
const SCIE = [
  { x: 8, ritardo: 0, durata: 1.6 },
  { x: 19, ritardo: 0.9, durata: 2.1 },
  { x: 31, ritardo: 0.3, durata: 1.4 },
  { x: 44, ritardo: 1.4, durata: 1.9 },
  { x: 57, ritardo: 0.6, durata: 1.5 },
  { x: 68, ritardo: 1.1, durata: 2.3 },
  { x: 79, ritardo: 0.2, durata: 1.7 },
  { x: 91, ritardo: 1.7, durata: 2 },
]

/**
 * Quello che mostrano Scanner e Rotta mentre la nave viaggia: al centro del
 * pannello, la nave in volo tra le scie delle stelle, il conto alla rovescia
 * e la barra del viaggio.
 */
export function InArrivo({ nave, viaggio, ora, cosa }: { nave: Nave; viaggio: Viaggio | null; ora: Date; cosa: string }) {
  const totale = viaggio ? viaggio.arrivo.getTime() - viaggio.partenza.getTime() : 0
  const fatto = viaggio && totale > 0 ? Math.min(1, Math.max(0, (ora.getTime() - viaggio.partenza.getTime()) / totale)) : 0
  return (
    <div className="relative flex min-h-56 flex-1 flex-col items-center justify-center gap-4 overflow-hidden px-4 py-6 text-center">
      {/* Le scie delle stelle, che scorrono verso il basso. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,#000_30%,transparent_75%)]">
        {SCIE.map(({ x, ritardo, durata }) => (
          <span
            key={x}
            className="scia absolute top-0 h-10 w-px bg-linear-to-b from-transparent to-ambra/50"
            style={{ left: `${x}%`, animationDelay: `${ritardo}s`, animationDuration: `${durata}s` }}
          />
        ))}
      </div>

      {/* La nave al centro di un anello che gira. */}
      <div aria-hidden="true" className="relative grid size-20 place-items-center">
        <span className="absolute inset-0 animate-spin rounded-full border border-dashed border-ambra-scura/70 [animation-duration:12s]" />
        <span className="absolute inset-2.5 rounded-full border border-ambra/20 bg-[radial-gradient(circle,rgb(255_181_71/0.16),transparent_70%)]" />
        <span className="absolute inset-2.5 animate-ping rounded-full border border-ambra/30 [animation-duration:2.4s]" />
        <IconaInVolo className="relative size-8 text-ambra drop-shadow-[0_0_8px_rgb(255_181_71/0.6)]" />
      </div>

      <div className="relative flex flex-col items-center gap-1.5">
        <Etichetta className="text-ambra!">In viaggio</Etichetta>
        <span className="cifre text-2xl leading-none font-semibold text-ambra [text-shadow:0_0_14px_rgb(255_181_71/0.4)]" aria-live="polite">
          {rovescia(nave.dal.getTime() - ora.getTime())}
        </span>
        <span className="cifre text-[11px] text-testo-tenue">
          verso {coordinatePlancia(nave.posizione)} · arrivo {orario(nave.dal, ora)}
        </span>
      </div>

      {viaggio && (
        <span
          className="relative h-1 w-full max-w-56 bg-[#211a10]"
          role="progressbar"
          aria-label="Viaggio"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(fatto * 100)}
        >
          <span className="absolute inset-y-0 left-0 bg-ambra" style={{ width: `${fatto * 100}%` }} />
          <span
            aria-hidden="true"
            className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-ambra shadow-[0_0_8px_rgb(255_181_71/0.8)]"
            style={{ left: `${fatto * 100}%` }}
          />
        </span>
      )}

      <p className="relative m-0 max-w-64 text-xs leading-snug text-testo-tenue">{cosa}</p>
    </div>
  )
}
