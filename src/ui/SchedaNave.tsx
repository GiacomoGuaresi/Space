import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { Raccolto } from '../dati'
import { coordinateBasi, coordinatePonti, type Insediamento } from '../dominio/insediamenti'
import { raggioQui, type Dintorni, type Nave } from '../dominio/navigazione'
import { capacitaNave, RISORSE, type Carico, type Fatte, type Quantita } from '../dominio/risorse'
import { NOMI_RISORSE } from '../dominio/catalogo'
import { numero } from './formato'
import { Coda, Potenziamenti, STATISTICHE_ATTIVE } from './Cantiere'
import { Etichetta, Info, Numero, Pannello } from './plancia'

/** Quello che c'è a bordo adesso, raccolta a mano compresa: lo calcola l'App ogni secondo. */
export const CaricoAttuale = createContext<{
  carico: Carico
  quantita: Quantita
  capacita: number
  raccolti: readonly Raccolto[]
  insediamenti: readonly Insediamento[]
  /** Le ricerche completate: cambiano capacità, costi e tempi. */
  fatte: Fatte
} | null>(null)

/** Le ricerche fatte, le basi e i ponti, per i conti del carburante (navigazione.ts, `Dintorni`). */
export function useDintorni(): Dintorni {
  const bordo = useContext(CaricoAttuale)
  return useMemo(
    () =>
      bordo ? { fatte: bordo.fatte, basi: coordinateBasi(bordo.insediamenti), ponti: coordinatePonti(bordo.insediamenti) } : {},
    [bordo?.fatte, bordo?.insediamenti],
  )
}

/**
 * La Nave (doc/11-interfaccia.md#nave): le statistiche e la stiva, una barra
 * per risorsa. I potenziamenti arrivano col cantiere (M5).
 */
export function SchedaNave({ nave, quantita, ora }: { nave: Nave; quantita: Quantita; ora: Date }) {
  const fatte = useContext(CaricoAttuale)?.fatte
  const capacita = capacitaNave(nave.stiva, fatte)
  return (
    <Pannello className="flex min-h-0 flex-1 flex-col overflow-y-auto" etichetta="Nave">
      <header className="flex flex-col gap-1 border-b border-linea p-3.5">
        <h1 className="m-0 text-base font-semibold tracking-[0.2em] uppercase">Nave</h1>
        <Etichetta>Una sola, per sempre · si potenzia nel cantiere di una base</Etichetta>
      </header>

      <section aria-label="Statistiche" className="border-b border-separatore p-3.5">
        <h2 className="etichetta m-0 mb-2">Statistiche</h2>
        <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-[13px]">
          <Riga nome={`Motore · liv. ${nave.livelli.motore}`}>{numero(nave.velocita, 2)} sett./h</Riga>
          <Riga nome={`Serbatoio · liv. ${nave.livelli.serbatoio}`}>{numero(nave.serbatoio, 1)} unità</Riga>
          <Riga nome={`Ricarica · liv. ${nave.livelli.ricarica}`}>{numero(nave.ricarica, 2)} unità/h</Riga>
          <Riga nome={`Scanner · liv. ${nave.scanner}`}>
            raggio {numero(raggioQui(nave.scanner, nave.posizione, fatte), 1)} sett.
          </Riga>
          <Riga nome={`Stiva · liv. ${nave.stiva}`}>
            <span className="inline-flex items-center gap-1.5">
              {numero(capacita, 0)} per risorsa
              <Info
                titolo="Stiva"
                wiki="nave"
                formula={`25 × 1,5^(livello − 1) = 25 × 1,5^${nave.stiva - 1}`}
                esatto={numero(capacita, 2)}
              />
            </span>
          </Riga>
        </dl>
      </section>

      <section aria-label="Potenziamenti" className="border-b border-separatore p-3.5">
        <h2 className="etichetta m-0 mb-1">Potenziamenti</h2>
        <Potenziamenti nave={nave} ora={ora} lavori={STATISTICHE_ATTIVE} />
        <h3 className="etichetta m-0 mt-3 mb-2">Coda del cantiere</h3>
        <Coda coda="nave" ora={ora} />
      </section>

      <section aria-label="Stiva" className="p-3.5">
        <h2 className="etichetta m-0 mb-2">Stiva</h2>
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {RISORSE.map((r) => {
            const q = quantita[r]
            const pieno = Math.min(1, q / capacita)
            return (
              <li key={r} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between text-[13px]">
                  <span>{NOMI_RISORSE[r]}</span>
                  <span className="cifre text-testo-tenue">
                    <Numero valore={q} className="text-testo" /> / <Numero valore={capacita} />
                  </span>
                </div>
                <div
                  className="h-1.5 bg-[#211a10]"
                  role="meter"
                  aria-label={NOMI_RISORSE[r]}
                  aria-valuemin={0}
                  aria-valuemax={capacita}
                  aria-valuenow={Math.round(q)}
                >
                  <div className={`h-full ${pieno >= 1 ? 'bg-ambra' : 'bg-ambra-scura'}`} style={{ width: `${pieno * 100}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
        <p className="m-0 mt-3 text-xs text-testo-tenue">
          Nessuno scarico: si spende dalla stiva, insieme al magazzino della base dove si costruisce.
        </p>
      </section>
    </Pannello>
  )
}

function Riga({ nome, children }: { nome: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-testo-tenue">{nome}</dt>
      <dd className="cifre m-0 text-right">{children}</dd>
    </>
  )
}
