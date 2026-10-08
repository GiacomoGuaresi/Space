import { Fragment } from 'react'
import { indirizzo, type Pagina } from './indirizzo'

interface Voce {
  tasto: string
  nome: string
  pagina: Pagina
  /** Le pagine in cui la voce è accesa. */
  accesa: readonly Pagina['pagina'][]
}

// Nave, Rete, Base, Ricerche e Traguardi arrivano con le loro meccaniche (doc/06-roadmap.md).
const GRUPPI: readonly { nome: string; voci: readonly Voce[] }[] = [
  {
    nome: 'Navigazione',
    voci: [
      {
        tasto: 'Q',
        nome: 'Qui',
        pagina: { pagina: 'ponte' },
        accesa: ['ponte'],
      },
      {
        tasto: 'S',
        nome: 'Scanner',
        pagina: { pagina: 'ponte' },
        accesa: ['ponte'],
      },
      {
        tasto: 'R',
        nome: 'Rotta',
        pagina: { pagina: 'ponte' },
        accesa: ['ponte'],
      },
    ],
  },
  {
    nome: 'Archivio',
    voci: [
      {
        tasto: 'D',
        nome: 'Diario',
        pagina: { pagina: 'diario' },
        accesa: ['diario'],
      },
      {
        tasto: 'W',
        nome: 'Wiki',
        pagina: { pagina: 'wiki' },
        accesa: ['wiki'],
      },
      {
        tasto: 'C',
        nome: 'Catalogo',
        pagina: { pagina: 'catalogo' },
        accesa: ['catalogo'],
      },
    ],
  },
]

/**
 * Il dock in basso della plancia per PC (doc/11-interfaccia.md#pc--plancia-a-finestre),
 * al posto della barra a schede: le voci a gruppi e i comandi. Per ora le voci
 * aprono le pagine; con le finestre apriranno le finestre.
 */
export function Dock({ attuale }: { attuale: Pagina['pagina'] }) {
  const mappa = attuale === 'mappa'
  return (
    <nav aria-label="Dock" className="flex h-10 shrink-0 items-stretch border-t border-linea bg-barra/95 px-2 backdrop-blur">
      {GRUPPI.map((gruppo, i) => (
        <Fragment key={gruppo.nome}>
          {i > 0 && <span aria-hidden="true" className="mx-2 my-2 w-px bg-separatore" />}
          <ul aria-label={gruppo.nome} className="m-0 flex list-none items-stretch gap-0.5 p-0">
            {gruppo.voci.map((v) => (
              <li key={v.nome} className="flex">
                <VoceDock href={indirizzo(v.pagina)} accesa={v.accesa.includes(attuale)} tasto={v.tasto}>
                  {v.nome}
                </VoceDock>
              </li>
            ))}
          </ul>
        </Fragment>
      ))}
      <ul aria-label="Comandi" className="m-0 ml-auto flex list-none items-stretch gap-0.5 p-0">
        <li className="flex">
          <VoceDock
            href={indirizzo({ pagina: mappa ? 'ponte' : 'mappa' })}
            accesa={mappa}
            tasto="⇆"
            titolo={mappa ? 'Torna alla scena del settore' : 'Mostra la mappa'}
          >
            {mappa ? 'Scena' : 'Mappa'}
          </VoceDock>
        </li>
        <li className="flex">
          <VoceDock href={indirizzo({ pagina: 'impostazioni' })} accesa={attuale === 'impostazioni'} tasto="⚙" titolo="Impostazioni">
            <span className="sr-only">Impostazioni</span>
          </VoceDock>
        </li>
      </ul>
    </nav>
  )
}

function VoceDock({
  href,
  accesa,
  tasto,
  titolo,
  children,
}: {
  href: string
  accesa: boolean
  tasto: string
  titolo?: string
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      title={titolo}
      aria-current={accesa ? 'page' : undefined}
      className={`relative flex items-center gap-1.5 border-t-2 px-2.5 text-[10px] font-semibold tracking-[0.16em] uppercase no-underline ${
        accesa ? 'border-ambra text-ambra' : 'border-transparent text-testo-tenue hover:text-testo'
      }`}
    >
      <span aria-hidden="true" className={`cifre text-[11px] ${accesa ? 'text-ambra' : 'text-testo'}`}>
        {tasto}
      </span>
      {children}
    </a>
  )
}
