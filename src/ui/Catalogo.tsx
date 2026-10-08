import { useMemo, type ReactNode } from 'react'
import type { Scoperta } from '../dati'
import { CATALOGO, TIPI } from '../dominio/catalogo'
import type { Nave, Viaggio } from '../dominio/navigazione'
import { settore } from '../dominio/settore'
import { COLORI_RARITA } from './colori'
import { Cornice } from './Cornice'
import { coordinatePlancia, orario } from './formato'
import { Etichetta, Pannello, SimboloRarita } from './plancia'

interface Props {
  nave: Nave
  viaggio: Viaggio | null
  scarto: number
  scoperte: Scoperta[]
  fondo?: ReactNode
}

/** La pagina del catalogo, sul telefono. */
export function Catalogo({ nave, viaggio, scarto, scoperte, fondo }: Props) {
  return (
    <Cornice pagina="catalogo" nave={nave} viaggio={viaggio} scarto={scarto} fondo={fondo}>
      <ContenutoCatalogo scoperte={scoperte} />
    </Cornice>
  )
}

/**
 * Il catalogo delle scoperte (doc/02-meccaniche.md): quanti corpi di ogni tipo
 * e l'elenco, dal più recente. È la parte collezionabile del gioco.
 */
export function ContenutoCatalogo({ scoperte }: { scoperte: readonly Scoperta[] }) {
  const ora = new Date()
  const perTipo = useMemo(() => {
    const conti = new Map(TIPI.map((t) => [t, 0]))
    for (const s of scoperte) conti.set(s.tipo, (conti.get(s.tipo) ?? 0) + 1)
    return conti
  }, [scoperte])
  const tipiTrovati = TIPI.filter((t) => (perTipo.get(t) ?? 0) > 0).length

  return (
    <Pannello className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3.5" etichetta="Catalogo">
      <header>
        <h1 className="m-0 text-base font-semibold tracking-[0.2em] uppercase">Catalogo</h1>
        <Etichetta>
          {scoperte.length} {scoperte.length === 1 ? 'scoperta' : 'scoperte'} · {tipiTrovati} tipi su {TIPI.length}
        </Etichetta>
      </header>

      <ul className="m-0 grid list-none grid-cols-2 gap-1.5 p-0 sm:grid-cols-5">
        {TIPI.map((t) => {
          const quanti = perTipo.get(t) ?? 0
          return (
            <li key={t} className={`rounded-plancia border border-separatore p-2 text-xs ${quanti ? '' : 'opacity-45'}`}>
              <span className={`etichetta block ${COLORI_RARITA[CATALOGO[t].rarita].testo}`}>
                <SimboloRarita rarita={CATALOGO[t].rarita} /> {CATALOGO[t].rarita}
              </span>
              <span className="block">{quanti ? CATALOGO[t].nome : '■■■'}</span>
              <span className="cifre block text-lg font-medium">{quanti}</span>
            </li>
          )
        })}
      </ul>

      {scoperte.length === 0 ? (
        <p className="m-0 text-sm text-testo-tenue">
          Ancora niente: scegli un corpo dallo scanner del ponte e parti. Arrivando, lo scopri.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {scoperte.map((s) => {
            const corpo = settore(s.coordinate).corpo
            const chiave = `${s.coordinate.x},${s.coordinate.y},${s.coordinate.z}`
            return (
              <li key={chiave} className="flex items-center gap-2 border-b border-separatore py-2 text-xs">
                <SimboloRarita rarita={CATALOGO[s.tipo].rarita} className="w-3 shrink-0 text-center" />
                <span className="flex-1">
                  <span className="block text-sm font-semibold tracking-[0.08em] uppercase">{corpo?.nome ?? '—'}</span>
                  <span className="text-testo-tenue">
                    {CATALOGO[s.tipo].nome} · <span className="cifre">{coordinatePlancia(s.coordinate)}</span>
                  </span>
                </span>
                <span className="shrink-0 text-testo-tenue">{orario(s.scoperta, ora)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </Pannello>
  )
}
