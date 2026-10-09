import { useContext, useState, type ReactNode } from 'react'
import { ViaggioRifiutato } from '../dati'
import { BILANCIAMENTO } from '../dominio/bilanciamento'
import { NOMI_RISORSE } from '../dominio/catalogo'
import { NOMI_LAVORI } from '../dominio/cantiere'
import {
  basiFondabili,
  estrattoriFondabili,
  magazzinoOra,
  pienoTra,
  ritmoInsediamento,
  tettoMagazzino,
  type Insediamento,
} from '../dominio/insediamenti'
import { inViaggio, type Nave } from '../dominio/navigazione'
import { RISORSE, type Fatte, type Quantita } from '../dominio/risorse'
import { distanza, settore, stessoSettore } from '../dominio/settore'
import { AzioniNave } from './azioni'
import { abbreviato, coordinatePlancia, durata, numero } from './formato'
import { IconaBase, IconaBloccato, IconaCasa, IconaEstrattore, IconaRete, IconaRisorsa, IconaRotta } from './icone'
import { vaiA } from './indirizzo'
import { NOMI_INSEDIAMENTI } from './Magazzino'
import { BottoneSecondario, Etichetta, Pannello } from './plancia'
import { RIFIUTI } from './rifiuti'
import { CaricoAttuale } from './SchedaNave'

type Ordine = 'riempimento' | 'distanza'
type Filtro = 'tutti' | 'basi' | 'estrattori'

/** Quanto è pieno il magazzino, da 0 a 1: la risorsa più vicina al tetto. */
function riempimento(i: Insediamento, ora: Date, fatte?: Fatte): number {
  const tetti = tettoMagazzino(i, fatte)
  const adesso = magazzinoOra(i, ora, fatte)
  return Math.max(0, ...RISORSE.filter((r) => tetti[r]).map((r) => (adesso[r] ?? 0) / tetti[r]!))
}

const nomeDi = (i: Insediamento) =>
  i.tipo === 'madre' ? 'Base madre' : (settore(i.coordinate).corpo?.nome ?? coordinatePlancia(i.coordinate))

/**
 * La Rete (doc/11-interfaccia.md#rete): in cima la rete in breve (quanti
 * insediamenti, quanto produce all'ora, quanti sono pieni); poi una scheda per
 * insediamento, dal più pieno o dal più vicino, con il magazzino e VAI.
 */
export function Rete({ nave, insediamenti, ora }: { nave: Nave; insediamenti: readonly Insediamento[]; ora: Date }) {
  const [ordine, setOrdine] = useState<Ordine>('riempimento')
  const [filtro, setFiltro] = useState<Filtro>('tutti')
  const fatte = useContext(CaricoAttuale)?.fatte

  const basi = insediamenti.filter((i) => i.tipo !== 'estrattore')
  const estrattori = insediamenti.filter((i) => i.tipo === 'estrattore')
  const pieni = insediamenti.filter((i) => pienoTra(i, ora, fatte) === 0).length
  // La produzione di tutta la rete, all'ora.
  const totale: Partial<Quantita> = {}
  for (const i of insediamenti) {
    const ritmi = ritmoInsediamento(i, i.produzione, fatte)
    for (const r of RISORSE) if (ritmi[r]) totale[r] = (totale[r] ?? 0) + ritmi[r]!
  }

  const elenco = insediamenti
    .filter((i) => filtro === 'tutti' || (filtro === 'estrattori') === (i.tipo === 'estrattore'))
    .sort((a, b) =>
      ordine === 'riempimento'
        ? riempimento(b, ora, fatte) - riempimento(a, ora, fatte)
        : distanza(nave.posizione, a.coordinate) - distanza(nave.posizione, b.coordinate),
    )

  return (
    <Pannello className="@container flex min-h-0 flex-1 flex-col overflow-y-auto" etichetta="Rete">
      {/* La rete in breve. */}
      <header className="relative flex shrink-0 flex-col gap-3 overflow-hidden border-b border-linea bg-barra/70 p-3.5 @2xl:flex-row @2xl:items-center">
        <div className="flex items-center gap-3 @2xl:w-[230px] @2xl:shrink-0">
          <span className="smussato grid size-11 shrink-0 place-items-center border border-ambra-scura bg-[radial-gradient(circle,rgb(255_181_71/0.16),transparent_70%)] text-ambra [--smusso-colore:var(--color-ambra-scura)] [--smusso:8px]">
            <IconaRete className="size-6" />
          </span>
          <span className="flex min-w-0 flex-col gap-1">
            <h1 className="m-0 text-[15px] leading-none font-semibold tracking-[0.2em] uppercase">Rete</h1>
            <Etichetta className="text-[9px]">
              {insediamenti.filter((i) => i.tipo === 'base').length}/{basiFondabili(fatte)} basi · {estrattori.length}/{estrattoriFondabili(fatte)} estrattori
            </Etichetta>
          </span>
        </div>
        <div className="grid flex-1 grid-cols-[minmax(0,1fr)_auto] gap-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <Etichetta className="text-[9px]">Produzione della rete</Etichetta>
            <span className="flex flex-wrap gap-x-3 gap-y-1">
              {RISORSE.filter((r) => totale[r]).map((r) => (
                <span key={r} title={`${NOMI_RISORSE[r]} all'ora`} className="cifre inline-flex items-center gap-1 text-[12px]">
                  <IconaRisorsa risorsa={r} className="size-4 text-ambra" />
                  {abbreviato(totale[r]!)}
                  <span className="text-testo-tenue">/h</span>
                </span>
              ))}
            </span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Etichetta className="text-[9px]">Pieni</Etichetta>
            <span className={`cifre text-[20px] leading-none font-semibold ${pieni ? 'text-ambra [text-shadow:0_0_12px_rgb(255_181_71/0.4)]' : 'text-testo-tenue'}`}>
              {pieni}
              <span className="text-[12px] font-normal text-testo-tenue">/{insediamenti.length}</span>
            </span>
          </div>
        </div>
      </header>

      {/* L'ordine e il filtro. */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-separatore px-3.5 py-2">
        <Segmenti
          nome="Ordina per"
          valore={ordine}
          voci={[
            ['riempimento', 'Più pieni'],
            ['distanza', 'Più vicini'],
          ]}
          onCambia={setOrdine}
        />
        <Segmenti
          nome="Mostra"
          valore={filtro}
          voci={[
            ['tutti', `Tutti ${insediamenti.length}`],
            ['basi', `Basi ${basi.length}`],
            ['estrattori', `Estrattori ${estrattori.length}`],
          ]}
          onCambia={setFiltro}
        />
      </div>

      <ul className="m-0 grid shrink-0 list-none grid-cols-1 gap-2.5 p-3.5 @xl:grid-cols-2 @5xl:grid-cols-3">
        {elenco.map((i) => (
          <SchedaInsediamento key={i.id} insediamento={i} nave={nave} ora={ora} />
        ))}
        {elenco.length === 0 && <li className="text-xs text-testo-tenue">Nessun insediamento di questo tipo.</li>}
      </ul>

      <p className="m-0 shrink-0 px-3.5 pb-3.5 text-xs leading-snug text-testo-tenue">
        Arrivando in un insediamento il magazzino passa da solo nella stiva, fin dove c'è posto. Ripartendo si carica anche quello prodotto
        durante la sosta.
      </p>
    </Pannello>
  )
}

/** Una scheda della rete: chi è, quanto è pieno, il magazzino, le strutture e VAI. */
function SchedaInsediamento({ insediamento: i, nave, ora }: { insediamento: Insediamento; nave: Nave; ora: Date }) {
  const fatte = useContext(CaricoAttuale)?.fatte
  // Da lontano il magazzino si vede solo con *Telemetria* (S4); senza, si sa solo quando sarà pieno.
  const telemetria = fatte?.has('S4') ?? false
  const qui = stessoSettore(i.coordinate, nave.posizione)
  const volo = inViaggio(nave, ora)
  const nome = nomeDi(i)
  const tra = pienoTra(i, ora, fatte)
  const pieno = tra === 0
  const parte = riempimento(i, ora, fatte)
  const visibile = qui || telemetria
  const ritmi = ritmoInsediamento(i, i.produzione, fatte)
  const tetti = tettoMagazzino(i, fatte)
  const adesso = magazzinoOra(i, ora, fatte)
  const Icona = i.tipo === 'madre' ? IconaCasa : i.tipo === 'estrattore' ? IconaEstrattore : IconaBase
  const strutture = (['cantiere', 'deposito', 'laboratorio', 'radar'] as const).filter((s) => i[s] > 0)

  return (
    <li
      className={`smussato flex flex-col gap-3 border bg-[#120d07] p-3 [--smusso:9px] ${
        pieno
          ? 'border-ambra/70 [--smusso-colore:color-mix(in_oklab,var(--color-ambra)_70%,transparent)]'
          : 'border-separatore [--smusso-colore:var(--color-separatore)]'
      }`}
    >
      {/* Chi è e dove. */}
      <div className="flex items-center gap-2.5">
        <span
          className={`smussato grid size-9 shrink-0 place-items-center border bg-ambra/5 [--smusso:6px] ${
            qui
              ? 'border-ambra text-ambra [--smusso-colore:var(--color-ambra)]'
              : 'border-ambra-scura/70 text-ambra [--smusso-colore:color-mix(in_oklab,var(--color-ambra-scura)_70%,transparent)]'
          }`}
        >
          <Icona className="size-5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[13px] font-semibold tracking-[0.08em] uppercase">{nome}</span>
          <span className="cifre truncate text-[11px] text-testo-tenue">
            {i.tipo === 'madre' ? '' : `${NOMI_INSEDIAMENTI[i.tipo]} · `}
            {coordinatePlancia(i.coordinate)}
          </span>
        </span>
        {qui ? (
          <span className="etichetta shrink-0 border border-ambra px-1.5 py-0.5 text-[9px] text-ambra!">Qui</span>
        ) : (
          <span className="flex shrink-0 flex-col items-end leading-none">
            <span className="cifre text-[13px]">{numero(distanza(nave.posizione, i.coordinate), 1)}</span>
            <span className="etichetta text-[8px]">settori</span>
          </span>
        )}
      </div>

      {/* Quanto è pieno: la risorsa più vicina al tetto. */}
      <div className="flex items-center gap-3">
        <span className="flex flex-1 flex-col gap-1">
          <span className="flex items-baseline justify-between">
            <Etichetta className={`text-[9px] ${pieno ? 'text-ambra!' : ''}`}>
              {pieno ? 'Pieno · produzione ferma' : `Pieno tra ${durata(tra * 3_600_000)}`}
            </Etichetta>
            {visibile && <span className={`cifre text-[12px] ${pieno ? 'text-ambra' : 'text-testo'}`}>{Math.round(parte * 100)}%</span>}
          </span>
          <span className="flex gap-[2px]" aria-hidden="true">
            {Array.from({ length: 20 }, (_, n) => (
              <span
                key={n}
                className={`h-1.5 flex-1 ${
                  visibile
                    ? (n + 0.5) / 20 <= parte
                      ? pieno
                        ? 'bg-ambra'
                        : 'bg-ambra-scura'
                      : 'bg-[#211a10]'
                    : 'bg-[repeating-linear-gradient(45deg,#211a10_0_2px,transparent_2px_4px)]'
                }`}
              />
            ))}
          </span>
        </span>
      </div>

      {/* Il magazzino, risorsa per risorsa (o la produzione, se da qui non si vede). */}
      <ul className="m-0 grid list-none grid-cols-2 gap-x-3 gap-y-1.5 p-0">
        {RISORSE.filter((r) => ritmi[r]).map((r) => {
          const q = adesso[r] ?? 0
          const tetto = tetti[r]!
          return (
            <li
              key={r}
              className="flex items-center gap-1.5 text-[11px]"
              title={`${NOMI_RISORSE[r]}: ${numero(ritmi[r]!, 2)}/h, tetto ${numero(tetto, 0)}`}
            >
              <IconaRisorsa risorsa={r} className={`size-3.5 shrink-0 ${visibile && q >= tetto ? 'text-ambra' : 'text-ambra-scura'}`} />
              {visibile ? (
                <>
                  <span className="h-1 flex-1 bg-[#211a10]">
                    <span className={`block h-full ${q >= tetto ? 'bg-ambra' : 'bg-ambra-scura'}`} style={{ width: `${Math.min(1, q / tetto) * 100}%` }} />
                  </span>
                  <span className="cifre shrink-0 text-testo">{abbreviato(q)}</span>
                </>
              ) : (
                <span className="cifre text-testo-tenue">{numero(ritmi[r]!, 1)}/h</span>
              )}
            </li>
          )
        })}
      </ul>
      {!visibile && (
        <p className="m-0 flex items-center gap-1.5 text-[11px] text-testo-tenue">
          <IconaBloccato className="size-3.5 shrink-0" />
          Il magazzino da lontano si vede con Telemetria.
        </p>
      )}

      {/* I livelli e le strutture. */}
      <div className="flex flex-wrap gap-1">
        <Livello nome="Produzione" livello={i.produzione} />
        <Livello nome="Magazzino" livello={i.magazzino} />
        {strutture.map((s) => (
          <Livello key={s} nome={NOMI_LAVORI[s]} livello={i[s]} />
        ))}
        {i.ponte > 0 && <span className="border border-separatore px-1.5 py-0.5 text-[10px] text-ambra">Ponte</span>}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-2">
        {!qui && (
          <BottoneSecondario className="flex-1" disabled={volo} onClick={() => vaiA({ pagina: 'ponte', meta: i.coordinate })}>
            <IconaRotta className="size-4" />
            Vai
          </BottoneSecondario>
        )}
        {i.tipo !== 'madre' && <Abbandono insediamento={i} nome={nome} />}
      </div>
    </li>
  )
}

function Livello({ nome, livello }: { nome: string; livello: number }) {
  return (
    <span className="border border-separatore px-1.5 py-0.5 text-[10px] text-testo-tenue">
      {nome} <span className="cifre text-testo">{livello}</span>
    </span>
  )
}

/** Una scelta tra poche voci, a bottoni attaccati. */
function Segmenti<T extends string>({
  nome,
  valore,
  voci,
  onCambia,
}: {
  nome: string
  valore: T
  voci: readonly (readonly [T, ReactNode])[]
  onCambia: (v: T) => void
}) {
  return (
    <div className="flex border border-separatore" role="radiogroup" aria-label={nome}>
      {voci.map(([v, testo]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={valore === v}
          onClick={() => onCambia(v)}
          className={`px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] uppercase ${
            valore === v ? 'bg-ambra text-su-ambra' : 'text-testo-tenue hover:text-testo'
          }`}
        >
          {testo}
        </button>
      ))}
    </div>
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
      <button type="button" className="etichetta ml-auto shrink-0 px-1 text-[9px] text-testo-tenue hover:text-pericolo!" onClick={() => setConferma(true)}>
        Abbandona…
      </button>
    )
  }
  return (
    <div
      className="smussato flex w-full flex-col gap-2 border border-pericolo/60 p-2.5 [--smusso-colore:color-mix(in_srgb,var(--color-pericolo)_60%,transparent)] [--smusso:7px]"
      role="alertdialog"
      aria-label={`Abbandona ${nome}`}
    >
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
