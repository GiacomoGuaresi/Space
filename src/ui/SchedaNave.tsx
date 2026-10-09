import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { Raccolto } from '../dati'
import { coordinateBasi, coordinatePonti, type Insediamento } from '../dominio/insediamenti'
import { carburanteOra, inViaggio, raggioQui, tettoQui, velocitaNave, type Dintorni, type Nave } from '../dominio/navigazione'
import { capacitaNave, RISORSE, type Carico, type Fatte, type Quantita } from '../dominio/risorse'
import { NOMI_RISORSE } from '../dominio/catalogo'
import { BASE, settore, stessoSettore } from '../dominio/settore'
import { coordinatePlancia, numero, orario } from './formato'
import { Coda, Potenziamenti, STATISTICHE_ATTIVE } from './Cantiere'
import { IconaCantiere, IconaFerma, IconaInVolo, IconaNave, IconaProgetti, IconaRisorsa, IconaStiva, IconaSistemi } from './icone'
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
 * La Nave (doc/11-interfaccia.md#nave), come una plancia di gioco: in alto la
 * nave con lo stato e tre indicatori; sotto i sistemi, un modulo per
 * statistica col potenziamento dentro; di lato la coda del cantiere e la stiva.
 * Le colonne seguono la larghezza (container query): una sul telefono, due
 * o tre nella finestra del PC.
 */
export function SchedaNave({ nave, quantita, ora }: { nave: Nave; quantita: Quantita; ora: Date }) {
  const bordo = useContext(CaricoAttuale)
  const fatte = bordo?.fatte
  const dintorni = useDintorni()
  const capacita = capacitaNave(nave.stiva, fatte)
  const carburante = carburanteOra(nave, ora, dintorni)
  const tetto = tettoQui(nave, nave.posizione, dintorni)
  const carico = RISORSE.reduce((t, r) => t + Math.min(quantita[r], capacita), 0) / (capacita * RISORSE.length)
  const livelli = nave.livelli.motore + nave.livelli.serbatoio + nave.livelli.ricarica + nave.scanner + nave.stiva
  const volo = inViaggio(nave, ora)
  const base = bordo?.insediamenti.find((i) => stessoSettore(i.coordinate, nave.posizione))
  const nomeBase = stessoSettore(nave.posizione, BASE) ? 'Base madre' : (settore(nave.posizione).corpo?.nome ?? 'Base')

  const attuali = {
    motore: `${numero(velocitaNave(nave, fatte), 2)} sett./h`,
    serbatoio: `${numero(nave.serbatoio, 1)} unità`,
    ricarica: `${numero(nave.ricarica, 2)} unità/h`,
    scanner: `raggio ${numero(raggioQui(nave.scanner, nave.posizione, fatte), 1)} sett.`,
    stiva: (
      <span className="inline-flex items-center gap-1.5">
        {numero(capacita, 0)} per risorsa
        <Info titolo="Stiva" wiki="nave" formula={`25 × 1,5^(livello − 1) = 25 × 1,5^${nave.stiva - 1}`} esatto={numero(capacita, 2)} />
      </span>
    ),
  }

  return (
    <Pannello className="@container flex min-h-0 flex-1 flex-col overflow-y-auto" etichetta="Nave">
      <div className="grid gap-3 p-3 @3xl:grid-cols-[minmax(0,1fr)_minmax(260px,310px)]">
        {/* La nave: stato e indicatori. */}
        <header className="smussato relative flex flex-col gap-3 overflow-hidden border border-ambra-scura/70 bg-barra/80 p-3.5 [--smusso-colore:color-mix(in_oklab,var(--color-ambra-scura)_70%,transparent)] [--smusso:14px] @xl:flex-row @xl:items-center @3xl:col-span-2">
          <Griglia />
          <div className="relative flex items-center gap-3.5 @xl:min-w-0 @xl:flex-1">
            <span className="smussato relative grid size-16 shrink-0 place-items-center border border-ambra-scura bg-[radial-gradient(circle,rgb(255_181_71/0.18),transparent_70%)] text-ambra [--smusso-colore:var(--color-ambra-scura)] [--smusso:10px]">
              <IconaNave className="size-9 drop-shadow-[0_0_8px_rgb(255_181_71/0.5)]" />
            </span>
            <div className="flex min-w-0 flex-col gap-1.5">
              <h1 className="m-0 text-lg leading-none font-semibold tracking-[0.3em] uppercase">Nave</h1>
              <Etichetta>Una sola, per sempre · si potenzia nel cantiere di una base</Etichetta>
              <div className="flex flex-wrap gap-1.5">
                <Chip accesa={volo}>
                  {volo ? <IconaInVolo className="size-3.5" /> : <IconaFerma className="size-3.5" />}
                  {volo ? `In viaggio · arrivo ${orario(nave.dal, ora)}` : base ? `Attraccata · ${nomeBase}` : 'Ferma nello spazio'}
                </Chip>
                <Chip>
                  <span className="cifre">{coordinatePlancia(nave.posizione)}</span>
                </Chip>
                {nave.progetti > 0 && (
                  <Chip accesa>
                    <IconaProgetti className="size-3.5" />
                    {nave.progetti} {nave.progetti === 1 ? 'progetto' : 'progetti'} · ricerca a metà prezzo
                  </Chip>
                )}
              </div>
            </div>
          </div>
          <div className="relative grid grid-cols-3 gap-2 @xl:w-[min(52%,420px)] @xl:shrink-0">
            <Indicatore nome="Carburante" valore={`${numero(carburante, 1)}`} su={`/ ${numero(nave.serbatoio, 1)}`} parte={carburante / nave.serbatoio} tetto={tetto / nave.serbatoio} />
            <Indicatore nome="Stiva" valore={`${numero(carico * 100, 0)}%`} su="piena" parte={carico} />
            <Indicatore nome="Livelli" valore={String(livelli)} />
          </div>
        </header>

        {/* Sul telefono prima la coda e la stiva, poi i moduli lunghi. */}
        <Modulo className="order-1 @3xl:order-none" titolo="Sistemi" icona={<IconaSistemi className="size-4" />} nota="Si potenziano attraccati a una base con cantiere">
          <Potenziamenti nave={nave} ora={ora} lavori={STATISTICHE_ATTIVE} aspetto="moduli" attuali={attuali} />
        </Modulo>

        <div className="flex flex-col gap-3">
          <Modulo titolo="Cantiere" icona={<IconaCantiere className="size-4" />}>
            <Coda coda="nave" ora={ora} />
          </Modulo>

          <Modulo
            titolo="Stiva"
            icona={<IconaStiva className="size-4" />}
            nota={
              <span className="cifre">
                <Numero valore={capacita} /> per risorsa
              </span>
            }
          >
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {RISORSE.map((r) => {
                const q = quantita[r]
                const pieno = Math.min(1, q / capacita)
                return (
                  <li key={r} className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between text-[13px]">
                      <span className="flex items-center gap-1.5">
                        <IconaRisorsa risorsa={r} className="size-4 text-ambra" />
                        {NOMI_RISORSE[r]}
                      </span>
                      <span className="cifre text-xs text-testo-tenue">
                        <Numero valore={q} className={pieno >= 1 ? 'text-ambra' : 'text-testo'} /> / <Numero valore={capacita} />
                      </span>
                    </div>
                    <Barra parte={pieno} nome={NOMI_RISORSE[r]} massimo={capacita} valore={q} />
                  </li>
                )
              })}
            </ul>
            <p className="m-0 mt-3 text-xs leading-snug text-testo-tenue">
              Nessuno scarico: si spende dalla stiva, insieme al magazzino della base dove si costruisce.
            </p>
          </Modulo>
        </div>
      </div>
    </Pannello>
  )
}

/** Un pannello annidato: la testata con l'icona e il titolo, poi il contenuto. */
function Modulo({
  titolo,
  icona,
  nota,
  className = '',
  children,
}: {
  titolo: string
  icona: ReactNode
  nota?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section
      aria-label={titolo}
      className={`smussato @container flex min-w-0 flex-col border border-linea/70 bg-fondo/40 [--smusso-colore:color-mix(in_oklab,var(--color-linea)_70%,transparent)] ${className}`}
    >
      <h2 className="m-0 flex items-center gap-2 border-b border-separatore bg-linear-to-r from-ambra/10 to-transparent px-3 py-2">
        <span className="text-ambra">{icona}</span>
        <span className="etichetta text-testo!">{titolo}</span>
        <span aria-hidden="true" className="h-px flex-1 bg-linear-to-r from-linea/60 to-transparent" />
        {nota && <span className="text-[11px] font-normal tracking-normal text-testo-tenue normal-case">{nota}</span>}
      </h2>
      <div className="p-3">{children}</div>
    </section>
  )
}

/** Una barra a tacche: piena in ambra, con il segno del tetto se c'è. */
function Barra({ parte, tetto, nome, massimo, valore }: { parte: number; tetto?: number; nome: string; massimo: number; valore: number }) {
  const pc = (n: number) => `${Math.max(0, Math.min(1, n)) * 100}%`
  return (
    <div
      className="relative h-2 bg-[#211a10] [mask-image:repeating-linear-gradient(90deg,#000_0_5px,transparent_5px_7px)]"
      role="meter"
      aria-label={nome}
      aria-valuemin={0}
      aria-valuemax={Math.round(massimo)}
      aria-valuenow={Math.round(valore)}
    >
      <div className={`h-full ${parte >= 1 ? 'bg-ambra' : 'bg-ambra-scura'}`} style={{ width: pc(parte) }} />
      {tetto !== undefined && tetto < 1 && <div className="absolute inset-y-0 w-[2px] bg-testo-tenue" style={{ left: pc(tetto) }} />}
    </div>
  )
}

/** Un indicatore della testata: il nome, il valore grande e, se c'è, la barra. */
function Indicatore({ nome, valore, su, parte, tetto }: { nome: string; valore: string; su?: string; parte?: number; tetto?: number }) {
  return (
    <div className="smussato flex min-w-0 flex-col gap-1 border border-separatore bg-pannello/80 px-2.5 py-2 [--smusso-colore:var(--color-separatore)] [--smusso:6px]">
      <Etichetta className="truncate text-[9px] tracking-[0.1em]!">{nome}</Etichetta>
      <span className="flex items-baseline gap-1 truncate">
        <span className="cifre text-lg leading-none font-semibold text-ambra [text-shadow:0_0_12px_rgb(255_181_71/0.35)]">{valore}</span>
        {su && <span className="cifre truncate text-[10px] text-testo-tenue">{su}</span>}
      </span>
      {parte !== undefined ? (
        <Barra parte={parte} tetto={tetto} nome={nome} massimo={100} valore={parte * 100} />
      ) : (
        <span aria-hidden="true" className="h-2" />
      )}
    </div>
  )
}

/** Un'etichetta di stato con il bordo, accesa in ambra se conta. */
function Chip({ accesa = false, children }: { accesa?: boolean; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2 py-0.5 text-[11px] ${accesa ? 'border-ambra-scura/70 text-ambra' : 'border-separatore text-testo-tenue'}`}
    >
      {children}
    </span>
  )
}

/** La trama di fondo della testata: una griglia tenue, che sfuma verso destra. */
function Griglia() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgb(255_181_71/0.05)_1px,transparent_1px),linear-gradient(90deg,rgb(255_181_71/0.05)_1px,transparent_1px)] bg-size-[16px_16px] [mask-image:linear-gradient(90deg,#000,transparent_80%)]"
    />
  )
}
