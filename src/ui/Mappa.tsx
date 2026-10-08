import { Suspense, lazy, useMemo, useState } from 'react'
import { Navigation } from 'lucide-react'
import type { Scansione, Scoperta } from '../dati'
import { CATALOGO } from '../dominio/catalogo'
import { corpiNoti } from '../dominio/mappa'
import { inViaggio, type Nave, type Viaggio } from '../dominio/navigazione'
import { distanza, settore, stessoSettore, type Coordinate } from '../dominio/settore'
import { coordinate, orario, settori } from './formato'
import { SimboloRarita } from './plancia'
import { vaiA } from './indirizzo'
import { Menu } from './Menu'

// three.js pesa: si carica a parte, come la scena del ponte.
const Mappa3D = lazy(async () => ({ default: (await import('../grafica/Mappa3D')).Mappa3D }))

interface Props {
  nave: Nave
  viaggio: Viaggio | null
  scoperte: Scoperta[]
  scansioni: Scansione[]
}

/**
 * La mappa dei settori scansionati (doc/02-meccaniche.md#scanner): tutto ciò
 * che lo scanner ha visto nelle soste, più le scoperte. Toccando un corpo se
 * ne vede la scheda e si può impostare la rotta.
 */
export function Mappa({ nave, viaggio, scoperte, scansioni }: Props) {
  const ora = new Date()
  const punti = useMemo(() => corpiNoti(scansioni, scoperte), [scansioni, scoperte])
  const [scelto, setScelto] = useState<Coordinate | null>(null)
  const punto = scelto && punti.find((p) => stessoSettore(p.coordinate, scelto))
  const scoperta = scelto && scoperte.find((s) => stessoSettore(s.coordinate, scelto))
  const volo = inViaggio(nave, ora)
  const rotta = useMemo(() => (viaggio ? { da: viaggio.da, a: viaggio.a } : null), [viaggio])

  return (
    <main className="relative h-dvh overflow-hidden bg-black">
      <Suspense fallback={null}>
        <Mappa3D punti={punti} soste={scansioni} nave={nave.posizione} rotta={rotta} selezionato={scelto} onSeleziona={setScelto} />
      </Suspense>
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between gap-3 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <header className="pointer-events-auto flex items-start justify-between gap-2">
          <div className="rounded-plancia border border-linea/70 bg-pannello/75 px-3 py-2 backdrop-blur">
            <h1 className="m-0 text-sm font-semibold">Mappa</h1>
            <p className="m-0 text-[11px] text-testo-tenue">
              {punti.length} {punti.length === 1 ? 'corpo noto' : 'corpi noti'} · {scansioni.length}{' '}
              {scansioni.length === 1 ? 'sosta' : 'soste'}
            </p>
          </div>
          <Menu attuale="mappa" />
        </header>

        <section className="pointer-events-auto w-full max-w-md self-start">
          {punto ? (
            <div className="flex flex-col gap-2 rounded-plancia border border-linea/70 bg-pannello/80 p-3 text-xs backdrop-blur">
              <div className="flex items-start gap-2">
                <SimboloRarita rarita={CATALOGO[punto.tipo].rarita} className="w-3 shrink-0 text-center" />
                <div className="flex-1">
                  <p className="m-0 text-sm">{scoperta ? settore(punto.coordinate).corpo?.nome : CATALOGO[punto.tipo].nome}</p>
                  <p className="m-0 text-testo-tenue">
                    {scoperta ? `${CATALOGO[punto.tipo].nome} · ` : ''}
                    {coordinate(punto.coordinate)} · a {settori(distanza(nave.posizione, punto.coordinate))}
                  </p>
                  <p className="m-0 text-testo-tenue">
                    {scoperta ? `Scoperto ${orario(scoperta.scoperta, ora)}` : 'Rilevato dallo scanner: il nome si scopre arrivando'}
                  </p>
                </div>
              </div>
              {!stessoSettore(punto.coordinate, nave.posizione) && (
                <button
                  type="button"
                  disabled={volo}
                  className="flex items-center justify-center gap-1.5 rounded-plancia bg-ambra px-3 py-2 text-sm font-medium text-su-ambra disabled:opacity-40"
                  onClick={() => vaiA({ pagina: 'ponte', meta: punto.coordinate })}
                >
                  <Navigation className="size-4" aria-hidden="true" />
                  {volo ? 'In viaggio: la rotta si sceglie all’arrivo' : 'Imposta la rotta'}
                </button>
              )}
            </div>
          ) : (
            <p className="m-0 rounded-plancia border border-linea/70 bg-pannello/75 p-3 text-xs text-testo-tenue backdrop-blur">
              Tocca un corpo per vederne la scheda. Pieni i corpi scoperti, ad anello quelli solo rilevati; la nave è blu,
              la base bianca. Un quadretto della griglia è un settore.
            </p>
          )}
        </section>
      </div>
    </main>
  )
}
