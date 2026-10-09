import { Fragment, useContext, type ReactNode } from 'react'
import { Pallini } from './Barra'
import { Attraccata } from './SchedaBase'
import { mostraAiuto } from './tastiera'
import { alterna, FINESTRE, mostra, riordina, useDisposizione, type IdFinestra, type StatoFinestra } from './finestre'
import { ICONE_FINESTRE, IconaMappa, IconaRiordina, IconaScorciatoie } from './icone'

const GRUPPI: readonly { nome: string; voci: readonly IdFinestra[] }[] = [
  { nome: 'Navigazione', voci: ['scanner', 'rotta'] },
  { nome: 'Nave e rete', voci: ['nave', 'rete', 'base', 'ricerche'] },
  { nome: 'Archivio', voci: ['diario', 'wiki', 'catalogo', 'traguardi'] },
]

/** Le voci con un pallino, e quale (Barra.tsx): su PC Altro si scompone nelle sue voci. */
const PALLINI: Partial<Record<IdFinestra, 'rete' | 'diario' | 'wiki'>> = {
  rete: 'rete',
  diario: 'diario',
  wiki: 'wiki',
}

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
export function Dock() {
  const { finestre, sfondo } = useDisposizione()
  const pallini = useContext(Pallini)
  const attraccata = useContext(Attraccata)
  const mappa = sfondo === 'mappa'
  const voce = (id: IdFinestra, contenuto?: ReactNode) => {
    const { titolo, tasto } = FINESTRE[id]
    const stato = finestre[id].stato
    const pallino = PALLINI[id] && stato !== 'aperta' ? pallini[PALLINI[id]] : undefined
    const Icona = ICONE_FINESTRE[id]
    return (
      <button
        type="button"
        aria-pressed={stato === 'aperta'}
        aria-label={pallino ? `${titolo}, ${pallino}` : titolo}
        title={`${titolo}${stato === 'ridotta' ? ', ridotta' : ''} (${tasto})`}
        className={`${CLASSI} ${STILI[stato]}`}
        onClick={() => alterna(id)}
      >
        <Icona className={ICONA} />
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
            {gruppo.voci
              .filter((id) => id !== 'base' || attraccata)
              .map((id) => (
                <li key={id} className="flex">
                  {voce(id)}
                </li>
              ))}
          </ul>
        </Fragment>
      ))}
      <ul aria-label="Comandi" className="m-0 ml-auto flex list-none items-stretch gap-0.5 p-0">
        <li className="flex">
          <button
            type="button"
            title={mappa ? 'Torna alla scena del settore (Tab)' : 'Mostra la mappa (Tab)'}
            aria-pressed={mappa}
            aria-label={!mappa && pallini.mappa ? `Mappa, ${pallini.mappa}` : 'Mappa'}
            className={`${CLASSI} ${STILI[mappa ? 'aperta' : 'chiusa']}`}
            onClick={() => mostra(mappa ? 'scena' : 'mappa')}
          >
            <IconaMappa className={ICONA} />
            Mappa
            {!mappa && pallini.mappa && <span aria-hidden="true" className="absolute top-1.5 right-0.5 size-[6px] rounded-full bg-ambra" />}
          </button>
        </li>
        <li className="flex">
          <button
            type="button"
            title="Riordina le finestre"
            aria-label="Riordina le finestre"
            className={`${CLASSI} ${STILI.chiusa}`}
            onClick={riordina}
          >
            <IconaRiordina className={ICONA} />
          </button>
        </li>
        <li className="flex">
          <button
            type="button"
            title="Scorciatoie da tastiera (?)"
            aria-label="Scorciatoie da tastiera"
            className={`${CLASSI} ${STILI.chiusa}`}
            onClick={() => mostraAiuto(true)}
          >
            <IconaScorciatoie className={ICONA} />
          </button>
        </li>
        <li className="flex">{voce('impostazioni', <span className="sr-only">Impostazioni</span>)}</li>
      </ul>
    </nav>
  )
}

const CLASSI = 'relative flex items-center gap-1.5 border-t-2 px-2.5 text-[10px] font-semibold tracking-[0.16em] uppercase no-underline'

const ICONA = 'size-4 shrink-0'
