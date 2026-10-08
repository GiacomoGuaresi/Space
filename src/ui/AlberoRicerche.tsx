import { useContext, useState } from 'react'
import { FlaskConical } from 'lucide-react'
import { ViaggioRifiutato } from '../dati'
import { NOMI_RISORSE } from '../dominio/catalogo'
import { mancante } from '../dominio/cantiere'
import { magazzinoOra } from '../dominio/insediamenti'
import { inViaggio, type Nave } from '../dominio/navigazione'
import {
  bloccata,
  costoGradino,
  durataGradino,
  gradino,
  ID_RICERCHE,
  RAMI,
  ramo,
  RICERCHE,
  type IdRicerca,
  type Ramo,
  type Ricerche,
} from '../dominio/ricerche'
import { RISORSE } from '../dominio/risorse'
import { stessoSettore } from '../dominio/settore'
import { AzioniNave } from './azioni'
import { durata, numero, rovescia } from './formato'
import { BottonePrimario, Etichetta, Pannello } from './plancia'
import { RIFIUTI } from './rifiuti'
import { CaricoAttuale } from './SchedaNave'

/** Le ricerche completate a `ora`. */
export function ricercheFatte(ricerche: readonly { nodo: string; fine: Date }[], ora: Date): Ricerche {
  return new Set(ricerche.filter((r) => r.fine <= ora).map((r) => r.nodo))
}

/**
 * Le ricerche (doc/11-interfaccia.md#altro): i quattro rami, dal gradino 1 al
 * 10. Si avviano da attraccati a una base col laboratorio; una alla volta.
 */
export function AlberoRicerche({ nave, ora }: { nave: Nave; ora: Date }) {
  const { ricerche } = useContext(AzioniNave)
  const fatte = ricercheFatte(ricerche, ora)
  const inCorso = ricerche.find((r) => r.fine > ora)
  const [scelta, setScelta] = useState<IdRicerca | null>(null)

  const stato = (id: IdRicerca) =>
    fatte.has(id) ? 'fatta' : inCorso?.nodo === id ? 'corso' : bloccata(id, fatte) === null ? 'pronta' : 'chiusa'
  const STILI = {
    fatta: 'border-ambra-scura bg-ambra/15 text-ambra',
    corso: 'border-ambra text-ambra',
    pronta: 'border-ambra-scura text-testo',
    chiusa: 'border-separatore text-testo-tenue',
  } as const

  return (
    <Pannello className="flex min-h-0 flex-1 flex-col overflow-y-auto" etichetta="Ricerche">
      <header className="flex flex-col gap-1 border-b border-linea p-3.5">
        <h1 className="m-0 text-base font-semibold tracking-[0.2em] uppercase">Ricerche</h1>
        <Etichetta className={inCorso ? 'text-ambra!' : ''}>
          {inCorso
            ? `In corso: ${RICERCHE[inCorso.nodo as IdRicerca]?.nome ?? inCorso.nodo} · ${rovescia(inCorso.fine.getTime() - ora.getTime())}`
            : `${fatte.size} di ${ID_RICERCHE.length} · una alla volta, in una base col laboratorio`}
        </Etichetta>
      </header>
      {scelta && (
        <Dettaglio id={scelta} nave={nave} ora={ora} fatte={fatte} occupata={inCorso !== undefined} onChiudi={() => setScelta(null)} />
      )}
      <div className="grid grid-cols-2 gap-x-2 gap-y-3 p-3 sm:grid-cols-4">
        {(Object.keys(RAMI) as Ramo[]).map((r) => (
          <section key={r} aria-label={RAMI[r]} className="flex flex-col gap-1">
            <h2 className="etichetta m-0 mb-1">{RAMI[r]}</h2>
            <ol className="m-0 flex list-none flex-col gap-1 p-0">
              {ID_RICERCHE.filter((id) => ramo(id) === r).map((id) => (
                <li key={id}>
                  <button
                    type="button"
                    aria-pressed={scelta === id}
                    className={`flex w-full items-baseline gap-1.5 rounded-plancia border px-2 py-1.5 text-left text-xs aria-pressed:outline aria-pressed:outline-ambra ${STILI[stato(id)]}`}
                    onClick={() => setScelta(scelta === id ? null : id)}
                  >
                    <span className="cifre shrink-0 text-[10px] opacity-70">{id}</span>
                    <span className="min-w-0 flex-1 truncate">{RICERCHE[id].nome}</span>
                    {stato(id) === 'fatta' && <span aria-label="fatta">✓</span>}
                  </button>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </Pannello>
  )
}

function Dettaglio({
  id,
  nave,
  ora,
  fatte,
  occupata,
  onChiudi,
}: {
  id: IdRicerca
  nave: Nave
  ora: Date
  fatte: Ricerche
  occupata: boolean
  onChiudi: () => void
}) {
  const bordo = useContext(CaricoAttuale)
  const { avviaRicerca } = useContext(AzioniNave)
  const [inCorso, setInCorso] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const g = gradino(id)
  const costo = costoGradino(g, fatte)
  const base = !inViaggio(nave, ora) ? bordo?.insediamenti.find((i) => stessoSettore(i.coordinate, nave.posizione)) : undefined
  const manca = bordo ? mancante(costo, bordo.quantita, base ? magazzinoOra(base, ora, fatte) : {}) : {}
  const motivo =
    bloccata(id, fatte) ??
    (occupata
      ? 'Una ricerca alla volta.'
      : !base
        ? 'Si avvia attraccati a una base col laboratorio.'
        : base.laboratorio < g
          ? `Serve un laboratorio di livello ≥ ${g} (qui è ${base.laboratorio}).`
          : Object.keys(manca).length
            ? 'Tra stiva e magazzino non basta.'
            : null)
  const avvia = async () => {
    setInCorso(true)
    setErrore(null)
    try {
      await avviaRicerca(id)
    } catch (e) {
      setErrore(e instanceof ViaggioRifiutato ? RIFIUTI[e.motivo] : 'Ricerca non avviata: controlla la connessione e riprova.')
    } finally {
      setInCorso(false)
    }
  }
  return (
    <section aria-label={RICERCHE[id].nome} className="flex flex-col gap-2 border-b border-linea bg-fondo/40 p-3.5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="m-0 text-sm font-semibold tracking-[0.1em] uppercase">
          {RICERCHE[id].nome}{' '}
          <span className="cifre text-xs text-testo-tenue">
            · {id} · gradino {g}
          </span>
        </h2>
        <button type="button" className="etichetta" onClick={onChiudi} aria-label="Chiudi il dettaglio">
          ×
        </button>
      </div>
      <p className="m-0 text-[13px]">{RICERCHE[id].effetto}</p>
      <p className="cifre m-0 text-xs">
        {RISORSE.filter((r) => costo[r]).map((r, n) => (
          <span key={r} className={manca[r] ? 'text-ambra' : 'text-testo-tenue'}>
            {n > 0 && ' · '}
            {numero(Math.ceil(costo[r]!), 0)} {NOMI_RISORSE[r].slice(0, 3)}
          </span>
        ))}
        <span className="text-testo-tenue"> · {durata(durataGradino(g) * 3_600_000)} · la nave resta ferma</span>
      </p>
      {motivo && fatte.has(id) === false && <span className="text-xs text-testo-tenue">{motivo}</span>}
      {errore && (
        <p className="m-0 text-xs text-pericolo" role="alert">
          {errore}
        </p>
      )}
      {!fatte.has(id) && (
        <BottonePrimario disabled={motivo !== null || inCorso} onClick={() => void avvia()}>
          <FlaskConical className="size-4" aria-hidden="true" />
          Avvia
        </BottonePrimario>
      )}
    </section>
  )
}
