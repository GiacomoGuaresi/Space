import { useContext, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { IconaParti, IconaScanner } from './icone'
import { apri } from './finestre'
import { usePC } from './schermo'
import { ViaggioRifiutato } from '../dati'
import { CATALOGO } from '../dominio/catalogo'
import { anteprima, carburanteOra, fattorePonte, fiondaDi, tipiRilevabili, type Nave } from '../dominio/navigazione'
import { BASE, distanza, settore, stessoSettore, tipoSettore, type Coordinate } from '../dominio/settore'
import { coordinatePlancia, durata, numero, orario } from './formato'
import { AzioniNave } from './azioni'
import { useDintorni } from './SchedaNave'
import { BottonePrimario, BottoneSecondario, Etichetta, Info, SimboloRarita } from './plancia'
import { RIFIUTI } from './rifiuti'
import { COLORI_RARITA } from './colori'

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
  const fionda = fiondaDi(dintorni.fatte ?? new Set())
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

  const carburante = carburanteOra(nave, ora, dintorni)
  const ponte = fattorePonte(dintorni.fatte ?? new Set())

  return (
    <div className="flex min-h-full flex-1 flex-col gap-2.5 text-xs">
      <form className="flex flex-col gap-1.5" onSubmit={invia}>
        <Etichetta>Coordinate della meta</Etichetta>
        <div className="grid grid-cols-3 gap-1.5">
          {ASSI.map((asse) => (
            <label
              key={asse}
              className="flex h-9 items-center border border-linea/70 bg-fondo/60 focus-within:border-ambra focus-within:outline-1 focus-within:outline-ambra"
            >
              <span className="etichetta w-6 shrink-0 text-center">{asse}</span>
              <input
                className="cifre h-full w-full min-w-0 bg-transparent pr-2 text-right text-[14px] text-testo outline-none"
                inputMode="numeric"
                aria-label={`Coordinata ${asse.toUpperCase()}`}
                value={bozza[asse]}
                onChange={(e) => {
                  setBozza({ ...bozza, [asse]: e.target.value })
                  setErrore(null)
                }}
                onBlur={() => scritta && onMeta(scritta)}
              />
            </label>
          ))}
        </div>
      </form>

      {!scritta ? (
        <Avviso tono="pericolo">Coordinate non valide: servono tre numeri interi.</Avviso>
      ) : !prova ? (
        <MeteRapide qui={nave.posizione} basi={dintorni.basi ?? []} onMeta={onMeta} />
      ) : (
        <>
          <div className="flex flex-col gap-0.5 border-l-2 border-ambra pl-2.5">
            <Etichetta className={tipo ? COLORI_RARITA[CATALOGO[tipo].rarita].testo : ''}>
              {tipo ? (
                <>
                  <SimboloRarita rarita={CATALOGO[tipo].rarita} /> {CATALOGO[tipo].nome} · {CATALOGO[tipo].rarita}
                </>
              ) : (
                'Nessun corpo rilevato'
              )}
            </Etichetta>
            <span className="cifre text-[15px] text-testo">{coordinatePlancia(scritta)}</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <Dato etichetta="Distanza" valore={numero(distanza(nave.posizione, scritta), 1)} unita={numero(distanza(nave.posizione, scritta), 1) === '1' ? 'settore' : 'settori'} />
            <Dato
              etichetta={prova.fermata ? 'Fino alla sosta' : 'Durata'}
              valore={durata(prova.durata)}
              sotto={`${prova.fermata ? 'sosta' : 'arrivo'} ${orario(new Date(ora.getTime() + prova.durata), ora)}`}
              info={
                <Info
                  titolo="Durata"
                  wiki="viaggio"
                  formula={`${numero(prova.percorsa, 2)} settori / (${numero(nave.velocita, 2)} settori/h${
                    prova.fionda ? ` × ${numero(fionda.velocita, 1)}` : ''
                  }${prova.ponte ? ` × ${ponte}` : ''})`}
                  esatto={`${numero(prova.durata / 3_600_000, 2)} h`}
                />
              }
            />
          </div>

          <Serbatoio carburante={carburante} consumo={prova.consumo} serbatoio={nave.serbatoio} sosta={prova.fermata} />

          {(prova.fionda || prova.ponte) && (
            <div className="flex flex-wrap gap-1.5">
              {prova.fionda && (
                <Bonus>
                  Fionda · ×{numero(fionda.velocita, 1)} velocità, {numero(fionda.gratis * 100)} % gratis
                </Bonus>
              )}
              {prova.ponte && <Bonus>Ponte di curvatura · ×{ponte} velocità, carburante ÷{ponte}</Bonus>}
            </div>
          )}
        </>
      )}

      {prova?.fermata && prova.possibile && (
        <Avviso tono="ambra">
          Il carburante basta fino a <span className="cifre">{coordinatePlancia(prova.a)}</span>: lì la nave si fermerà ad aspettare
          la ricarica.
        </Avviso>
      )}
      {prova && !prova.possibile && <Avviso tono="pericolo">{RIFIUTI.carburante_insufficiente}</Avviso>}
      {cantiere && <Avviso tono="ambra">La nave è ferma per un lavoro fino a {orario(cantiere.fine, ora)}.</Avviso>}
      {errore && (
        <Avviso tono="pericolo" ruolo="alert">
          {errore}
        </Avviso>
      )}

      {/* Parti resta sempre in vista, in fondo, anche se sopra si scorre. Senza una meta non serve. */}
      {prova && <div className="sticky bottom-0 mt-auto bg-pannello/95 pt-1">
        <BottonePrimario className="w-full" disabled={!prova?.possibile || inCorso || cantiere !== undefined} onClick={parti}>
          <IconaParti className="size-4" aria-hidden="true" />
          {inCorso ? 'Partenza…' : 'Parti'}
        </BottonePrimario>
      </div>}
    </div>
  )
}

/**
 * Senza una meta (le coordinate sono quelle della nave): le basi più vicine
 * come mete pronte e, su PC, lo scanner. Occupa lo spazio dell'anteprima.
 */
function MeteRapide({ qui, basi, onMeta }: { qui: Coordinate; basi: readonly Coordinate[]; onMeta: (c: Coordinate) => void }) {
  const pc = usePC()
  const vicine = (basi.some((b) => stessoSettore(b, BASE)) ? [...basi] : [BASE, ...basi])
    .filter((b) => !stessoSettore(b, qui))
    .sort((a, b) => distanza(qui, a) - distanza(qui, b))
    .slice(0, 4)
  return (
    <div className="flex flex-1 flex-col gap-2.5 border border-dashed border-separatore p-2.5">
      <p className="m-0 leading-snug text-testo-tenue">
        La nave è già qui. Scrivi le coordinate, oppure scegli una meta dallo scanner, dalla mappa o da qui sotto.
      </p>
      {vicine.length > 0 && (
        <div className="flex flex-col gap-1">
          <Etichetta>Basi</Etichetta>
          <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
            {vicine.map((b) => (
              <li key={`${b.x},${b.y},${b.z}`}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 border border-transparent px-2 py-1.5 text-left hover:border-linea hover:bg-fondo/50"
                  onClick={() => onMeta(b)}
                >
                  <span aria-hidden="true" className="text-ambra">
                    ⬢
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {stessoSettore(b, BASE) ? 'Base madre' : (settore(b).corpo?.nome ?? 'Base')}
                    <span className="cifre text-testo-tenue"> · {coordinatePlancia(b)}</span>
                  </span>
                  <span className="cifre shrink-0 text-testo-tenue">{numero(distanza(qui, b), 1)} sett.</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {pc && (
        <BottoneSecondario className="mt-auto w-full" onClick={() => apri('scanner')}>
          <IconaScanner className="size-4" />
          Scegli dallo scanner
        </BottoneSecondario>
      )}
    </div>
  )
}

/** Un numero dell'anteprima in un riquadro: l'etichetta sopra, il valore grande, un dettaglio sotto. */
function Dato({ etichetta, valore, unita, sotto, info }: { etichetta: string; valore: string; unita?: string; sotto?: string; info?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 border border-separatore bg-fondo/40 px-2.5 py-1.5">
      <span className="flex items-center justify-between gap-1">
        <Etichetta>{etichetta}</Etichetta>
        {info}
      </span>
      <span className="cifre text-[16px] leading-none text-testo">
        {valore}
        {unita && <span className="ml-1 text-[11px] text-testo-tenue">{unita}</span>}
      </span>
      {sotto && <span className="cifre text-[11px] text-testo-tenue">{sotto}</span>}
    </div>
  )
}

/** Il carburante: quanto resta all'arrivo (pieno), quanto si consuma (tenue), il vuoto del serbatoio. */
function Serbatoio({ carburante, consumo, serbatoio, sosta }: { carburante: number; consumo: number; serbatoio: number; sosta: boolean }) {
  const speso = Math.min(consumo, carburante)
  const resta = Math.max(0, carburante - speso)
  const parte = (n: number) => `${Math.max(0, Math.min(100, (n / serbatoio) * 100))}%`
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-baseline justify-between gap-2">
        <Etichetta>Carburante</Etichetta>
        <span className="cifre text-[12px] text-testo-tenue">
          <span className="text-ambra">−{numero(consumo, 1)}</span> · {sosta ? 'alla sosta' : "all'arrivo"} {numero(resta, 1)}/
          {numero(serbatoio, 1)}
        </span>
      </span>
      <span
        className="flex h-1.5 bg-[#211a10]"
        role="meter"
        aria-label="Carburante all'arrivo"
        aria-valuemin={0}
        aria-valuemax={serbatoio}
        aria-valuenow={Math.round(resta * 10) / 10}
      >
        <span className="h-full bg-ambra" style={{ width: parte(resta) }} />
        <span className="h-full bg-ambra/30" style={{ width: parte(speso) }} />
      </span>
    </div>
  )
}

/** Un vantaggio del viaggio (fionda, ponte): un'etichetta col bordo. */
function Bonus({ children }: { children: ReactNode }) {
  return <span className="border border-ambra-scura/60 px-1.5 py-0.5 text-[11px] text-ambra">{children}</span>
}

/** Un avviso nel pannello: ambra se si parte lo stesso, rosso se no. */
function Avviso({ tono, ruolo, children }: { tono: 'ambra' | 'pericolo'; ruolo?: 'alert'; children: ReactNode }) {
  const colori = tono === 'ambra' ? 'border-ambra text-ambra bg-ambra/8' : 'border-pericolo text-pericolo bg-pericolo/8'
  return (
    <p role={ruolo} className={`m-0 border-l-2 px-2.5 py-1.5 leading-snug ${colori}`}>
      {children}
    </p>
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
