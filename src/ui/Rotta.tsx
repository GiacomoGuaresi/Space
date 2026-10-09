import { useContext, useEffect, useState, type FormEvent } from 'react'
import { Rocket } from 'lucide-react'
import { ViaggioRifiutato } from '../dati'
import { BILANCIAMENTO } from '../dominio/bilanciamento'
import { CATALOGO } from '../dominio/catalogo'
import { anteprima, fattorePonte, tipiRilevabili, type Nave } from '../dominio/navigazione'
import { distanza, stessoSettore, tipoSettore, type Coordinate } from '../dominio/settore'
import { coordinate, durata, numero, orario, settori } from './formato'
import { AzioniNave } from './azioni'
import { useDintorni } from './SchedaNave'
import { BottonePrimario, Info } from './plancia'
import { RIFIUTI } from './rifiuti'

const ASSI = ['x', 'y', 'z'] as const

interface Props {
  nave: Nave
  ora: Date
  meta: Coordinate | null
  /** Le chiavi "x,y,z" dei settori già scoperti: il loro tipo si conosce sempre. */
  scoperti: ReadonlySet<string>
  onMeta: (meta: Coordinate) => void
  onParti: (meta: Coordinate) => Promise<void>
}

/**
 * La rotta: si sceglie la meta (dallo scanner o scrivendo le coordinate), si
 * vede quanto dura, quanto consuma e se il carburante basta, e si parte.
 */
export function Rotta({ nave, ora, meta, scoperti, onMeta, onParti }: Props) {
  const [bozza, setBozza] = useState<Record<(typeof ASSI)[number], string>>(() => testi(meta ?? nave.posizione))
  const [inCorso, setInCorso] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  useEffect(() => {
    if (meta) setBozza(testi(meta))
  }, [meta])

  const scritta = leggi(bozza)
  const valida = scritta !== null && !stessoSettore(scritta, nave.posizione)
  const dintorni = useDintorni()
  const prova = valida ? anteprima(nave, scritta, ora, dintorni) : null
  // Lo scanner non rivela i tipi che non rileva: si sa cosa c'è solo se è
  // rilevabile o già scoperto.
  const tipoVero = scritta ? tipoSettore(scritta) : null
  const tipo =
    tipoVero && (tipiRilevabili(nave.scanner).has(tipoVero) || scoperti.has(`${scritta!.x},${scritta!.y},${scritta!.z}`)) ? tipoVero : null

  const invia = (evento: FormEvent) => {
    evento.preventDefault()
    if (scritta) onMeta(scritta)
  }

  // Durante un potenziamento la nave resta nel cantiere.
  const azioni = useContext(AzioniNave)
  const cantiere = [...azioni.costruzioni.filter((c) => c.coda === 'nave'), ...azioni.ricerche]
    .filter((c) => c.fine > ora)
    .sort((a, b) => a.fine.getTime() - b.fine.getTime())
    .at(-1)

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
              className="h-9 w-[4.5rem] rounded-plancia border border-linea/70 bg-fondo/60 px-2 text-testo tabular-nums focus:outline-2 focus:-outline-offset-1 focus:outline-ambra"
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
            {coordinate(scritta)} · {tipo ? CATALOGO[tipo].nome : 'nessun corpo rilevato'}
          </dd>
          <dt className="text-testo-tenue">Distanza</dt>
          <dd className="m-0">{settori(distanza(nave.posizione, scritta))}</dd>
          <dt className="text-testo-tenue">Durata</dt>
          <dd className="m-0">
            {durata(prova.durata)} · arrivo alle {orario(new Date(ora.getTime() + prova.durata), ora)}
            {prova.fionda ? ` · fionda ×${numero(BILANCIAMENTO.fionda.velocita, 1)}` : ''}
            {prova.ponte ? ` · ponte di curvatura ×${fattorePonte(dintorni.fatte ?? new Set())}` : ''}{' '}
            <Info
              titolo="Durata"
              wiki="viaggio"
              formula={`${numero(prova.percorsa, 2)} settori / (${numero(nave.velocita, 2)} settori/h${
                prova.fionda ? ` × ${numero(BILANCIAMENTO.fionda.velocita, 1)}` : ''
              }${prova.ponte ? ` × ${fattorePonte(dintorni.fatte ?? new Set())}` : ''})`}
              esatto={`${numero(prova.durata / 3_600_000, 2)} h`}
            />
          </dd>
          <dt className="text-testo-tenue">Consumo</dt>
          <dd className="m-0">
            {numero(prova.consumo, 1)} di carburante
            {prova.fionda ? ` · il ${numero(BILANCIAMENTO.fionda.gratis * 100)} % gratis` : ''}
            {prova.ponte ? ` · diviso ${fattorePonte(dintorni.fatte ?? new Set())} dal ponte` : ''}
          </dd>
        </dl>
      )}

      {prova?.fermata && prova.possibile && (
        <p className="m-0 text-ambra">Il carburante basta fino a {coordinate(prova.a)}: lì la nave si fermerà ad aspettare la ricarica.</p>
      )}
      {prova && !prova.possibile && <p className="m-0 text-pericolo">{RIFIUTI.carburante_insufficiente}</p>}
      {errore && (
        <p className="m-0 text-pericolo" role="alert">
          {errore}
        </p>
      )}

      {cantiere && <p className="m-0 text-xs text-ambra">La nave è ferma per un lavoro fino a {orario(cantiere.fine, ora)}.</p>}
      <BottonePrimario disabled={!prova?.possibile || inCorso || cantiere !== undefined} onClick={parti}>
        <Rocket className="size-4" aria-hidden="true" />
        {inCorso ? 'Partenza…' : 'Parti'}
      </BottonePrimario>
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
