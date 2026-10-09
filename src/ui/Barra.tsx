import { createContext, useContext, type ComponentType } from 'react'
import { IconaAltro, IconaMappa, IconaNave, IconaPonte, IconaRete } from './icone'
import { indirizzo, type Pagina } from './indirizzo'

export type Sezione = 'ponte' | 'mappa' | 'rete' | 'nave' | 'altro'

/** La sezione della barra a cui appartiene una pagina: catalogo e simili stanno in Altro. */
export function sezioneDi(pagina: Pagina['pagina']): Sezione {
  if (pagina === 'ponte' || pagina === 'mappa' || pagina === 'rete' || pagina === 'nave') return pagina
  return 'altro'
}

const ICONE: Readonly<Record<Sezione, ComponentType<{ className?: string }>>> = {
  ponte: IconaPonte,
  mappa: IconaMappa,
  rete: IconaRete,
  nave: IconaNave,
  altro: IconaAltro,
}

/**
 * I pallini accesi, con il motivo per le tecnologie assistive: li calcola
 * l'App. Diario e Wiki servono al dock del PC, dove Altro non c'è.
 */
export const Pallini = createContext<Partial<Record<Sezione | 'diario' | 'wiki', string>>>({})

const VOCI: readonly { sezione: Sezione; nome: string; pagina: Pagina }[] = [
  { sezione: 'ponte', nome: 'Ponte', pagina: { pagina: 'ponte' } },
  { sezione: 'mappa', nome: 'Mappa', pagina: { pagina: 'mappa' } },
  { sezione: 'rete', nome: 'Rete', pagina: { pagina: 'rete' } },
  { sezione: 'nave', nome: 'Nave', pagina: { pagina: 'nave' } },
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
        const Icona = ICONE[sezione]
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
            <Icona className="size-[22px]" />
            <span className="text-[9px] font-semibold tracking-[0.18em] uppercase">{nome}</span>
            {pallino && <span aria-hidden="true" className="absolute top-3 left-1/2 ml-3 size-[7px] rounded-full bg-ambra" />}
          </a>
        )
      })}
    </nav>
  )
}
