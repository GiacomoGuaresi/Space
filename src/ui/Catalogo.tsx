import { useMemo } from 'react'
import type { Scoperta } from '../dati'
import { CATALOGO, TIPI } from '../dominio/catalogo'
import { COLORI_RARITA } from './colori'
import { settore } from '../dominio/settore'
import { coordinate, orario } from './formato'
import { SimboloRarita } from './plancia'
import { Menu } from './Menu'

/**
 * Il catalogo delle scoperte (doc/02-meccaniche.md): quanti corpi di ogni tipo
 * e l'elenco, dal più recente. È la parte collezionabile del gioco.
 */
export function Catalogo({ scoperte }: { scoperte: Scoperta[] }) {
  const ora = new Date()
  const perTipo = useMemo(() => {
    const conti = new Map(TIPI.map((t) => [t, 0]))
    for (const s of scoperte) conti.set(s.tipo, (conti.get(s.tipo) ?? 0) + 1)
    return conti
  }, [scoperte])
  const tipiTrovati = TIPI.filter((t) => (perTipo.get(t) ?? 0) > 0).length

  return (
    <main className="min-h-dvh bg-fondo p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="mx-auto flex max-w-2xl flex-col gap-3">
        <header className="flex items-center justify-between gap-2">
          <div>
            <h1 className="m-0 text-lg font-semibold">Catalogo</h1>
            <p className="m-0 text-xs text-testo-tenue">
              {scoperte.length} {scoperte.length === 1 ? 'scoperta' : 'scoperte'} · {tipiTrovati} tipi su {TIPI.length}
            </p>
          </div>
          <Menu attuale="catalogo" />
        </header>

        <ul className="m-0 grid list-none grid-cols-2 gap-1.5 p-0 sm:grid-cols-5">
          {TIPI.map((t) => {
            const quanti = perTipo.get(t) ?? 0
            return (
              <li
                key={t}
                className={`rounded-plancia border border-linea/70 bg-pannello p-2 text-xs ${quanti ? '' : 'opacity-45'}`}
              >
                <span className={`block text-[11px] ${COLORI_RARITA[CATALOGO[t].rarita].testo}`}>{CATALOGO[t].rarita}</span>
                <span className="block">{quanti ? CATALOGO[t].nome : '???'}</span>
                <span className="block text-lg font-semibold tabular-nums">{quanti}</span>
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
                <li key={chiave} className="flex items-center gap-2 rounded-plancia border border-linea/70 bg-pannello px-3 py-2 text-xs">
                  <SimboloRarita rarita={CATALOGO[s.tipo].rarita} className="w-3 shrink-0 text-center" />
                  <span className="flex-1">
                    <span className="block text-sm">{corpo?.nome ?? '—'}</span>
                    <span className="text-testo-tenue">
                      {CATALOGO[s.tipo].nome} · {coordinate(s.coordinate)}
                    </span>
                  </span>
                  <span className="shrink-0 text-testo-tenue">{orario(s.scoperta, ora)}</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </main>
  )
}
