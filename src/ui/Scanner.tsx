import { useCallback, useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { CATALOGO } from '../dominio/catalogo'
import { raggioScanner, scansione, tipiRilevabili } from '../dominio/navigazione'
import { tipoSettore, type Coordinate } from '../dominio/settore'
import { coordinate, settori } from './formato'
import { MenuContesto, menuCorpo, type Menu } from './MenuContesto'
import { SimboloRarita } from './plancia'
import { usePC } from './schermo'

interface Props {
  centro: Coordinate
  /** Il livello dello scanner: decide raggio e tipi rilevati. */
  livello: number
  /** Le chiavi "x,y,z" dei settori già scoperti. */
  scoperti: ReadonlySet<string>
  onScegli: (meta: Coordinate) => void
}

/**
 * I corpi attorno alla nave, dal più vicino. Lo scanner vede il tipo, non il
 * nome: quello si scopre arrivando. I tipi che non rileva restano invisibili.
 */
export function Scanner({ centro, livello, scoperti, onScegli }: Props) {
  const tipoQui = tipoSettore(centro)
  const raggio = raggioScanner(livello, tipoQui)
  const tipi = useMemo(() => tipiRilevabili(livello), [livello])
  const trovati = useMemo(() => scansione(centro, raggio, tipi), [centro, raggio, tipi])
  // Su PC il tasto destro su un corpo apre il menu: Imposta rotta · Apri nella wiki.
  const pc = usePC()
  const [menu, setMenu] = useState<Menu | null>(null)
  const chiudiMenu = useCallback(() => setMenu(null), [])

  return (
    <div className="flex flex-col gap-1.5">
      <p className="m-0 text-xs text-testo-tenue">
        Raggio {settori(raggio)}
        {tipoQui === 'nebulosa' ? ' · ridotto dalla nebulosa' : tipoQui === 'pulsar' ? ' · raddoppiato dalla pulsar' : ''}
        {' · rileva: '}
        {[...tipi].map((t) => CATALOGO[t].nome.toLowerCase()).join(', ')}
      </p>
      {trovati.length === 0 ? (
        <p className="m-0 text-xs">
          Nessun corpo rilevato nel raggio. Prova a spostarti: gli altri tipi di corpo si scoprono solo arrivandoci.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {trovati.map(({ coordinate: c, tipo, distanza }) => {
            const chiave = `${c.x},${c.y},${c.z}`
            return (
              <li key={chiave}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-plancia border border-transparent px-2 py-1.5 text-left text-xs hover:border-linea hover:bg-fondo/50"
                  onClick={() => onScegli(c)}
                  onContextMenu={(e) => {
                    if (!pc) return
                    e.preventDefault()
                    setMenu(menuCorpo(e.clientX, e.clientY, tipo, c, () => onScegli(c)))
                  }}
                >
                  <SimboloRarita rarita={CATALOGO[tipo].rarita} className="w-3 shrink-0 text-center" />
                  <span className="flex-1">
                    {CATALOGO[tipo].nome}
                    <span className="text-testo-tenue"> · {coordinate(c)}</span>
                  </span>
                  {scoperti.has(chiave) && <Check className="size-3.5 text-[#7fd1c7]" aria-label="Già scoperto" />}
                  <span className="shrink-0 tabular-nums text-testo-tenue">{settori(distanza)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <MenuContesto menu={menu} onChiudi={chiudiMenu} />
    </div>
  )
}
