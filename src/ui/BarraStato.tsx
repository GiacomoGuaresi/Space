import { useContext, type ReactNode } from 'react'
import { BILANCIAMENTO } from '../dominio/bilanciamento'
import { NOMI_LAVORI } from '../dominio/cantiere'
import { NOMI_RISORSE } from '../dominio/catalogo'
import { carburanteOra, inViaggio, pienoTra, ricaricaQui, tettoQui, type Nave, type Viaggio } from '../dominio/navigazione'
import { RICERCHE, type IdRicerca } from '../dominio/ricerche'
import { RISORSE } from '../dominio/risorse'
import { stessoSettore } from '../dominio/settore'
import { AzioniNave } from './azioni'
import { apri, type IdFinestra } from './finestre'
import { abbreviato, coordinatePlancia, durata, numero, orario, rovescia } from './formato'
import { IconaCantiere, IconaDiario, IconaFerma, IconaInVolo, IconaRicerche, IconaRisorsa } from './icone'
import { Info } from './plancia'
import { CaricoAttuale, useDintorni } from './SchedaNave'
import { NOMI_VOCI, UltimaVoce } from './voci'

interface Props {
  nave: Nave
  viaggio: Viaggio | null
  ora: Date
  /** Il diario: un clic sul suo modulo lo apre (assente se lo si sta già guardando). */
  onApri?: () => void
}

const SEGMENTI = 20

/**
 * La barra di stato del PC (doc/11-interfaccia.md#pc--plancia-a-finestre): una
 * fila di moduli come gli strumenti di una plancia, ognuno con la sua
 * etichetta sopra. Un clic su un modulo apre la finestra che ne parla.
 */
export function BarraStato({ nave, viaggio, ora, onApri }: Props) {
  const volo = inViaggio(nave, ora)
  const bordo = useContext(CaricoAttuale)
  const { costruzioni, ricerche } = useContext(AzioniNave)
  const ultima = useContext(UltimaVoce)
  const dintorni = useDintorni()

  const carburante = carburanteOra(nave, ora, dintorni)
  const tetto = tettoQui(nave, nave.posizione, dintorni)
  const pieno = pienoTra(nave, ora, dintorni)
  const stellare = ricaricaQui(nave, nave.posizione, dintorni) > nave.ricarica
  const percentoTetto = Math.round((tetto / nave.serbatoio) * 100)

  // Il viaggio: quanto manca e quanto ne è passato.
  const totale = viaggio ? viaggio.arrivo.getTime() - viaggio.partenza.getTime() : 0
  const fatto = volo && viaggio && totale > 0 ? Math.min(1, Math.max(0, (ora.getTime() - viaggio.partenza.getTime()) / totale)) : 0
  const forzata = volo && viaggio && !stessoSettore(viaggio.a, viaggio.meta)

  // Le attività in corso: i lavori del cantiere e le ricerche, prima quella che finisce prima.
  const attivita = [
    ...costruzioni
      .filter((c) => c.inizio <= ora && c.fine > ora)
      .map((c) => ({
        chiave: `c${c.id}`,
        nome: `${NOMI_LAVORI[c.lavoro]} ${c.livello}`,
        fine: c.fine,
        finestra: (c.coda === 'nave' ? 'nave' : 'base') as IdFinestra,
        icona: <IconaCantiere className="size-4" />,
      })),
    ...ricerche
      .filter((r) => r.inizio <= ora && r.fine > ora)
      .map((r) => ({
        chiave: `r${r.nodo}${r.livello}`,
        nome: RICERCHE[r.nodo as IdRicerca]?.nome ?? r.nodo,
        fine: r.fine,
        finestra: 'ricerche' as IdFinestra,
        icona: <IconaRicerche className="size-4" />,
      })),
  ].sort((a, b) => a.fine.getTime() - b.fine.getTime())
  const prima = attivita[0]

  return (
    <div className="relative flex h-14 w-full items-stretch border-b border-linea bg-linear-to-b from-barra to-barra/85 text-left backdrop-blur">
      {/* Un filo d'ambra al centro del bordo, come la luce di una plancia. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-linear-to-r from-transparent via-ambra/60 to-transparent"
      />

      {/* Stato e luogo, o il viaggio con il conto alla rovescia. */}
      <Modulo
        etichetta={volo ? (forzata ? 'In viaggio · sosta forzata' : 'In viaggio verso') : 'In sosta'}
        accesa={volo}
        onClick={() => apri('rotta')}
        titolo="Apri la rotta"
        icona={<Distintivo acceso={volo}>{volo ? <IconaInVolo className="size-4" /> : <IconaFerma className="size-4" />}</Distintivo>}
        className="w-[270px]"
      >
        <span className="flex items-baseline gap-2 leading-none">
          <span className="cifre truncate text-[13px] text-testo">{coordinatePlancia(nave.posizione)}</span>
          {volo ? (
            <span className="cifre ml-auto text-[15px] font-semibold text-ambra [text-shadow:0_0_10px_rgb(255_181_71/0.4)]" aria-live="polite">
              {rovescia(nave.dal.getTime() - ora.getTime())}
            </span>
          ) : (
            <span className="ml-auto text-[11px] text-testo-tenue">dal {orario(nave.dal, ora)}</span>
          )}
        </span>
        {volo && (
          <span className="relative h-1 bg-[#211a10]" role="progressbar" aria-label="Viaggio" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(fatto * 100)}>
            <span className="absolute inset-y-0 left-0 bg-ambra" style={{ width: `${fatto * 100}%` }} />
          </span>
        )}
      </Modulo>

      <Separatore />

      {/* Il carburante: pieno fino a quanto c'è, scuro fino al tetto. */}
      <Modulo
        etichetta="Carburante"
        destra={
          volo ? (
            `arrivo ${orario(nave.dal, ora)}`
          ) : (
            <span className="relative z-10 inline-flex items-center gap-1">
              tetto {percentoTetto}%{pieno > 0 ? ` · pieno ${durata(pieno)}` : ''}
              <Info
                titolo="Ricarica"
                wiki="viaggio"
                formula={`${numero(nave.ricarica, 2)}/h${stellare ? ` × ${BILANCIAMENTO.carburante.ricaricaStella} (stella)` : ''} fino a ${numero(nave.serbatoio, 1)} × ${percentoTetto}%`}
                esatto={`${numero(ricaricaQui(nave, nave.posizione, dintorni), 2)}/h, tetto ${numero(tetto, 2)}`}
              />
            </span>
          )
        }
        className="w-[300px]"
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex flex-1 gap-[2px]"
            role="meter"
            aria-label="Carburante"
            aria-valuemin={0}
            aria-valuemax={nave.serbatoio}
            aria-valuenow={Math.round(carburante * 10) / 10}
          >
            {Array.from({ length: SEGMENTI }, (_, i) => {
              const soglia = ((i + 0.5) / SEGMENTI) * nave.serbatoio
              const colore =
                soglia <= carburante
                  ? carburante < nave.serbatoio * 0.2
                    ? 'bg-pericolo'
                    : 'bg-ambra'
                  : !volo && soglia <= tetto
                    ? 'bg-linea'
                    : 'bg-[#211a10]'
              return <span key={i} className={`h-2.5 flex-1 ${colore}`} />
            })}
          </div>
          <span className="cifre shrink-0 text-[13px]">
            {numero(carburante, 1)}
            <span className="text-testo-tenue">/{numero(nave.serbatoio, 1)}</span>
          </span>
        </div>
      </Modulo>

      <Separatore />

      {/* Le attività in corso: la prima che finisce, e quante altre. */}
      <Modulo
        etichetta="In corso"
        destra={attivita.length > 1 ? `+${attivita.length - 1}` : undefined}
        onClick={prima ? () => apri(prima.finestra) : undefined}
        titolo={prima ? attivita.map((a) => `${a.nome} · ${rovescia(a.fine.getTime() - ora.getTime())}`).join('\n') : undefined}
        className="w-[210px]"
      >
        {prima ? (
          <span className="flex items-center gap-2 text-[13px]">
            <span className="text-ambra">{prima.icona}</span>
            <span className="min-w-0 flex-1 truncate">{prima.nome}</span>
            <span className="cifre shrink-0 text-ambra">{rovescia(prima.fine.getTime() - ora.getTime())}</span>
          </span>
        ) : (
          <span className="text-[12px] text-testo-tenue">Nessun lavoro né ricerca</span>
        )}
      </Modulo>

      <Separatore />

      {/* La stiva: quantità/massimo e l'icona, tre per riga. */}
      {bordo && (
        <>
          <button
            type="button"
            onClick={() => apri('nave')}
            title="Apri la nave"
            aria-label="Stiva in breve: apri la nave"
            className="grid shrink-0 grid-cols-3 content-center gap-x-3.5 gap-y-1 px-4 hover:bg-ambra/5"
          >
            {RISORSE.map((r) => {
              const q = bordo.carico.quantita[r]
              const piena = q >= bordo.capacita
              return (
                <span
                  key={r}
                  className={`cifre flex items-center justify-end gap-1 text-[11px] leading-none whitespace-nowrap ${piena ? 'text-ambra' : 'text-testo'}`}
                  title={`${NOMI_RISORSE[r]}: ${numero(Math.floor(q))} / ${numero(bordo.capacita)}`}
                >
                  {abbreviato(q)}
                  <span className="text-testo-tenue">/{abbreviato(bordo.capacita)}</span>
                  <IconaRisorsa risorsa={r} aria-label={NOMI_RISORSE[r]} className={`size-3.5 ${piena ? 'text-ambra' : 'text-ambra-scura'}`} />
                </span>
              )
            })}
          </button>
          <Separatore />
        </>
      )}

      {/* Il diario: le novità e l'ultima voce. */}
      <Modulo
        etichetta="Diario di bordo"
        destra={
          ultima.nuove > 0 ? (
            <span className="inline-flex items-center gap-1 bg-ambra px-1.5 py-px text-[10px] font-semibold text-su-ambra">
              {ultima.nuove} novità
            </span>
          ) : undefined
        }
        onClick={onApri}
        titolo="Apri il diario di bordo"
        className="min-w-0 flex-1"
      >
        <span className="flex min-w-0 items-center gap-2 text-[12px] text-testo-tenue">
          <IconaDiario className="size-4 shrink-0 text-ambra-scura" />
          {forzata && viaggio ? (
            <span className="truncate text-ambra">Carburante insufficiente: sosta prima di {coordinatePlancia(viaggio.meta)}</span>
          ) : ultima.voce ? (
            <span className="truncate">
              <span className="text-testo">{NOMI_VOCI[ultima.voce.tipo].uno}</span> · {ultima.voce.breve} · {orario(ultima.voce.quando, ora)}
            </span>
          ) : (
            <span>Nessuna voce</span>
          )}
        </span>
      </Modulo>

      <Separatore />

      <Modulo etichetta="Ora" className="w-[78px] items-end text-right">
        <span className="cifre text-[17px] leading-none text-testo" title="Ora del server">
          {ora.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </Modulo>
    </div>
  )
}

/** Uno strumento della barra: l'etichetta sopra (con una nota a destra) e il contenuto sotto. */
function Modulo({
  etichetta,
  destra,
  icona,
  accesa = false,
  onClick,
  titolo,
  className = '',
  children,
}: {
  etichetta: string
  destra?: ReactNode
  /** Un'icona grande a sinistra, alta quanto etichetta e contenuto. */
  icona?: ReactNode
  accesa?: boolean
  onClick?: () => void
  titolo?: string
  className?: string
  children: ReactNode
}) {
  const testo = (
    <>
      <span className="flex items-center gap-2 leading-none">
        <span className={`etichetta truncate text-[9px] ${accesa ? 'text-ambra!' : ''}`}>{etichetta}</span>
        {destra && <span className="cifre ml-auto shrink-0 text-[10px] text-testo-tenue">{destra}</span>}
      </span>
      {children}
    </>
  )
  const interno = icona ? (
    <span className="flex items-center gap-2.5">
      {icona}
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">{testo}</span>
    </span>
  ) : (
    testo
  )
  const classi = `relative flex shrink-0 flex-col justify-center gap-1.5 px-4 ${className}`
  return onClick ? (
    <div className={`${classi} hover:bg-ambra/5`}>
      {/* Il clic copre il modulo; le ⓘ dentro restano sopra (z-10). */}
      <button type="button" aria-label={titolo} title={titolo} className="absolute inset-0" onClick={onClick} />
      {interno}
    </div>
  ) : (
    <div className={classi} title={titolo}>
      {interno}
    </div>
  )
}

/** L'icona dello stato in un riquadro smussato, accesa in volo. */
function Distintivo({ acceso, children }: { acceso: boolean; children: ReactNode }) {
  return (
    <span
      className={`smussato grid size-8 shrink-0 place-items-center border [--smusso:6px] ${
        acceso
          ? 'border-ambra bg-ambra/15 text-ambra [--smusso-colore:var(--color-ambra)]'
          : 'border-ambra-scura/70 bg-ambra/5 text-ambra [--smusso-colore:color-mix(in_oklab,var(--color-ambra-scura)_70%,transparent)]'
      }`}
    >
      {children}
    </span>
  )
}

/** Il filo tra due moduli, inclinato come gli angoli dei pannelli. */
function Separatore() {
  return <span aria-hidden="true" className="my-2.5 w-px shrink-0 skew-x-[-20deg] bg-separatore" />
}
