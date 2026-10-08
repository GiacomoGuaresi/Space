import { Fragment, type ReactNode } from 'react'
import { alterna, apri, FINESTRE, useDisposizione, type IdFinestra, type StatoFinestra } from './finestre'
import { indirizzo, vaiA, type Pagina } from './indirizzo'

type Voce = { finestra: IdFinestra } | { tasto: string; nome: string; pagina: Pagina }

// Nave, Rete, Base, Ricerche e Traguardi arrivano con le loro meccaniche (doc/06-roadmap.md).
const GRUPPI: readonly { nome: string; voci: readonly Voce[] }[] = [
  { nome: 'Navigazione', voci: [{ finestra: 'qui' }, { finestra: 'scanner' }, { finestra: 'rotta' }] },
  {
    nome: 'Archivio',
    voci: [
      { tasto: 'D', nome: 'Diario', pagina: { pagina: 'diario' } },
      { tasto: 'W', nome: 'Wiki', pagina: { pagina: 'wiki' } },
      { tasto: 'C', nome: 'Catalogo', pagina: { pagina: 'catalogo' } },
    ],
  },
]

const STILI: Readonly<Record<StatoFinestra, string>> = {
  aperta: 'border-ambra text-ambra',
  ridotta: 'border-ambra-scura/60 text-testo',
  chiusa: 'border-transparent text-testo-tenue hover:text-testo',
}

/**
 * Il dock in basso della plancia per PC (doc/11-interfaccia.md#pc--plancia-a-finestre),
 * al posto della barra a schede: le voci a gruppi e i comandi. Una finestra
 * aperta è accesa, ridotta ha il contorno, chiusa è spenta.
 */
export function Dock({ attuale }: { attuale: Pagina['pagina'] }) {
  const { finestre } = useDisposizione()
  const mappa = attuale === 'mappa'
  const ponte = attuale === 'ponte'
  return (
    <nav aria-label="Dock" className="flex h-10 shrink-0 items-stretch border-t border-linea bg-barra/95 px-2 backdrop-blur">
      {GRUPPI.map((gruppo, i) => (
        <Fragment key={gruppo.nome}>
          {i > 0 && <span aria-hidden="true" className="mx-2 my-2 w-px bg-separatore" />}
          <ul aria-label={gruppo.nome} className="m-0 flex list-none items-stretch gap-0.5 p-0">
            {gruppo.voci.map((v) => {
              if ('finestra' in v) {
                const { titolo, tasto } = FINESTRE[v.finestra]
                // Fuori dal ponte le finestre non si vedono: la voce le riporta lì.
                const stato = ponte ? finestre[v.finestra].stato : 'chiusa'
                return (
                  <li key={v.finestra} className="flex">
                    <button
                      type="button"
                      aria-pressed={stato === 'aperta'}
                      title={stato === 'ridotta' ? `${titolo}, ridotta` : titolo}
                      className={`${CLASSI} ${STILI[stato]}`}
                      onClick={() => {
                        if (ponte) return alterna(v.finestra)
                        apri(v.finestra)
                        vaiA({ pagina: 'ponte' })
                      }}
                    >
                      <Tasto>{tasto}</Tasto>
                      {titolo}
                    </button>
                  </li>
                )
              }
              const accesa = attuale === v.pagina.pagina
              return (
                <li key={v.nome} className="flex">
                  <a
                    href={indirizzo(v.pagina)}
                    aria-current={accesa ? 'page' : undefined}
                    className={`${CLASSI} ${STILI[accesa ? 'aperta' : 'chiusa']}`}
                  >
                    <Tasto>{v.tasto}</Tasto>
                    {v.nome}
                  </a>
                </li>
              )
            })}
          </ul>
        </Fragment>
      ))}
      <ul aria-label="Comandi" className="m-0 ml-auto flex list-none items-stretch gap-0.5 p-0">
        <li className="flex">
          <a
            href={indirizzo({ pagina: mappa ? 'ponte' : 'mappa' })}
            title={mappa ? 'Torna alla scena del settore' : 'Mostra la mappa'}
            className={`${CLASSI} ${STILI[mappa ? 'aperta' : 'chiusa']}`}
          >
            <Tasto>⇆</Tasto>
            {mappa ? 'Scena' : 'Mappa'}
          </a>
        </li>
        <li className="flex">
          <a
            href={indirizzo({ pagina: 'impostazioni' })}
            title="Impostazioni"
            aria-current={attuale === 'impostazioni' ? 'page' : undefined}
            className={`${CLASSI} ${STILI[attuale === 'impostazioni' ? 'aperta' : 'chiusa']}`}
          >
            <Tasto>⚙</Tasto>
            <span className="sr-only">Impostazioni</span>
          </a>
        </li>
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
