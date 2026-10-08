import type { ReactNode } from 'react'
import type { Nave, Viaggio } from '../dominio/navigazione'
import type { Pagina } from './indirizzo'
import { Menu } from './Menu'
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
 * fondo, la striscia di stato in cima, il pannello della sezione in basso.
 */
export function Cornice({ pagina, nave, viaggio, scarto, fondo, children }: Props) {
  const ora = useOra(scarto)
  return (
    <main className="relative h-dvh overflow-hidden bg-black">
      {fondo}
      <div className="pointer-events-none absolute inset-0 mx-auto flex max-w-3xl flex-col gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <header className="pointer-events-auto flex items-start gap-2">
          <StrisciaStato nave={nave} viaggio={viaggio} ora={ora} />
          <Menu attuale={pagina} />
        </header>
        <div className="flex min-h-0 flex-1 flex-col justify-end gap-2 [&>*]:pointer-events-auto">{children}</div>
      </div>
    </main>
  )
}
