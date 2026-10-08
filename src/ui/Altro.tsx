import type { ReactNode } from 'react'
import { indirizzo, type Pagina } from './indirizzo'
import { Pannello } from './plancia'

export interface VoceAltro {
  titolo: string
  /** Una riga sotto il titolo: conti, novità. */
  sottotitolo: string
  pagina: Pagina
  /** Acceso se dentro c'è qualcosa da vedere. */
  pallino?: boolean
}

/**
 * La sezione Altro (doc/11-interfaccia.md#altro): l'elenco delle pagine da
 * consultare. Le voci arrivano con le loro meccaniche.
 */
export function Altro({ voci, children }: { voci: readonly VoceAltro[]; children?: ReactNode }) {
  return (
    <>
      <Pannello etichetta="Altro">
        <ul className="m-0 list-none p-0">
          {voci.map((v) => (
            <li key={v.titolo} className="border-b border-separatore last:border-b-0">
              <a
                href={indirizzo(v.pagina)}
                className="grid min-h-16 grid-cols-[1fr_auto] items-center gap-x-2.5 gap-y-1 px-3.5 py-3 no-underline hover:text-ambra"
              >
                <span className="text-sm font-semibold tracking-[0.14em] uppercase">{v.titolo}</span>
                <span aria-hidden="true" className="row-span-2 text-base text-ambra">
                  {v.pallino ? '●' : ''}
                </span>
                <span className={`text-xs ${v.pallino ? 'text-ambra' : 'text-testo-tenue'}`}>{v.sottotitolo}</span>
              </a>
            </li>
          ))}
        </ul>
      </Pannello>
      {children}
    </>
  )
}
