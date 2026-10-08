import { createContext, useContext, type ReactNode } from 'react'
import { indirizzo, type Pagina } from './indirizzo'

export type Sezione = 'ponte' | 'mappa' | 'altro'

/** La sezione della barra a cui appartiene una pagina: catalogo e simili stanno in Altro. */
export function sezioneDi(pagina: Pagina['pagina']): Sezione {
  if (pagina === 'ponte' || pagina === 'mappa') return pagina
  return 'altro'
}

const ICONE: Readonly<Record<Sezione, ReactNode>> = {
  ponte: (
    <>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 2v5M12 17v5M2 12h5M17 12h5" />
    </>
  ),
  mappa: (
    <>
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="9" ry="3.5" />
      <ellipse cx="12" cy="12" rx="3.5" ry="9" />
    </>
  ),
  altro: <path d="M5 6h14M5 12h14M5 18h14" />,
}

/**
 * I pallini accesi, con il motivo per le tecnologie assistive: li calcola
 * l'App. Diario e Wiki servono al dock del PC, dove Altro non c'è.
 */
export const Pallini = createContext<Partial<Record<Sezione | 'diario' | 'wiki', string>>>({})

const VOCI: readonly { sezione: Sezione; nome: string; pagina: Pagina }[] = [
  { sezione: 'ponte', nome: 'Ponte', pagina: { pagina: 'ponte' } },
  { sezione: 'mappa', nome: 'Mappa', pagina: { pagina: 'mappa' } },
  // Rete e Nave arrivano con le loro meccaniche (doc/06-roadmap.md, M4).
  { sezione: 'altro', nome: 'Altro', pagina: { pagina: 'altro' } },
]

/**
 * La barra delle sezioni in fondo a ogni pagina (doc/11-interfaccia.md#ossatura),
 * con i pallini dove c'è qualcosa da vedere.
 */
export function Barra({ attuale }: { attuale: Sezione }) {
  const pallini = useContext(Pallini)
  return (
    <nav
      aria-label="Sezioni"
      className="grid h-[72px] shrink-0 border-t border-linea bg-barra/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      style={{ gridTemplateColumns: `repeat(${VOCI.length}, minmax(0, 1fr))` }}
    >
      {VOCI.map(({ sezione, nome, pagina }) => {
        const qui = sezione === attuale
        // Nella sezione dove sei il pallino non serve.
        const pallino = qui ? undefined : pallini[sezione]
        return (
          <a
            key={sezione}
            href={indirizzo(pagina)}
            aria-current={qui ? 'page' : undefined}
            aria-label={pallino ? `${nome}, ${pallino}` : nome}
            className={`relative flex flex-col items-center justify-center gap-1.5 border-t-2 no-underline ${
              qui ? 'border-ambra text-ambra' : 'border-transparent text-testo-tenue hover:text-testo'
            }`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              {ICONE[sezione]}
            </svg>
            <span className="text-[9px] font-semibold tracking-[0.18em] uppercase">{nome}</span>
            {pallino && <span aria-hidden="true" className="absolute top-3 left-1/2 ml-3 size-[7px] rounded-full bg-ambra" />}
          </a>
        )
      })}
    </nav>
  )
}
