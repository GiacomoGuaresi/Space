import { useContext, useState } from 'react'
import { ViaggioRifiutato } from '../dati'
import { BILANCIAMENTO } from '../dominio/bilanciamento'
import { AzioniNave } from './azioni'
import { RIFIUTI } from './rifiuti'
import { magazzinoOra, pienoTra, tettoMagazzino, type Insediamento } from '../dominio/insediamenti'
import { inViaggio, type Nave } from '../dominio/navigazione'
import { RISORSE, type Fatte } from '../dominio/risorse'
import { CaricoAttuale } from './SchedaNave'
import { distanza, settore, stessoSettore } from '../dominio/settore'
import { coordinatePlancia, durata, numero } from './formato'
import { vaiA } from './indirizzo'
import { BarreMagazzino, NOMI_INSEDIAMENTI } from './Magazzino'
import { BottoneSecondario, Etichetta, Pannello } from './plancia'

type Ordine = 'riempimento' | 'distanza'

/** Quanto è pieno il magazzino, da 0 a 1: la risorsa più vicina al tetto. */
function riempimento(i: Insediamento, ora: Date, fatte?: Fatte): number {
  const tetti = tettoMagazzino(i, fatte)
  const adesso = magazzinoOra(i, ora, fatte)
  return Math.max(0, ...RISORSE.filter((r) => tetti[r]).map((r) => (adesso[r] ?? 0) / tetti[r]!))
}

/**
 * La Rete (doc/11-interfaccia.md#rete): gli insediamenti, dal più pieno o dal
 * più vicino, con il magazzino e il tasto VAI che imposta la rotta.
 */
export function Rete({ nave, insediamenti, ora }: { nave: Nave; insediamenti: readonly Insediamento[]; ora: Date }) {
  const [ordine, setOrdine] = useState<Ordine>('riempimento')
  const fatte = useContext(CaricoAttuale)?.fatte
  const telemetria = fatte?.has('S4') ?? false
  const volo = inViaggio(nave, ora)
  const elenco = [...insediamenti].sort((a, b) =>
    ordine === 'riempimento'
      ? riempimento(b, ora, fatte) - riempimento(a, ora, fatte)
      : distanza(nave.posizione, a.coordinate) - distanza(nave.posizione, b.coordinate),
  )
  return (
    <Pannello className="flex min-h-0 flex-1 flex-col overflow-y-auto" etichetta="Rete">
      <header className="flex flex-col gap-2 border-b border-linea p-3.5">
        <h1 className="m-0 text-base font-semibold tracking-[0.2em] uppercase">Rete</h1>
        <div role="group" aria-label="Ordine" className="flex gap-1.5">
          {(['riempimento', 'distanza'] as const).map((o) => (
            <button
              key={o}
              type="button"
              aria-pressed={ordine === o}
              className="etichetta h-7 rounded-plancia border border-linea px-2.5 aria-pressed:border-ambra aria-pressed:bg-ambra/12 aria-pressed:text-ambra"
              onClick={() => setOrdine(o)}
            >
              {o === 'riempimento' ? 'Più pieni' : 'Più vicini'}
            </button>
          ))}
        </div>
      </header>
      <ul className="m-0 list-none p-0">
        {elenco.map((i) => {
          const qui = stessoSettore(i.coordinate, nave.posizione)
          const nome = i.tipo === 'madre' ? 'Base madre' : (settore(i.coordinate).corpo?.nome ?? coordinatePlancia(i.coordinate))
          const tra = pienoTra(i, ora, fatte)
          return (
            <li key={i.id} className="flex flex-col gap-2 border-b border-separatore p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold tracking-[0.1em] uppercase">
                    <span aria-hidden="true" className="mr-1.5 text-ambra">
                      {i.tipo === 'estrattore' ? '◇' : '⬢'}
                    </span>
                    {nome}
                  </span>
                  <Etichetta>
                    {NOMI_INSEDIAMENTI[i.tipo]}
                    {i.ponte > 0 ? ' · ponte' : ''} · {coordinatePlancia(i.coordinate)} ·{' '}
                    {qui ? 'qui' : `${numero(distanza(nave.posizione, i.coordinate), 1)} sett.`}
                  </Etichetta>
                </div>
                {!qui && (
                  <BottoneSecondario
                    className="shrink-0 px-4"
                    disabled={volo}
                    onClick={() => vaiA({ pagina: 'ponte', meta: i.coordinate })}
                  >
                    Vai
                  </BottoneSecondario>
                )}
              </div>
              {/* Da lontano il magazzino si vede solo con *Telemetria* (S4); senza, si sa solo quando sarà pieno. */}
              {qui || telemetria ? (
                <BarreMagazzino insediamento={i} ora={ora} />
              ) : (
                <p className="m-0 text-xs text-testo-tenue">
                  {tra === 0 ? 'Pieno, secondo i calcoli.' : `Pieno tra ${durata(tra * 3_600_000)}, secondo i calcoli.`} Il magazzino da
                  lontano si vede con Telemetria.
                </p>
              )}
              {tra === 0 && !qui && <p className="m-0 text-xs text-ambra">Pieno: passa a raccogliere, la produzione è ferma.</p>}
              {i.tipo !== 'madre' && <Abbandono insediamento={i} nome={nome} />}
            </li>
          )
        })}
      </ul>
      <p className="m-0 p-3.5 text-xs text-testo-tenue">
        Arrivando in un insediamento il magazzino passa da solo nella stiva, fin dove c'è posto. Ripartendo si carica anche quello prodotto
        durante la sosta.
      </p>
    </Pannello>
  )
}

/**
 * Abbandonare un insediamento (doc/02-meccaniche.md#insediamenti), con una
 * conferma: strutture, coda e scorte spariscono, il corpo torna libero. Con
 * *Riciclo* torna nella stiva una parte di quanto ci hai speso.
 */
function Abbandono({ insediamento, nome }: { insediamento: Insediamento; nome: string }) {
  const { abbandona } = useContext(AzioniNave)
  const riciclo = useContext(CaricoAttuale)?.fatte.has('I6') ?? false
  const [conferma, setConferma] = useState(false)
  const [inCorso, setInCorso] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const fai = async () => {
    setInCorso(true)
    setErrore(null)
    try {
      await abbandona(insediamento.id)
    } catch (e) {
      setErrore(e instanceof ViaggioRifiutato ? RIFIUTI[e.motivo] : 'Abbandono non riuscito: controlla la connessione e riprova.')
      setInCorso(false)
    }
  }
  if (!conferma) {
    return (
      <button type="button" className="etichetta self-end text-testo-tenue hover:text-pericolo" onClick={() => setConferma(true)}>
        Abbandona…
      </button>
    )
  }
  return (
    <div className="smussato flex flex-col gap-2 border border-pericolo/60 p-2.5 [--smusso-colore:color-mix(in_srgb,var(--color-pericolo)_60%,transparent)] [--smusso:7px]" role="alertdialog" aria-label={`Abbandona ${nome}`}>
      <p className="m-0 text-xs">
        Abbandoni {nome}: strutture, coda e magazzino spariscono, e il corpo torna libero.{' '}
        {riciclo
          ? `Con Riciclo torna nella stiva il ${Math.round(BILANCIAMENTO.ricerche.effetti.I6 * 100)} % di quanto ci hai speso, fin dove c'è posto.`
          : 'Non torna nulla.'}
      </p>
      {errore && (
        <p className="m-0 text-xs text-pericolo" role="alert">
          {errore}
        </p>
      )}
      <div className="flex gap-2">
        <BottoneSecondario className="flex-1" disabled={inCorso} onClick={() => setConferma(false)}>
          Annulla
        </BottoneSecondario>
        <BottoneSecondario className="flex-1 border-pericolo! text-pericolo!" disabled={inCorso} onClick={() => void fai()}>
          Abbandona
        </BottoneSecondario>
      </div>
    </div>
  )
}
