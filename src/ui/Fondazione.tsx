import { createContext, useContext, useState, type ReactNode } from 'react'
import { IconaEstrattore, IconaFonda, IconaPianeta, IconaRisorsa } from './icone'
import { ViaggioRifiutato } from '../dati'
import { CATALOGO, NOMI_RISORSE } from '../dominio/catalogo'
import {
  basiFondabili,
  costoEstrattore,
  costoFondazione,
  estrattoriFondabili,
  ricercaEstrattore,
  ritmoInsediamento,
  tipiEstrattori,
} from '../dominio/insediamenti'
import { inViaggio, type Nave } from '../dominio/navigazione'
import { RISORSE, type Quantita } from '../dominio/risorse'
import { settore, stessoSettore } from '../dominio/settore'
import { AzioniNave } from './azioni'
import { numero } from './formato'
import { BottonePrimario, Etichetta } from './plancia'
import { RIFIUTI } from './rifiuti'
import { CaricoAttuale } from './SchedaNave'

const NOMI_PIANETI = { roccioso: 'roccioso', oceanico: 'oceanico', ghiacciato: 'ghiacciato', gassoso: 'gassoso' } as const

/** Cosa si può fondare dove sta la nave: una base, un estrattore, o niente. */
export type Fondabile = 'base' | 'estrattore' | null

/** Il dock mostra Fonda solo dove si può fondare (lo calcola il Ponte). */
export const FondabileQui = createContext<Fondabile>(null)

/**
 * Cosa si può fondare qui (doc/02-meccaniche.md#insediamenti): ferma, in un
 * settore senza insediamenti, una base su un sistema planetario (se non si è
 * al limite delle basi) o un estrattore su un corpo che ne regge uno (se la
 * sua ricerca è fatta e non si è al limite). Il costo invece può mancare: lo
 * si vede nel menu.
 */
export function fondabile(nave: Nave, ora: Date, bordo: React.ContextType<typeof CaricoAttuale>): Fondabile {
  const corpo = settore(nave.posizione).corpo
  if (!bordo || !corpo || inViaggio(nave, ora)) return null
  if (bordo.insediamenti.some((i) => stessoSettore(i.coordinate, nave.posizione))) return null
  if (corpo.dettagli.tipo === 'sistema') {
    const basi = bordo.insediamenti.filter((i) => i.tipo === 'base').length
    return basi < basiFondabili(bordo.fatte) ? 'base' : null
  }
  if (ricercaEstrattore(corpo.tipo) && tipiEstrattori(bordo.fatte).includes(corpo.tipo)) {
    const estrattori = bordo.insediamenti.filter((i) => i.tipo === 'estrattore').length
    return estrattori < estrattoriFondabili(bordo.fatte) ? 'estrattore' : null
  }
  return null
}

/** Il menu Fonda: una finestra su PC, una linguetta sul telefono. */
export function Fonda({ nave, ora }: { nave: Nave; ora: Date }) {
  const bordo = useContext(CaricoAttuale)
  const cosa = fondabile(nave, ora, bordo)
  if (cosa === 'base') return <FondaBase nave={nave} />
  if (cosa === 'estrattore') return <FondaEstrattore nave={nave} />
  return <p className="m-0 p-4 text-xs text-testo-tenue">Qui non si può fondare niente.</p>
}

/** In Qui, dove si può fondare: l'invito che apre il menu Fonda. */
export function InvitoFonda({ cosa, onApri }: { cosa: Exclude<Fondabile, null>; onApri: () => void }) {
  const Icona = cosa === 'base' ? IconaFonda : IconaEstrattore
  return (
    <button
      type="button"
      onClick={onApri}
      className="smussato group mt-3 flex w-full items-center gap-3 border border-ambra-scura/70 bg-ambra/5 p-2.5 text-left [--smusso-colore:color-mix(in_oklab,var(--color-ambra-scura)_70%,transparent)] [--smusso:7px] hover:bg-ambra/10"
    >
      <span className="grid size-8 shrink-0 place-items-center text-ambra">
        <Icona className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="etichetta text-ambra!">{cosa === 'base' ? 'Fonda una base' : 'Fonda un estrattore'}</span>
        <span className="text-xs text-testo-tenue">{cosa === 'base' ? 'Qui si può: scegli il pianeta e vedi il costo' : 'Qui si può: vedi produzione e costo'}</span>
      </span>
      <span aria-hidden="true" className="text-ambra transition-transform group-hover:translate-x-0.5">
        ›
      </span>
    </button>
  )
}

/** La base: si sceglie il pianeta, che decide il mix della produzione. */
function FondaBase({ nave }: { nave: Nave }) {
  const bordo = useContext(CaricoAttuale)!
  const { fonda } = useContext(AzioniNave)
  const [scelto, setScelto] = useState(0)
  const { invia, inCorso, errore } = useInvio(() => fonda(scelto))
  const corpo = settore(nave.posizione).corpo!
  if (corpo.dettagli.tipo !== 'sistema') return null
  const { pianeti } = corpo.dettagli
  const basi = bordo.insediamenti.filter((i) => i.tipo === 'base').length
  const limite = basiFondabili(bordo.fatte)
  const costo = costoFondazione(basi)

  return (
    <Pannellino
      icona={<IconaFonda className="size-6" />}
      titolo="Fonda una base"
      luogo={corpo.nome}
      conto={`${basi} di ${limite} ${limite === 1 ? 'base' : 'basi'}`}
      parte={basi / limite}
    >
      <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
        <legend className="etichetta mb-2 p-0">Pianeta · decide cosa produce</legend>
        {pianeti.map((p, n) => {
          const ritmi = ritmoInsediamento({ tipo: 'base', coordinate: nave.posizione, pianeta: n, produzione: 1 }, 1, bordo.fatte)
          const acceso = scelto === n
          return (
            <label
              key={p.nome}
              className={`flex cursor-pointer items-center gap-3 border px-3 py-2 has-focus-visible:outline-1 has-focus-visible:outline-ambra ${
                acceso ? 'border-ambra bg-ambra/10' : 'border-separatore hover:border-linea'
              }`}
            >
              <input type="radio" name="pianeta" className="sr-only" checked={acceso} onChange={() => setScelto(n)} />
              <IconaPianeta className={`size-5 shrink-0 ${acceso ? 'text-ambra' : 'text-testo-tenue'}`} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[13px]">{p.nome}</span>
                <span className="text-[11px] text-testo-tenue">{NOMI_PIANETI[p.tipo]}</span>
              </span>
              <Ritmi ritmi={ritmi} />
            </label>
          )
        })}
      </fieldset>
      <Costo costo={costo} quantita={bordo.quantita} gratis={basi === 0} />
      <Errore errore={errore} />
      <BottonePrimario disabled={inCorso || manca(costo, bordo.quantita)} onClick={invia}>
        <IconaFonda className="size-4" aria-hidden="true" />
        {basi === 0 ? 'Fonda · gratis' : `Fonda su ${pianeti[scelto]?.nome ?? ''}`}
      </BottonePrimario>
    </Pannellino>
  )
}

/** L'estrattore: produce col mix del corpo, con solo produzione e magazzino. */
function FondaEstrattore({ nave }: { nave: Nave }) {
  const bordo = useContext(CaricoAttuale)!
  const { fondaEstrattore } = useContext(AzioniNave)
  const { invia, inCorso, errore } = useInvio(fondaEstrattore)
  const corpo = settore(nave.posizione).corpo!
  const fondati = bordo.insediamenti.filter((i) => i.tipo === 'estrattore').length
  const limite = estrattoriFondabili(bordo.fatte)
  const costo = costoEstrattore(fondati)
  const ritmi = ritmoInsediamento({ tipo: 'estrattore', coordinate: nave.posizione, pianeta: null, produzione: 1 }, 1, bordo.fatte)

  return (
    <Pannellino
      icona={<IconaEstrattore className="size-6" />}
      titolo="Fonda un estrattore"
      luogo={`${CATALOGO[corpo.tipo].nome} · ${corpo.nome}`}
      conto={`${fondati} di ${limite} estrattori`}
      parte={fondati / limite}
    >
      <div className="flex flex-col gap-2">
        <Etichetta>Produzione al livello 1</Etichetta>
        <div className="flex items-center justify-between gap-3 border border-separatore px-3 py-2">
          <span className="text-xs text-testo-tenue">Fino al tetto del suo magazzino</span>
          <Ritmi ritmi={ritmi} />
        </div>
      </div>
      <Costo costo={costo} quantita={bordo.quantita} />
      <Errore errore={errore} />
      <BottonePrimario disabled={inCorso || manca(costo, bordo.quantita)} onClick={invia}>
        <IconaEstrattore className="size-4" aria-hidden="true" />
        Fonda l'estrattore
      </BottonePrimario>
    </Pannellino>
  )
}

/** L'ossatura del menu: la testata col luogo e il conto, poi il contenuto. */
function Pannellino({
  icona,
  titolo,
  luogo,
  conto,
  parte,
  children,
}: {
  icona: ReactNode
  titolo: string
  luogo: string
  conto: string
  parte: number
  children: ReactNode
}) {
  return (
    <section aria-label={titolo} className="flex flex-col gap-4 p-4">
      <header className="flex items-center gap-3">
        <span className="smussato grid size-11 shrink-0 place-items-center border border-ambra-scura bg-[radial-gradient(circle,rgb(255_181_71/0.16),transparent_70%)] text-ambra [--smusso-colore:var(--color-ambra-scura)] [--smusso:8px]">
          {icona}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="m-0 text-[15px] leading-none font-semibold tracking-[0.16em] uppercase">{titolo}</h2>
          <span className="truncate text-xs text-testo-tenue">{luogo}</span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <Etichetta className="text-[9px]">{conto}</Etichetta>
          <span aria-hidden="true" className="h-1 w-16 bg-[#211a10]">
            <span className="block h-full bg-ambra-scura" style={{ width: `${Math.min(1, parte) * 100}%` }} />
          </span>
        </span>
      </header>
      {children}
    </section>
  )
}

/** Quanto produce all'ora: un'etichetta per risorsa, con l'icona. */
function Ritmi({ ritmi }: { ritmi: Partial<Quantita> }) {
  return (
    <span className="flex shrink-0 flex-wrap justify-end gap-x-2 gap-y-1">
      {RISORSE.filter((r) => ritmi[r]).map((r) => (
        <span key={r} title={`${NOMI_RISORSE[r]} all'ora`} className="cifre inline-flex items-center gap-1 text-[11px] text-testo">
          <IconaRisorsa risorsa={r} className="size-3.5 text-ambra" />
          {numero(ritmi[r]!, 1)}
          <span className="text-testo-tenue">/h</span>
        </span>
      ))}
    </span>
  )
}

/** Il costo, dalla stiva: in ambra quello che manca. */
function Costo({ costo, quantita, gratis = false }: { costo: Partial<Quantita>; quantita: Quantita; gratis?: boolean }) {
  const voci = RISORSE.filter((r) => costo[r])
  if (gratis || voci.length === 0)
    return <p className="m-0 border border-dashed border-separatore px-3 py-2 text-xs text-testo-tenue">La prima base è gratis.</p>
  return (
    <div className="flex flex-col gap-2">
      <span className="flex items-baseline justify-between">
        <Etichetta>Costo · dalla stiva</Etichetta>
        {manca(costo, quantita) && <span className="text-[11px] text-ambra">in ambra quello che manca</span>}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {voci.map((r) => {
          const corto = quantita[r] < costo[r]!
          return (
            <span
              key={r}
              title={`${NOMI_RISORSE[r]}: ${numero(Math.floor(quantita[r]))} in stiva`}
              className={`cifre inline-flex items-center gap-1.5 border px-2 py-1 text-xs ${corto ? 'border-ambra/60 text-ambra' : 'border-separatore text-testo'}`}
            >
              <IconaRisorsa risorsa={r} className="size-4" />
              {numero(Math.ceil(costo[r]!), 0)}
              <span className="text-[10px] text-testo-tenue">{NOMI_RISORSE[r]}</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}

function Errore({ errore }: { errore: string | null }) {
  return errore ? (
    <p className="m-0 text-xs text-pericolo" role="alert">
      {errore}
    </p>
  ) : null
}

const manca = (costo: Partial<Quantita>, quantita: Quantita) => RISORSE.some((r) => costo[r] && quantita[r] < costo[r]!)

/** Manda la fondazione, con lo stato e l'errore a parole. */
function useInvio(azione: () => Promise<void>) {
  const [inCorso, setInCorso] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const invia = async () => {
    setInCorso(true)
    setErrore(null)
    try {
      await azione()
    } catch (e) {
      setErrore(e instanceof ViaggioRifiutato ? RIFIUTI[e.motivo] : 'Fondazione non riuscita: controlla la connessione e riprova.')
    } finally {
      setInCorso(false)
    }
  }
  return { invia: () => void invia(), inCorso, errore }
}
