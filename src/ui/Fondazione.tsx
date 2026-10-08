import { useContext, useState } from 'react'
import { Flag } from 'lucide-react'
import { ViaggioRifiutato } from '../dati'
import { NOMI_RISORSE } from '../dominio/catalogo'
import { basiFondabili, costoFondazione, ritmoInsediamento } from '../dominio/insediamenti'
import type { Nave } from '../dominio/navigazione'
import { RISORSE } from '../dominio/risorse'
import { settore, stessoSettore } from '../dominio/settore'
import { AzioniNave } from './azioni'
import { numero } from './formato'
import { BottonePrimario, Etichetta } from './plancia'
import { RIFIUTI } from './rifiuti'
import { CaricoAttuale } from './SchedaNave'

const NOMI_PIANETI = { roccioso: 'roccioso', oceanico: 'oceanico', ghiacciato: 'ghiacciato', gassoso: 'gassoso' } as const

/**
 * In Qui, su un sistema planetario: si sceglie il pianeta e si fonda una base
 * (doc/02-meccaniche.md#insediamenti). La base produce col mix del pianeta.
 */
export function Fondazione({ nave, ora }: { nave: Nave; ora: Date }) {
  const bordo = useContext(CaricoAttuale)
  const { fonda } = useContext(AzioniNave)
  const [scelto, setScelto] = useState(0)
  const [inCorso, setInCorso] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const corpo = settore(nave.posizione).corpo
  if (!bordo || nave.dal > ora || corpo?.dettagli.tipo !== 'sistema') return null
  if (bordo.insediamenti.some((i) => stessoSettore(i.coordinate, nave.posizione))) return null
  const { pianeti } = corpo.dettagli
  const basi = bordo.insediamenti.filter((i) => i.tipo === 'base').length
  const limite = basiFondabili(bordo.fatte)
  const costo = costoFondazione(basi)
  const voci = RISORSE.filter((r) => costo[r])
  const manca = voci.some((r) => bordo.quantita[r] < costo[r]!)

  const conferma = async () => {
    setInCorso(true)
    setErrore(null)
    try {
      await fonda(scelto)
    } catch (e) {
      setErrore(e instanceof ViaggioRifiutato ? RIFIUTI[e.motivo] : 'Fondazione non riuscita: controlla la connessione e riprova.')
    } finally {
      setInCorso(false)
    }
  }

  return (
    <section aria-label="Fonda una base" className="mt-3 flex flex-col gap-2 border-t border-separatore pt-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="etichetta m-0 text-ambra!">Fonda una base</h3>
        <Etichetta>
          {basi} di {limite} {limite === 1 ? 'base' : 'basi'}
        </Etichetta>
      </div>
      <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
        <legend className="mb-1 p-0 text-xs text-testo-tenue">La base produce col mix del pianeta che scegli:</legend>
        {pianeti.map((p, n) => {
          const ritmi = ritmoInsediamento({ tipo: 'base', coordinate: nave.posizione, pianeta: n, produzione: 1 })
          return (
            <label key={p.nome} className="flex min-h-9 items-center gap-2.5 text-[13px]">
              <input type="radio" name="pianeta" className="size-4 accent-ambra" checked={scelto === n} onChange={() => setScelto(n)} />
              <span className="flex-1">
                {p.nome} <span className="text-testo-tenue">· {NOMI_PIANETI[p.tipo]}</span>
              </span>
              <span className="cifre text-right text-xs text-testo-tenue">
                {RISORSE.filter((r) => ritmi[r])
                  .map((r) => `${NOMI_RISORSE[r].slice(0, 3)} ${numero(ritmi[r]!, 1)}`)
                  .join(' · ')}
                /h
              </span>
            </label>
          )
        })}
      </fieldset>
      {basi >= limite ? (
        <p className="m-0 text-xs text-testo-tenue">Hai fondato tutte le basi che puoi: le ricerche di Astrofisica ne apriranno altre.</p>
      ) : voci.length > 0 ? (
        <p className="m-0 text-xs">
          Costo, dalla stiva:{' '}
          {voci.map((r, n) => (
            <span key={r}>
              {n > 0 && ' · '}
              <span className={bordo.quantita[r] < costo[r]! ? 'text-ambra' : ''}>
                {numero(costo[r]!, 0)} {NOMI_RISORSE[r]}
              </span>
            </span>
          ))}
          {manca && <span className="text-testo-tenue"> (in ambra quello che manca)</span>}
        </p>
      ) : null}
      {errore && (
        <p className="m-0 text-xs text-pericolo" role="alert">
          {errore}
        </p>
      )}
      <BottonePrimario disabled={inCorso || basi >= limite || manca} onClick={() => void conferma()}>
        <Flag className="size-4" aria-hidden="true" />
        {basi === 0 ? 'Fonda · gratis' : 'Fonda'}
      </BottonePrimario>
    </section>
  )
}
