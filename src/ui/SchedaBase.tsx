import { createContext, useContext } from 'react'
import type { Struttura } from '../dominio/cantiere'
import type { Insediamento } from '../dominio/insediamenti'
import { inViaggio, type Nave } from '../dominio/navigazione'
import { settore, stessoSettore } from '../dominio/settore'
import { Coda, Potenziamenti } from './Cantiere'
import { coordinatePlancia } from './formato'
import { BarreMagazzino, NOMI_INSEDIAMENTI } from './Magazzino'
import { Etichetta, Pannello } from './plancia'
import { CaricoAttuale } from './SchedaNave'

/**
 * Le strutture che si costruiscono in una base: cantiere e deposito solo nella
 * base madre, nelle colonie arrivano con le ricerche (M7). Le altre arrivano
 * con i loro step (doc/06-roadmap.md).
 */
export function struttureAttive(base: Insediamento): Struttura[] {
  const tutte: Struttura[] = ['produzione', 'magazzino']
  return base.tipo === 'madre' ? tutte : tutte.filter((s) => s !== 'cantiere' && s !== 'deposito')
}

/** Vero se la nave è attraccata a una base: il dock mostra la voce Base solo allora. */
export const Attraccata = createContext(false)

/** La base dove la nave è attraccata adesso, se c'è. */
export function useBaseQui(nave: Nave, ora: Date): Insediamento | undefined {
  const bordo = useContext(CaricoAttuale)
  if (inViaggio(nave, ora)) return undefined
  return bordo?.insediamenti.find((i) => stessoSettore(i.coordinate, nave.posizione))
}

/**
 * La Base (doc/11-interfaccia.md#ponte): le strutture con il loro livello, la
 * coda della base e il magazzino. C'è solo da attraccati: si costruisce sul posto.
 */
export function SchedaBase({ nave, ora, base }: { nave: Nave; ora: Date; base: Insediamento }) {
  const nome = base.tipo === 'madre' ? 'Base madre' : (settore(base.coordinate).corpo?.nome ?? coordinatePlancia(base.coordinate))
  return (
    <Pannello className="flex min-h-0 flex-1 flex-col overflow-y-auto" etichetta="Base">
      <header className="flex flex-col gap-1 border-b border-linea p-3.5">
        <h1 className="m-0 text-base font-semibold tracking-[0.2em] uppercase">{nome}</h1>
        <Etichetta>
          {NOMI_INSEDIAMENTI[base.tipo]} · produzione {base.produzione} · magazzino {base.magazzino} · cantiere {base.cantiere}
          {base.deposito > 0 ? ` · deposito ${base.deposito}` : ''}
        </Etichetta>
      </header>
      <section aria-label="Strutture" className="border-b border-separatore p-3.5">
        <h2 className="etichetta m-0 mb-1">Strutture</h2>
        <Potenziamenti nave={nave} ora={ora} lavori={struttureAttive(base)} base={base} />
        <h3 className="etichetta m-0 mt-3 mb-2">Coda della base</h3>
        <Coda coda="base" base={base} ora={ora} />
      </section>
      <section aria-label="Magazzino" className="p-3.5">
        <h2 className="etichetta m-0 mb-2">Magazzino</h2>
        <BarreMagazzino insediamento={base} ora={ora} />
      </section>
    </Pannello>
  )
}
