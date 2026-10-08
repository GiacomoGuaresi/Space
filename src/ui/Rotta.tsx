import { useEffect, useState, type FormEvent } from 'react'
import { Rocket } from 'lucide-react'
import { ViaggioRifiutato, type MotivoRifiuto } from '../dati'
import { CATALOGO } from '../dominio/catalogo'
import { anteprima, type Nave } from '../dominio/navigazione'
import { distanza, stessoSettore, tipoSettore, type Coordinate } from '../dominio/settore'
import { coordinate, durata, numero, orario, settori } from './formato'

const ASSI = ['x', 'y', 'z'] as const

const RIFIUTI: Readonly<Record<MotivoRifiuto, string>> = {
  in_viaggio: 'La nave è già in viaggio.',
  stesso_settore: 'La nave è già qui.',
  carburante_insufficiente: 'Il carburante non basta nemmeno per un settore: aspetta che si ricarichi.',
}

interface Props {
  nave: Nave
  ora: Date
  meta: Coordinate | null
  onMeta: (meta: Coordinate) => void
  onParti: (meta: Coordinate) => Promise<void>
}

/**
 * La rotta: si sceglie la meta (dallo scanner o scrivendo le coordinate), si
 * vede quanto dura, quanto consuma e se il carburante basta, e si parte.
 */
export function Rotta({ nave, ora, meta, onMeta, onParti }: Props) {
  const [bozza, setBozza] = useState<Record<(typeof ASSI)[number], string>>(() => testi(meta ?? nave.posizione))
  const [inCorso, setInCorso] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  useEffect(() => {
    if (meta) setBozza(testi(meta))
  }, [meta])

  const scritta = leggi(bozza)
  const valida = scritta !== null && !stessoSettore(scritta, nave.posizione)
  const prova = valida ? anteprima(nave, scritta, ora) : null
  const tipo = scritta ? tipoSettore(scritta) : null

  const invia = (evento: FormEvent) => {
    evento.preventDefault()
    if (scritta) onMeta(scritta)
  }

  const parti = async () => {
    if (!scritta || !prova?.possibile || inCorso) return
    setInCorso(true)
    setErrore(null)
    try {
      await onParti(scritta)
    } catch (e) {
      setErrore(e instanceof ViaggioRifiutato ? RIFIUTI[e.motivo] : 'Partenza non riuscita: controlla la connessione e riprova.')
    } finally {
      setInCorso(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 text-xs">
      <form className="flex items-end gap-1.5" onSubmit={invia}>
        {ASSI.map((asse) => (
          <label key={asse} className="flex flex-col gap-0.5 text-[11px] text-testo-tenue">
            {asse.toUpperCase()}
            <input
              className="h-9 w-[4.5rem] rounded-lg border border-bordo/70 bg-fondo/60 px-2 text-testo tabular-nums focus:outline-2 focus:-outline-offset-1 focus:outline-nebula"
              inputMode="numeric"
              value={bozza[asse]}
              onChange={(e) => {
                setBozza({ ...bozza, [asse]: e.target.value })
                setErrore(null)
              }}
              onBlur={() => scritta && onMeta(scritta)}
            />
          </label>
        ))}
      </form>

      {!scritta ? (
        <p className="m-0 text-pericolo">Coordinate non valide: tre numeri interi.</p>
      ) : !prova ? (
        <p className="m-0 text-testo-tenue">La nave è già qui: scegli una meta dallo scanner o scrivi le coordinate.</p>
      ) : (
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <dt className="text-testo-tenue">Meta</dt>
          <dd className="m-0">
            {coordinate(scritta)} · {tipo ? CATALOGO[tipo].nome : 'spazio vuoto'}
          </dd>
          <dt className="text-testo-tenue">Distanza</dt>
          <dd className="m-0">{settori(distanza(nave.posizione, scritta))}</dd>
          <dt className="text-testo-tenue">Durata</dt>
          <dd className="m-0">
            {durata(prova.durata)} · arrivo alle {orario(new Date(ora.getTime() + prova.durata), ora)}
            {prova.fionda ? ' · fionda ×2' : ''}
          </dd>
          <dt className="text-testo-tenue">Consumo</dt>
          <dd className="m-0">{numero(prova.consumo, 1)} di carburante</dd>
        </dl>
      )}

      {prova?.fermata && prova.possibile && (
        <p className="m-0 text-[#ffc46b]">
          Il carburante basta fino a {coordinate(prova.a)}: lì la nave si fermerà ad aspettare la ricarica.
        </p>
      )}
      {prova && !prova.possibile && <p className="m-0 text-pericolo">{RIFIUTI.carburante_insufficiente}</p>}
      {errore && (
        <p className="m-0 text-pericolo" role="alert">
          {errore}
        </p>
      )}

      <button
        type="button"
        className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-nebula font-semibold text-fondo hover:bg-nebula-scura disabled:opacity-40"
        disabled={!prova?.possibile || inCorso}
        onClick={parti}
      >
        <Rocket className="size-4" aria-hidden="true" />
        {inCorso ? 'Partenza…' : 'Parti'}
      </button>
    </div>
  )
}

function testi(c: Coordinate): Record<(typeof ASSI)[number], string> {
  return { x: String(c.x), y: String(c.y), z: String(c.z) }
}

function leggi(bozza: Record<(typeof ASSI)[number], string>): Coordinate | null {
  const valori = ASSI.map((a) => (bozza[a].trim() === '' ? NaN : Number(bozza[a])))
  if (!valori.every((v) => Number.isSafeInteger(v) && Math.abs(v) <= 2 ** 31 - 1)) return null
  return { x: valori[0], y: valori[1], z: valori[2] }
}
