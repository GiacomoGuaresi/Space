import { useContext, useState } from 'react'
import { FastForward } from 'lucide-react'
import { ViaggioRifiutato } from '../dati'
import { BILANCIAMENTO } from '../dominio/bilanciamento'
import { costoAccelera } from '../dominio/cantiere'
import { carburanteOra, inViaggio, ricaricaQui, tettoQui, type Nave } from '../dominio/navigazione'
import { AzioniNave } from './azioni'
import { durata, numero } from './formato'
import { BottoneSecondario, Info } from './plancia'
import { RIFIUTI } from './rifiuti'
import { CaricoAttuale, useDintorni } from './SchedaNave'

const ORA_MS = 3_600_000

/**
 * Il tasto che salta il tempo che manca pagando Materia oscura
 * (doc/02-meccaniche.md#materia-oscura): a un viaggio, a un lavoro in corso o
 * alla ricarica. Compare solo se a bordo c'è della Materia oscura.
 */
function Accelera({ cosa, lavoro, ms, testo }: { cosa: 'viaggio' | 'ricarica' | 'lavoro'; lavoro?: number; ms: number; testo: string }) {
  const bordo = useContext(CaricoAttuale)
  const { accelera } = useContext(AzioniNave)
  const [inCorso, setInCorso] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const disponibile = bordo?.quantita.materiaOscura ?? 0
  if (disponibile <= 0 || ms <= 0) return null
  const ore = ms / ORA_MS
  const costo = costoAccelera(ore)
  const fai = async () => {
    setInCorso(true)
    setErrore(null)
    try {
      await accelera(cosa, lavoro)
    } catch (e) {
      setErrore(e instanceof ViaggioRifiutato ? RIFIUTI[e.motivo] : 'Non riuscito: controlla la connessione e riprova.')
    } finally {
      setInCorso(false)
    }
  }
  const { base, esponente } = BILANCIAMENTO.accelera
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <BottoneSecondario className="shrink-0 px-3" disabled={inCorso || costo > disponibile} onClick={() => void fai()}>
          <FastForward className="size-3.5" aria-hidden="true" />
          {testo}
        </BottoneSecondario>
        <span className={`cifre inline-flex items-center gap-1 text-xs ${costo > disponibile ? 'text-ambra' : 'text-testo-tenue'}`}>
          {numero(Math.ceil(costo), 0)} Materia oscura
          <Info
            titolo="Accelerare"
            wiki="risorse"
            formula={`${base} × ${numero(ore, 2)} h^${numero(esponente, 1)}`}
            esatto={`${numero(costo, 2)} Materia oscura per ${durata(ms)}`}
          />
        </span>
      </div>
      {errore && (
        <p className="m-0 text-xs text-pericolo" role="alert">
          {errore}
        </p>
      )}
    </div>
  )
}

/** In volo: si arriva subito. */
export function AcceleraViaggio({ nave, ora }: { nave: Nave; ora: Date }) {
  if (!inViaggio(nave, ora)) return null
  return <Accelera cosa="viaggio" ms={nave.dal.getTime() - ora.getTime()} testo="Arriva subito" />
}

/** Da fermi, sotto il tetto: il serbatoio arriva subito fin dove si ricarica qui. */
export function AcceleraRicarica({ nave, ora }: { nave: Nave; ora: Date }) {
  const dintorni = useDintorni()
  if (inViaggio(nave, ora)) return null
  const mancano = tettoQui(nave, nave.posizione, dintorni) - carburanteOra(nave, ora, dintorni)
  if (mancano <= 0.005) return null
  const ms = (mancano / ricaricaQui(nave, nave.posizione, dintorni)) * ORA_MS
  return (
    <div className="mt-3 border-t border-separatore pt-3">
      <Accelera cosa="ricarica" ms={ms} testo="Ricarica subito" />
    </div>
  )
}

/** Un lavoro del cantiere in corso: finisce subito, e quelli dopo nella coda partono prima. */
export function AcceleraLavoro({ id, fine, ora }: { id: number; fine: Date; ora: Date }) {
  return <Accelera cosa="lavoro" lavoro={id} ms={fine.getTime() - ora.getTime()} testo="Finisci subito" />
}
