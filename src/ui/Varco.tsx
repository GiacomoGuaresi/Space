import { useContext, useState } from 'react'
import { Orbit } from 'lucide-react'
import { ViaggioRifiutato } from '../dati'
import { BILANCIAMENTO } from '../dominio/bilanciamento'
import type { Nave } from '../dominio/navigazione'
import { RICERCHE } from '../dominio/ricerche'
import { distanza, settore } from '../dominio/settore'
import { AzioniNave } from './azioni'
import { coordinatePlancia, numero } from './formato'
import { BottonePrimario } from './plancia'
import { RIFIUTI } from './rifiuti'
import { CaricoAttuale } from './SchedaNave'

/**
 * In Qui, su un wormhole (doc/02-meccaniche.md#effetti-dei-corpi): con
 * *Navigazione dei varchi* si attraversa, pagando Materia oscura, e si arriva
 * subito all'uscita, a senso unico. Con *Sonda di varco* si vede dove porta.
 */
export function Varco({ nave, ora }: { nave: Nave; ora: Date }) {
  const bordo = useContext(CaricoAttuale)
  const { attraversa } = useContext(AzioniNave)
  const [inCorso, setInCorso] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const d = settore(nave.posizione).corpo?.dettagli
  if (!bordo || nave.dal > ora || d?.tipo !== 'wormhole') return null
  const aperto = bordo.fatte.has('P9')
  const sonda = bordo.fatte.has('S9')
  const costo = BILANCIAMENTO.varco.materiaOscura
  const manca = bordo.quantita.materiaOscura < costo
  const fai = async () => {
    setInCorso(true)
    setErrore(null)
    try {
      await attraversa()
    } catch (e) {
      setErrore(e instanceof ViaggioRifiutato ? RIFIUTI[e.motivo] : 'Salto non riuscito: controlla la connessione e riprova.')
    } finally {
      setInCorso(false)
    }
  }
  return (
    <section aria-label="Attraversa il varco" className="mt-3 flex flex-col gap-2 border-t border-separatore pt-3">
      <h3 className="etichetta m-0 text-ambra!">Varco</h3>
      <p className="m-0 text-[13px]">
        {sonda
          ? `Porta in ${coordinatePlancia(d.uscita)}, a ${numero(distanza(nave.posizione, d.uscita), 0)} settori da qui. Senso unico.`
          : `Porta lontano, tra 300 e 1500 settori, a senso unico. Dove, lo dice la ${RICERCHE.S9.nome}.`}
      </p>
      {!aperto ? (
        <p className="m-0 text-xs text-testo-tenue">Si attraversa con la ricerca {RICERCHE.P9.nome}.</p>
      ) : (
        <>
          <p className="m-0 text-xs">
            Costo, dalla stiva: <span className={manca ? 'text-ambra' : ''}>{costo} Materia oscura</span>
          </p>
          {errore && (
            <p className="m-0 text-xs text-pericolo" role="alert">
              {errore}
            </p>
          )}
          <BottonePrimario disabled={inCorso || manca} onClick={() => void fai()}>
            <Orbit className="size-4" aria-hidden="true" />
            Attraversa
          </BottonePrimario>
        </>
      )}
    </section>
  )
}
