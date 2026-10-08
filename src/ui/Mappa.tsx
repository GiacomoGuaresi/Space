import { Suspense, lazy, useMemo, useState, type ReactNode } from 'react'
import { Navigation } from 'lucide-react'
import type { Scansione, Scoperta } from '../dati'
import { CATALOGO } from '../dominio/catalogo'
import { corpiNoti } from '../dominio/mappa'
import { anteprima, inViaggio, type Nave, type Viaggio } from '../dominio/navigazione'
import { distanza, settore, stessoSettore, type Coordinate } from '../dominio/settore'
import { COLORI_RARITA } from './colori'
import { Cornice } from './Cornice'
import { coordinatePlancia, durata, numero, orario } from './formato'
import { vaiA } from './indirizzo'
import { BottonePrimario, Etichetta, Pannello, SimboloRarita } from './plancia'
import { useOra } from './useNave'

// three.js pesa: si carica a parte, come la scena del ponte.
const Mappa3D = lazy(async () => ({ default: (await import('../grafica/Mappa3D')).Mappa3D }))

interface Props {
  nave: Nave
  viaggio: Viaggio | null
  scarto: number
  scoperte: Scoperta[]
  scansioni: Scansione[]
}

/**
 * La mappa dei settori scansionati (doc/02-meccaniche.md#scanner): tutto ciò
 * che lo scanner ha visto nelle soste, più le scoperte. Toccando un corpo se
 * ne vede la scheda e si può impostare la rotta.
 */
export function Mappa({ nave, viaggio, scarto, scoperte, scansioni }: Props) {
  const ora = useOra(scarto)
  const punti = useMemo(() => corpiNoti(scansioni, scoperte), [scansioni, scoperte])
  const [scelto, setScelto] = useState<Coordinate | null>(null)
  const punto = scelto && punti.find((p) => stessoSettore(p.coordinate, scelto))
  const scoperta = scelto && scoperte.find((s) => stessoSettore(s.coordinate, scelto))
  const volo = inViaggio(nave, ora)
  const rotta = useMemo(() => (viaggio ? { da: viaggio.da, a: viaggio.a } : null), [viaggio])
  const prova = punto && !volo && !stessoSettore(punto.coordinate, nave.posizione) ? anteprima(nave, punto.coordinate, ora) : null

  return (
    <Cornice
      pagina="mappa"
      nave={nave}
      viaggio={viaggio}
      scarto={scarto}
      fondo={
        <Suspense fallback={null}>
          <Mappa3D punti={punti} soste={scansioni} nave={nave.posizione} rotta={rotta} selezionato={scelto} onSeleziona={setScelto} />
        </Suspense>
      }
    >
      {punto ? (
        <Pannello className="flex flex-col gap-2.5 p-3.5" etichetta="Corpo scelto">
          <div className="flex items-baseline justify-between gap-2">
            <Etichetta className={COLORI_RARITA[CATALOGO[punto.tipo].rarita].testo}>
              <SimboloRarita rarita={CATALOGO[punto.tipo].rarita} /> {CATALOGO[punto.tipo].nome} · {CATALOGO[punto.tipo].rarita} ·{' '}
              {scoperta ? 'visitato' : 'non visitato'}
            </Etichetta>
            <span className="cifre shrink-0 text-xs text-testo-tenue">{coordinatePlancia(punto.coordinate)}</span>
          </div>
          {scoperta && (
            <p className="m-0 text-base font-semibold tracking-[0.1em] uppercase">{settore(punto.coordinate).corpo?.nome}</p>
          )}
          <div className="flex gap-5">
            <Valore etichetta="Distanza">{numero(distanza(nave.posizione, punto.coordinate), 1)} sett.</Valore>
            {prova && <Valore etichetta="Durata">{durata(prova.durata)}</Valore>}
            {prova && <Valore etichetta="Carb">{numero(prova.consumo, 1)}</Valore>}
          </div>
          {prova?.fermata && prova.possibile && (
            <p className="m-0 text-xs text-ambra">Il carburante non basta: ci si fermerà in {coordinatePlancia(prova.a)}.</p>
          )}
          <p className="m-0 text-xs text-testo-tenue">
            {scoperta ? `Scoperto ${orario(scoperta.scoperta, ora)}` : 'Rilevato dallo scanner: il nome si scopre arrivando.'}
          </p>
          {!stessoSettore(punto.coordinate, nave.posizione) && (
            <BottonePrimario disabled={volo} onClick={() => vaiA({ pagina: 'ponte', meta: punto.coordinate })}>
              <Navigation className="size-4" aria-hidden="true" />
              {volo ? 'In viaggio' : 'Imposta rotta'}
            </BottonePrimario>
          )}
        </Pannello>
      ) : (
        <Pannello className="p-3 text-xs text-testo-tenue">
          <span className="cifre text-testo">{punti.length}</span> {punti.length === 1 ? 'corpo noto' : 'corpi noti'} ·{' '}
          <span className="cifre text-testo">{scansioni.length}</span> {scansioni.length === 1 ? 'sosta' : 'soste'}. Tocca un
          corpo per la sua scheda: pieni i visitati, vuoti quelli solo rilevati. Un quadretto è un settore.
        </Pannello>
      )}
    </Cornice>
  )
}

function Valore({ etichetta, children }: { etichetta: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <Etichetta>{etichetta}</Etichetta>
      <span className="cifre text-[15px]">{children}</span>
    </div>
  )
}
