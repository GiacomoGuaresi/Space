import { useMemo } from 'react'
import { Check } from 'lucide-react'
import { CATALOGO } from '../dominio/catalogo'
import { raggioScanner, scansione } from '../dominio/navigazione'
import { tipoSettore, type Coordinate } from '../dominio/settore'
import { COLORI_RARITA } from './colori'
import { coordinate, settori } from './formato'

interface Props {
  centro: Coordinate
  /** Le chiavi "x,y,z" dei settori già scoperti. */
  scoperti: ReadonlySet<string>
  onScegli: (meta: Coordinate) => void
}

/**
 * I corpi attorno alla nave, dal più vicino. Lo scanner vede il tipo, non il
 * nome: quello si scopre arrivando.
 */
export function Scanner({ centro, scoperti, onScegli }: Props) {
  const tipoQui = tipoSettore(centro)
  const raggio = raggioScanner(tipoQui)
  const trovati = useMemo(() => scansione(centro, raggio), [centro, raggio])

  return (
    <div className="flex flex-col gap-1.5">
      <p className="m-0 text-xs text-testo-tenue">
        Raggio {settori(raggio)}
        {tipoQui === 'nebulosa' ? ' · ridotto dalla nebulosa' : tipoQui === 'pulsar' ? ' · raddoppiato dalla pulsar' : ''}
      </p>
      {trovati.length === 0 ? (
        <p className="m-0 text-xs">Nessun corpo nel raggio dello scanner. Prova a spostarti.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {trovati.map(({ coordinate: c, tipo, distanza }) => {
            const chiave = `${c.x},${c.y},${c.z}`
            return (
              <li key={chiave}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 text-left text-xs hover:border-bordo hover:bg-fondo/50"
                  onClick={() => onScegli(c)}
                >
                  <span className={`size-2 shrink-0 rounded-full ${COLORI_RARITA[CATALOGO[tipo].rarita].punto}`} aria-hidden="true" />
                  <span className="flex-1">
                    {CATALOGO[tipo].nome}
                    <span className="text-testo-tenue"> · {coordinate(c)}</span>
                  </span>
                  {scoperti.has(chiave) && <Check className="size-3.5 text-[#7fd1a8]" aria-label="Già scoperto" />}
                  <span className="shrink-0 tabular-nums text-testo-tenue">{settori(distanza)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
