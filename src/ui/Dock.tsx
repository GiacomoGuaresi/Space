import { Fragment, useContext, type ReactNode } from 'react'
import { Pallini } from './Barra'
import { alterna, apri, FINESTRE, useDisposizione, type IdFinestra, type StatoFinestra } from './finestre'
import { indirizzo, vaiA, type Pagina } from './indirizzo'

// Nave, Rete, Base, Ricerche e Traguardi arrivano con le loro meccaniche (doc/06-roadmap.md).
const GRUPPI: readonly { nome: string; voci: readonly IdFinestra[] }[] = [
  { nome: 'Navigazione', voci: ['qui', 'scanner', 'rotta'] },
  { nome: 'Archivio', voci: ['diario', 'wiki', 'catalogo'] },
]

/** Le voci con un pallino, e quale (Barra.tsx): su PC Altro si scompone nelle sue voci. */
const PALLINI: Partial<Record<IdFinestra, 'ponte' | 'diario' | 'wiki'>> = { qui: 'ponte', diario: 'diario', wiki: 'wiki' }

const NOMI_DOCK: Partial<Record<IdFinestra, string>> = { diario: 'Diario' }

const STILI: Readonly<Record<StatoFinestra, string>> = {
  aperta: 'border-ambra text-ambra',
  ridotta: 'border-ambra-scura/60 text-testo',
  chiusa: 'border-transparent text-testo-tenue hover:text-testo',
}

/**
 * Il dock in basso della plancia per PC (doc/11-interfaccia.md#pc--plancia-a-finestre),
 * al posto della barra a schede: le voci a gruppi e i comandi. Una finestra
 * aperta è accesa, ridotta ha il contorno, chiusa è spenta; i pallini dicono
 * dove c'è qualcosa da vedere.
 */
export function Dock({ attuale }: { attuale: Pagina['pagina'] }) {
  const { finestre } = useDisposizione()
  const pallini = useContext(Pallini)
  const mappa = attuale === 'mappa'
  // Sulla mappa le finestre non si vedono: una voce riporta alla plancia.
  const voce = (id: IdFinestra, contenuto?: ReactNode) => {
    const { titolo, tasto } = FINESTRE[id]
    const stato = mappa ? 'chiusa' : finestre[id].stato
    const pallino = PALLINI[id] && stato !== 'aperta' ? pallini[PALLINI[id]] : undefined
    return (
      <button
        type="button"
        aria-pressed={stato === 'aperta'}
        aria-label={pallino ? `${titolo}, ${pallino}` : titolo}
        title={stato === 'ridotta' ? `${titolo}, ridotta` : titolo}
        className={`${CLASSI} ${STILI[stato]}`}
        onClick={() => {
          if (!mappa) return alterna(id)
          apri(id)
          vaiA({ pagina: 'ponte' })
        }}
      >
        <Tasto>{id === 'impostazioni' ? '⚙' : tasto}</Tasto>
        {contenuto ?? NOMI_DOCK[id] ?? titolo}
        {pallino && <span aria-hidden="true" className="absolute top-1.5 right-0.5 size-[6px] rounded-full bg-ambra" />}
      </button>
    )
  }
  return (
    <nav aria-label="Dock" className="flex h-10 shrink-0 items-stretch border-t border-linea bg-barra/95 px-2 backdrop-blur">
      {GRUPPI.map((gruppo, i) => (
        <Fragment key={gruppo.nome}>
          {i > 0 && <span aria-hidden="true" className="mx-2 my-2 w-px bg-separatore" />}
          <ul aria-label={gruppo.nome} className="m-0 flex list-none items-stretch gap-0.5 p-0">
            {gruppo.voci.map((id) => (
              <li key={id} className="flex">
                {voce(id)}
              </li>
            ))}
          </ul>
        </Fragment>
      ))}
      <ul aria-label="Comandi" className="m-0 ml-auto flex list-none items-stretch gap-0.5 p-0">
        <li className="flex">
          <a
            href={indirizzo({ pagina: mappa ? 'ponte' : 'mappa' })}
            title={mappa ? 'Torna alla scena del settore' : 'Mostra la mappa'}
            aria-label={!mappa && pallini.mappa ? `Mappa, ${pallini.mappa}` : undefined}
            className={`${CLASSI} ${STILI[mappa ? 'aperta' : 'chiusa']}`}
          >
            <Tasto>⇆</Tasto>
            {mappa ? 'Scena' : 'Mappa'}
            {!mappa && pallini.mappa && <span aria-hidden="true" className="absolute top-1.5 right-0.5 size-[6px] rounded-full bg-ambra" />}
          </a>
        </li>
        <li className="flex">{voce('impostazioni', <span className="sr-only">Impostazioni</span>)}</li>
      </ul>
    </nav>
  )
}

const CLASSI = 'relative flex items-center gap-1.5 border-t-2 px-2.5 text-[10px] font-semibold tracking-[0.16em] uppercase no-underline'

function Tasto({ children }: { children: ReactNode }) {
  return (
    <span aria-hidden="true" className="cifre text-[11px]">
      {children}
    </span>
  )
}
