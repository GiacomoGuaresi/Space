import type { TraguardoRaggiunto } from '../dati'
import { NOMI_FAMIGLIE, TRAGUARDI, type Famiglia } from '../dominio/traguardi'
import { Etichetta, Pannello } from './plancia'

const FAMIGLIE = Object.keys(NOMI_FAMIGLIE) as Famiglia[]

/** La data di una medaglia, come la si scrive: "9 ottobre 2026". */
const data = (d: Date) => d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })

/**
 * I Traguardi (doc/11-interfaccia.md#altro): le medaglie con data, divise per
 * famiglia. Quelle ancora da prendere restano spente, con quello che chiedono.
 */
export function Traguardi({ raggiunti }: { raggiunti: readonly TraguardoRaggiunto[] }) {
  const quando = new Map(raggiunti.map((t) => [t.codice, t.istante]))
  const presi = TRAGUARDI.filter((t) => quando.has(t.codice)).length
  return (
    <Pannello className="flex min-h-0 flex-1 flex-col overflow-y-auto" etichetta="Traguardi">
      <header className="flex flex-col gap-1 border-b border-linea p-3.5">
        <h1 className="m-0 text-base font-semibold tracking-[0.2em] uppercase">Traguardi</h1>
        <Etichetta>
          {presi} di {TRAGUARDI.length} medaglie · senza ricompense, solo la data
        </Etichetta>
      </header>
      {FAMIGLIE.map((f) => {
        const elenco = TRAGUARDI.filter((t) => t.famiglia === f)
        return (
          <section key={f} aria-label={NOMI_FAMIGLIE[f]} className="border-b border-separatore p-3.5 last:border-b-0">
            <h2 className="etichetta m-0 mb-2">
              {NOMI_FAMIGLIE[f]} · {elenco.filter((t) => quando.has(t.codice)).length}/{elenco.length}
            </h2>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {elenco.map((t) => {
                const il = quando.get(t.codice)
                return (
                  <li key={t.codice} className={`flex items-baseline gap-2 text-[13px] ${il ? '' : 'text-testo-tenue'}`}>
                    <span aria-hidden="true" className={il ? 'text-ambra' : 'opacity-50'}>
                      {il ? '★' : '☆'}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span>{t.nome}</span>
                      {!il && <span className="text-xs">{t.chiede}</span>}
                    </span>
                    {il && <span className="cifre shrink-0 text-xs text-testo-tenue">{data(il)}</span>}
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </Pannello>
  )
}
