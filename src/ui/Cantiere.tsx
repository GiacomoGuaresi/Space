import { useContext, useState } from 'react'
import { Wrench } from 'lucide-react'
import { ViaggioRifiutato, type Costruzione } from '../dati'
import { BILANCIAMENTO } from '../dominio/bilanciamento'
import { CATALOGO, NOMI_RISORSE, type TipoCorpo } from '../dominio/catalogo'
import { costoLavoro, durataLavoro, eDellaNave, mancante, NOMI_LAVORI, valoreNave, type Lavoro, type Statistica } from '../dominio/cantiere'
import { magazzinoOra, type Insediamento } from '../dominio/insediamenti'
import { inViaggio, raggioScanner, type Nave } from '../dominio/navigazione'
import { capacitaNave, RISORSE, type Fatte, type Quantita } from '../dominio/risorse'
import { stessoSettore } from '../dominio/settore'
import { AzioniNave } from './azioni'
import { durata, numero, orario, rovescia } from './formato'
import { BottoneSecondario, Etichetta } from './plancia'
import { RIFIUTI } from './rifiuti'
import { CaricoAttuale } from './SchedaNave'

/** Le statistiche che oggi si potenziano (le altre arrivano con i loro step, doc/06-roadmap.md). */
export const STATISTICHE_ATTIVE: readonly Statistica[] = ['motore', 'serbatoio', 'ricarica', 'scanner', 'stiva']

/** Il livello attuale di un lavoro: della nave, o della base `base`. */
export function livelloAttuale(lavoro: Lavoro, nave: Nave, base: Insediamento | undefined): number {
  switch (lavoro) {
    case 'motore':
    case 'serbatoio':
    case 'ricarica':
      return nave.livelli[lavoro]
    case 'scanner':
      return nave.scanner
    case 'stiva':
      return nave.stiva
    case 'produzione':
      return base?.produzione ?? 0
    case 'magazzino':
      return base?.magazzino ?? 0
    case 'cantiere':
      return base?.cantiere ?? 0
    case 'deposito':
      return base?.deposito ?? 0
    case 'laboratorio':
      return base?.laboratorio ?? 0
  }
}

/** I lavori non ancora finiti, dal primo. */
export function inCoda(costruzioni: readonly Costruzione[], ora: Date): Costruzione[] {
  return costruzioni.filter((c) => c.fine > ora)
}

/** Il valore di una statistica al livello `livello`, a parole. */
function valore(lavoro: Statistica, livello: number, fatte: Fatte): string {
  switch (lavoro) {
    case 'motore':
      return `${numero(valoreNave('motore', livello), 2)} sett./h`
    case 'serbatoio':
      return `${numero(valoreNave('serbatoio', livello), 1)} unità`
    case 'ricarica':
      return `${numero(valoreNave('ricarica', livello), 2)}/h`
    case 'scanner': {
      // I livelli alternano un tipo rilevabile e più raggio (doc/02-meccaniche.md#scanner).
      const novita = BILANCIAMENTO.scanner.livelli[livello - 1] ?? 'raggio'
      return novita === 'raggio'
        ? `raggio ${numero(raggioScanner(livello, null), 1)}`
        : `rileva ${CATALOGO[novita as TipoCorpo].nome.toLowerCase()}`
    }
    case 'stiva':
      return `${numero(capacitaNave(livello, fatte), 0)} per risorsa`
  }
}

interface Props {
  nave: Nave
  ora: Date
  /** I lavori di questa coda: quelli della nave, o di una base. */
  lavori: readonly Lavoro[]
  /** Per le strutture: la base di cui si parla (per la nave, quella dove è attraccata). */
  base?: Insediamento
}

/**
 * I potenziamenti (doc/11-interfaccia.md#nave): sempre visibili, con costo
 * (in ambra quanto manca, contando stiva e magazzino della base), tempo e il
 * motivo se non si possono fare. Si avviano solo attraccati.
 */
export function Potenziamenti({ nave, ora, lavori, base }: Props) {
  const bordo = useContext(CaricoAttuale)
  const { potenzia, costruzioni } = useContext(AzioniNave)
  const [inCorso, setInCorso] = useState<Lavoro | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  if (!bordo) return null
  const volo = inViaggio(nave, ora)
  const qui = bordo.insediamenti.find((i) => stessoSettore(i.coordinate, nave.posizione))
  const dove = base ?? qui
  const attraccata = !volo && qui !== undefined && (base === undefined || qui.id === base.id)
  const magazzino: Partial<Quantita> = attraccata && qui ? magazzinoOra(qui, ora) : {}
  const pendenti = inCoda(costruzioni, ora)

  const avvia = async (lavoro: Lavoro) => {
    setInCorso(lavoro)
    setErrore(null)
    try {
      await potenzia(lavoro)
    } catch (e) {
      setErrore(e instanceof ViaggioRifiutato ? RIFIUTI[e.motivo] : 'Lavoro non avviato: controlla la connessione e riprova.')
    } finally {
      setInCorso(null)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="m-0 flex list-none flex-col gap-0 p-0">
        {lavori.map((lavoro) => {
          const attuale = livelloAttuale(lavoro, nave, dove)
          const inAttesa = pendenti.filter((c) => c.lavoro === lavoro && (c.coda === 'nave' || c.insediamento === dove?.id))
          const livello = Math.max(attuale, ...inAttesa.map((c) => c.livello)) + 1
          const costo = costoLavoro(lavoro, livello, bordo.fatte)
          const manca = mancante(costo, bordo.quantita, magazzino)
          const cantiere = dove?.cantiere ?? 0
          const ore = durataLavoro(lavoro, livello, cantiere, bordo.fatte)
          const dellaNave = eDellaNave(lavoro)
          const tetto = BILANCIAMENTO.cantiere.tetto * cantiere
          const motivo = volo
            ? 'In viaggio: si potenzia attraccati a una base.'
            : !attraccata
              ? dellaNave
                ? 'Si potenzia attraccati a una base con cantiere.'
                : 'Si costruisce attraccati a questa base.'
              : dellaNave && cantiere < 1
                ? 'Questa base non ha un cantiere.'
                : dellaNave && lavoro !== 'stiva' && livello > tetto
                  ? `Serve un cantiere di livello ≥ ${Math.ceil(livello / BILANCIAMENTO.cantiere.tetto)}.`
                  : Object.keys(manca).length
                    ? 'Tra stiva e magazzino non basta.'
                    : null
          return (
            <li key={lavoro} className="flex flex-col gap-1 border-b border-separatore py-2.5 last:border-b-0">
              <div className="flex items-baseline gap-2 text-[13px]">
                <span className="flex-1">
                  {NOMI_LAVORI[lavoro]} <span className="text-testo-tenue">· liv. {attuale}</span>
                  {inAttesa.length > 0 && <span className="text-ambra"> · in coda {inAttesa.map((c) => c.livello).join(', ')}</span>}
                </span>
                {eDellaNave(lavoro) && <span className="cifre text-xs text-testo-tenue">→ {valore(lavoro, livello, bordo.fatte)}</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="cifre flex-1 text-xs">
                  {RISORSE.filter((r) => costo[r]).map((r, n) => (
                    <span key={r} className={manca[r] ? 'text-ambra' : 'text-testo-tenue'}>
                      {n > 0 && ' · '}
                      {numero(Math.ceil(costo[r]!), 0)} {NOMI_RISORSE[r].slice(0, 3)}
                    </span>
                  ))}
                  <span className="text-testo-tenue"> · {durata(ore * 3_600_000)}</span>
                </span>
                <BottoneSecondario
                  className="shrink-0 px-3"
                  disabled={motivo !== null || inCorso !== null}
                  onClick={() => void avvia(lavoro)}
                >
                  <Wrench className="size-3.5" aria-hidden="true" />
                  Liv. {livello}
                </BottoneSecondario>
              </div>
              {motivo && <span className="text-xs text-testo-tenue">{motivo}</span>}
            </li>
          )
        })}
      </ul>
      {errore && (
        <p className="m-0 text-xs text-pericolo" role="alert">
          {errore}
        </p>
      )}
    </div>
  )
}

/** La coda: i lavori in corso e in attesa, con il conto alla rovescia. */
export function Coda({ coda, base, ora }: { coda: 'nave' | 'base'; base?: Insediamento; ora: Date }) {
  const { costruzioni } = useContext(AzioniNave)
  const lavori = inCoda(costruzioni, ora).filter((c) => c.coda === coda && (coda === 'nave' || c.insediamento === base?.id))
  if (lavori.length === 0) return <Etichetta>Coda vuota</Etichetta>
  return (
    <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
      {lavori.map((c) => {
        const corre = c.inizio <= ora
        return (
          <li key={c.id} className="flex items-baseline gap-2 text-[13px]">
            <span className="flex-1">
              {NOMI_LAVORI[c.lavoro]} {c.livello}
            </span>
            <span className={`cifre text-xs ${corre ? 'text-ambra' : 'text-testo-tenue'}`}>
              {corre ? rovescia(c.fine.getTime() - ora.getTime()) : `inizia ${orario(c.inizio, ora)}`}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
