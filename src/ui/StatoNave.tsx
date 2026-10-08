import { Fuel, Navigation, Rocket } from 'lucide-react'
import { carburanteOra, inViaggio, pienoTra, ricaricaQui, type Nave, type Viaggio } from '../dominio/navigazione'
import { stessoSettore, tipoSettore } from '../dominio/settore'
import { coordinate, durata, numero, orario, rovescia } from './formato'

interface Props {
  nave: Nave
  viaggio: Viaggio | null
  ora: Date
}

/** Dove è la nave, quanto manca all'arrivo, quanto carburante ha. */
export function StatoNave({ nave, viaggio, ora }: Props) {
  const volo = inViaggio(nave, ora)
  const carburante = carburanteOra(nave, ora)
  const pieno = pienoTra(nave, ora)
  const accelerata = !volo && ricaricaQui(nave, tipoSettore(nave.posizione)) > nave.ricarica

  return (
    <section className="flex w-64 flex-col gap-2 rounded-2xl border border-bordo/70 bg-pannello/75 p-3 backdrop-blur">
      {volo ? (
        <div>
          <p className="m-0 flex items-center gap-1.5 text-xs text-testo-tenue">
            <Rocket className="size-3.5 text-nebula" aria-hidden="true" />
            In viaggio verso {coordinate(nave.posizione)}
          </p>
          <p className="m-0 text-3xl font-semibold tabular-nums" aria-live="polite">
            {rovescia(nave.dal.getTime() - ora.getTime())}
          </p>
          <p className="m-0 text-xs text-testo-tenue">
            Arrivo alle {orario(nave.dal, ora)}
            {viaggio?.fionda ? ' · fionda gravitazionale' : ''}
          </p>
          {viaggio && !stessoSettore(viaggio.a, viaggio.meta) && (
            <p className="m-0 mt-1 text-xs text-[#ffc46b]">
              Il carburante finirà prima della meta {coordinate(viaggio.meta)}.
            </p>
          )}
        </div>
      ) : (
        <p className="m-0 flex items-center gap-1.5 text-sm">
          <Navigation className="size-3.5 text-nebula" aria-hidden="true" />
          Ferma in {coordinate(nave.posizione)}
        </p>
      )}

      <div>
        <div className="flex items-center justify-between text-xs text-testo-tenue">
          <span className="flex items-center gap-1.5">
            <Fuel className="size-3.5" aria-hidden="true" />
            Carburante
          </span>
          <span className="tabular-nums text-testo">
            {numero(carburante, 1)} / {numero(nave.serbatoio)}
          </span>
        </div>
        <div
          className="mt-1 h-1.5 overflow-hidden rounded-full bg-bordo/60"
          role="meter"
          aria-label="Carburante"
          aria-valuemin={0}
          aria-valuemax={nave.serbatoio}
          aria-valuenow={Math.round(carburante * 10) / 10}
        >
          <div className="h-full rounded-full bg-nebula" style={{ width: `${(carburante / nave.serbatoio) * 100}%` }} />
        </div>
        <p className="m-0 mt-1 text-[11px] text-testo-tenue">
          {volo ? 'Si ricarica da ferma' : pieno > 0 ? `Pieno tra ${durata(pieno)}${accelerata ? ' · ricarica stellare ×3' : ''}` : 'Serbatoio pieno'}
        </p>
      </div>
    </section>
  )
}
