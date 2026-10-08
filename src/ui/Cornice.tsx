import type { ReactNode } from 'react'
import type { Nave, Viaggio } from '../dominio/navigazione'
import { Barra, sezioneDi } from './Barra'
import type { Pagina } from './indirizzo'
import { StrisciaStato } from './StrisciaStato'
import { useOra } from './useNave'

interface Props {
  pagina: Pagina['pagina']
  nave: Nave
  viaggio: Viaggio | null
  scarto: number
  /** Cosa sta di fondo: la scena del settore o la mappa 3D. */
  fondo?: ReactNode
  children: ReactNode
}

/**
 * L'ossatura di ogni pagina (doc/11-interfaccia.md#ossatura): la scena di
 * fondo, la striscia di stato in cima, il pannello della sezione e la barra
 * delle sezioni in fondo.
 */
export function Cornice({ pagina, nave, viaggio, scarto, fondo, children }: Props) {
  const ora = useOra(scarto)
  return (
    <main className="relative h-dvh overflow-hidden bg-black">
      {fondo}
      <div className="pointer-events-none absolute inset-0 flex flex-col">
        <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <header className="pointer-events-auto">
            <StrisciaStato nave={nave} viaggio={viaggio} ora={ora} />
          </header>
          <div className="flex min-h-0 flex-1 flex-col justify-end gap-2 [&>*]:pointer-events-auto">{children}</div>
        </div>
        <div className="pointer-events-auto">
          <Barra attuale={sezioneDi(pagina)} />
        </div>
      </div>
    </main>
  )
}
