import { createContext, useContext, useState } from 'react'
import { Fuel } from 'lucide-react'
import { ViaggioRifiutato } from '../dati'
import { BILANCIAMENTO } from '../dominio/bilanciamento'
import { costoPieno } from '../dominio/cantiere'
import type { Struttura } from '../dominio/cantiere'
import { magazzinoOra, type Insediamento } from '../dominio/insediamenti'
import { carburanteOra, inViaggio, type Nave } from '../dominio/navigazione'
import { settore, stessoSettore } from '../dominio/settore'
import { Coda, Potenziamenti } from './Cantiere'
import { AzioniNave } from './azioni'
import { coordinatePlancia, numero, rovescia } from './formato'
import { indirizzo } from './indirizzo'
import { NESSUNA_RICERCA, RICERCHE, type IdRicerca } from '../dominio/ricerche'
import { BarreMagazzino, NOMI_INSEDIAMENTI } from './Magazzino'
import { BottoneSecondario, Etichetta, Info, Pannello } from './plancia'
import { RIFIUTI } from './rifiuti'
import { CaricoAttuale, useDintorni } from './SchedaNave'

/**
 * Le strutture che si costruiscono in un insediamento: la base madre le ha
 * tutte, nelle colonie cantiere e deposito arrivano con le ricerche, un
 * estrattore ha solo produzione e magazzino (doc/02-meccaniche.md#strutture-di-base).
 */
export function struttureAttive(base: Insediamento, fatte: ReadonlySet<string>): Struttura[] {
  const tutte: Struttura[] = ['produzione', 'magazzino', 'cantiere', 'deposito', 'laboratorio']
  if (base.tipo === 'madre') return tutte
  if (base.tipo === 'estrattore') return ['produzione', 'magazzino']
  // Nelle colonie il cantiere arriva con *Cantiere orbitale* (I3), il deposito con *Deposito* (I5).
  return tutte.filter((s) => (s !== 'cantiere' || fatte.has('I3')) && (s !== 'deposito' || fatte.has('I5')))
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
  const fatte = useContext(CaricoAttuale)?.fatte ?? NESSUNA_RICERCA
  const nome = base.tipo === 'madre' ? 'Base madre' : (settore(base.coordinate).corpo?.nome ?? coordinatePlancia(base.coordinate))
  return (
    <Pannello className="flex min-h-0 flex-1 flex-col overflow-y-auto" etichetta="Base">
      <header className="flex flex-col gap-1 border-b border-linea p-3.5">
        <h1 className="m-0 text-base font-semibold tracking-[0.2em] uppercase">{nome}</h1>
        <Etichetta>
          {NOMI_INSEDIAMENTI[base.tipo]} · produzione {base.produzione} · magazzino {base.magazzino}
          {base.tipo !== 'estrattore' ? ` · cantiere ${base.cantiere}` : ''}
          {base.deposito > 0 ? ` · deposito ${base.deposito}` : ''}
        </Etichetta>
      </header>
      <section aria-label="Strutture" className="border-b border-separatore p-3.5">
        <h2 className="etichetta m-0 mb-1">{base.tipo === 'estrattore' ? 'Livelli' : 'Strutture'}</h2>
        <Potenziamenti nave={nave} ora={ora} lavori={struttureAttive(base, fatte)} base={base} />
        <h3 className="etichetta m-0 mt-3 mb-2">{base.tipo === 'estrattore' ? 'Coda' : 'Coda della base'}</h3>
        <Coda coda="base" base={base} ora={ora} />
      </section>
      {base.deposito > 0 && <Deposito nave={nave} ora={ora} base={base} />}
      {base.laboratorio > 0 && <Laboratorio ora={ora} base={base} />}
      <section aria-label="Magazzino" className="p-3.5">
        <h2 className="etichetta m-0 mb-2">Magazzino</h2>
        <BarreMagazzino insediamento={base} ora={ora} />
      </section>
    </Pannello>
  )
}

/** Il deposito carburante: il pieno subito, pagato in Idrogeno (doc/02-meccaniche.md#viaggio). */
function Deposito({ nave, ora, base }: { nave: Nave; ora: Date; base: Insediamento }) {
  const bordo = useContext(CaricoAttuale)
  const { pieno } = useContext(AzioniNave)
  const [inCorso, setInCorso] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const dintorni = useDintorni()
  const mancano = nave.serbatoio - carburanteOra(nave, ora, dintorni)
  const costo = costoPieno(mancano, base.deposito, bordo?.fatte)
  const disponibile = (bordo?.quantita.idrogeno ?? 0) + (magazzinoOra(base, ora, bordo?.fatte).idrogeno ?? 0)
  const fai = async () => {
    setInCorso(true)
    setErrore(null)
    try {
      await pieno()
    } catch (e) {
      setErrore(e instanceof ViaggioRifiutato ? RIFIUTI[e.motivo] : 'Pieno non riuscito: controlla la connessione e riprova.')
    } finally {
      setInCorso(false)
    }
  }
  return (
    <section aria-label="Deposito carburante" className="flex flex-col gap-2 border-b border-separatore p-3.5">
      <h2 className="etichetta m-0">Deposito carburante · liv. {base.deposito}</h2>
      {costo <= 0.005 ? (
        <p className="m-0 text-xs text-testo-tenue">Il serbatoio è pieno.</p>
      ) : (
        <>
          <p className="m-0 flex items-center gap-1 text-[13px]">
            Mancano {numero(mancano, 1)} unità:{' '}
            <span className={costo > disponibile ? 'text-ambra' : ''}>{numero(Math.ceil(costo), 0)} Idrogeno</span>
            <Info
              titolo="Pieno"
              wiki="viaggio"
              formula={`${numero(mancano, 2)} unità × ${BILANCIAMENTO.deposito.idrogeno} × ${BILANCIAMENTO.deposito.crescita}^${base.deposito - 1}`}
              esatto={numero(costo, 2)}
            />
          </p>
          {errore && (
            <p className="m-0 text-xs text-pericolo" role="alert">
              {errore}
            </p>
          )}
          <BottoneSecondario disabled={inCorso || costo > disponibile} onClick={() => void fai()}>
            <Fuel className="size-4" aria-hidden="true" />
            Pieno
          </BottoneSecondario>
          {costo > disponibile && (
            <span className="text-xs text-testo-tenue">Tra stiva e magazzino ci sono {numero(disponibile, 0)} Idrogeno.</span>
          )}
        </>
      )}
    </section>
  )
}

/** Il laboratorio: il livello decide il gradino massimo; le ricerche si avviano dalla loro finestra. */
function Laboratorio({ ora, base }: { ora: Date; base: Insediamento }) {
  const { ricerche } = useContext(AzioniNave)
  const inCorso = ricerche.find((r) => r.fine > ora)
  return (
    <section aria-label="Laboratorio" className="flex flex-col gap-1.5 border-b border-separatore p-3.5">
      <h2 className="etichetta m-0">Laboratorio · liv. {base.laboratorio}</h2>
      <p className="m-0 text-[13px]">
        {inCorso
          ? `In corso: ${RICERCHE[inCorso.nodo as IdRicerca]?.nome ?? inCorso.nodo}, ancora ${rovescia(inCorso.fine.getTime() - ora.getTime())}.`
          : `Ricerche fino al gradino ${base.laboratorio}.`}
      </p>
      <a href={indirizzo({ pagina: 'ricerche' })} className="etichetta self-start no-underline text-ambra!">
        Apri le ricerche ›
      </a>
    </section>
  )
}
