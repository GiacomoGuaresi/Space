import { useContext } from 'react'
import { BILANCIAMENTO } from '../dominio/bilanciamento'
import { carburanteOra, inViaggio, pienoTra, ricaricaQui, tettoQui, type Nave, type Viaggio } from '../dominio/navigazione'
import { BASE, settore, stessoSettore } from '../dominio/settore'
import { coordinatePlancia, durata, numero, orario, rovescia } from './formato'
import { NOMI_VOCI, UltimaVoce } from './diario'
import { RISORSE, SIGLE_RISORSE } from '../dominio/risorse'
import { NOMI_RISORSE } from '../dominio/catalogo'
import { CaricoAttuale, useDintorni } from './SchedaNave'
import { Etichetta, Info } from './plancia'

interface Props {
  nave: Nave
  viaggio: Viaggio | null
  ora: Date
  /** Un tocco sulla striscia apre il diario di bordo. */
  onApri?: () => void
  /** Su PC: la barra di stato su una riga, a tutta larghezza. */
  riga?: boolean
}

const SEGMENTI = 10

/**
 * La striscia di stato in cima a ogni pagina (doc/11-interfaccia.md#ossatura):
 * in sosta il luogo, in viaggio la meta e il conto alla rovescia; sotto il
 * carburante, con il tetto fin dove si ricarica qui.
 */
export function StrisciaStato({ nave, viaggio, ora, onApri, riga = false }: Props) {
  const volo = inViaggio(nave, ora)
  const ultima = useContext(UltimaVoce)
  const bordo = useContext(CaricoAttuale)
  const dintorni = useDintorni()
  const carburante = carburanteOra(nave, ora, dintorni)
  const tetto = tettoQui(nave, nave.posizione, dintorni)
  const pieno = pienoTra(nave, ora, dintorni)
  const stellare = ricaricaQui(nave, nave.posizione, dintorni) > nave.ricarica
  const percentoTetto = Math.round((tetto / nave.serbatoio) * 100)
  const nome = stessoSettore(nave.posizione, BASE) ? 'Base madre' : (settore(nave.posizione).corpo?.nome ?? 'Spazio vuoto')

  // I segmenti: pieni fino al carburante, scuri fino al tetto, spenti oltre.
  const segmenti = Array.from({ length: SEGMENTI }, (_, i) => {
    const soglia = ((i + 0.5) / SEGMENTI) * nave.serbatoio
    return soglia <= carburante ? 'bg-ambra' : !volo && soglia <= tetto ? 'bg-linea' : 'bg-[#211a10]'
  })

  const luogo = (
    <div className="flex min-w-0 items-center gap-2.5">
      {volo ? (
        <>
          <Etichetta className="shrink-0 whitespace-nowrap text-ambra!">▲ Verso</Etichetta>
          <span className="cifre shrink-0 text-[13px] whitespace-nowrap">{coordinatePlancia(nave.posizione)}</span>
          <span className="cifre ml-auto text-[15px] font-medium text-ambra" aria-live="polite">
            {rovescia(nave.dal.getTime() - ora.getTime())}
          </span>
        </>
      ) : (
        <>
          <Etichetta className="shrink-0 whitespace-nowrap text-ambra!">◉ Ferma</Etichetta>
          <span className="cifre shrink-0 text-[13px] whitespace-nowrap">{coordinatePlancia(nave.posizione)}</span>
          <span className="ml-auto truncate text-[13px] font-semibold tracking-[0.12em] uppercase">{nome}</span>
        </>
      )}
    </div>
  )
  const serbatoio = (
    <div className="flex min-w-0 items-center gap-2">
      <Etichetta>Carb</Etichetta>
      <div
        className="flex max-w-[130px] min-w-[60px] flex-1 gap-0.5"
        role="meter"
        aria-label="Carburante"
        aria-valuemin={0}
        aria-valuemax={nave.serbatoio}
        aria-valuenow={Math.round(carburante * 10) / 10}
      >
        {segmenti.map((colore, i) => (
          <span key={i} className={`h-1.5 flex-1 ${colore}`} />
        ))}
      </div>
      <span className="cifre shrink-0 text-[12px]">
        {numero(carburante, 1)}/{numero(nave.serbatoio, 1)}
      </span>
      <span className="relative z-10 ml-auto flex items-center gap-1 text-right whitespace-nowrap">
        {volo ? (
          <Etichetta>Arrivo {orario(nave.dal, ora)}</Etichetta>
        ) : (
          <>
            <Etichetta>
              Tetto {percentoTetto}%{pieno > 0 ? ` · ${durata(pieno)}` : ''}
            </Etichetta>
            <Info
              titolo="Ricarica"
              wiki="viaggio"
              formula={`${numero(nave.ricarica, 2)}/h${stellare ? ` × ${BILANCIAMENTO.carburante.ricaricaStella} (stella)` : ''} fino a ${numero(nave.serbatoio, 1)} × ${percentoTetto}%`}
              esatto={`${numero(ricaricaQui(nave, nave.posizione, dintorni), 2)}/h, tetto ${numero(tetto, 2)}`}
            />
          </>
        )}
      </span>
    </div>
  )
  const avviso = volo && viaggio && !stessoSettore(viaggio.a, viaggio.meta) && (
    <p className="m-0 text-xs text-ambra">Carburante insufficiente: sosta forzata prima della meta {coordinatePlancia(viaggio.meta)}.</p>
  )

  // Su PC i pezzi stanno in fila, separati da una linea; sul telefono uno sotto l'altro.
  const contenuto = riga ? (
    <>
      <div className="w-[300px] shrink-0">{luogo}</div>
      <span aria-hidden="true" className="h-5 w-px shrink-0 bg-separatore" />
      <div className="w-[340px] shrink-0">{serbatoio}</div>
      <span aria-hidden="true" className="h-5 w-px shrink-0 bg-separatore" />
      {bordo && (
        <>
          <div className="flex shrink-0 items-end gap-1.5" role="group" aria-label="Stiva in breve">
            {RISORSE.map((r) => {
              const pieno = Math.min(1, bordo.carico.quantita[r] / bordo.capacita)
              return (
                <span key={r} className="flex items-end gap-0.5" title={`${NOMI_RISORSE[r]}: ${Math.floor(bordo.carico.quantita[r])}`}>
                  <span className="etichetta leading-none">{SIGLE_RISORSE[r]}</span>
                  <span aria-hidden="true" className="relative h-3 w-1.5 bg-[#211a10]">
                    <span className="absolute inset-x-0 bottom-0 bg-ambra" style={{ height: `${pieno * 100}%` }} />
                  </span>
                </span>
              )
            })}
          </div>
          <span aria-hidden="true" className="h-5 w-px shrink-0 bg-separatore" />
        </>
      )}
      {avviso ? (
        <div className="min-w-0 flex-1 truncate">{avviso}</div>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {ultima.nuove > 0 ? (
            <span className="flex shrink-0 items-center gap-1.5 text-ambra">
              <span aria-hidden="true" className="size-[6px] rounded-full bg-ambra" />
              <Etichetta className="text-ambra!">{ultima.nuove} novità</Etichetta>
            </span>
          ) : (
            <Etichetta className="shrink-0">Diario</Etichetta>
          )}
          {ultima.voce && (
            <span className="min-w-0 truncate text-xs text-testo-tenue">
              {NOMI_VOCI[ultima.voce.tipo].uno} · {ultima.voce.breve} · {orario(ultima.voce.quando, ora)}
            </span>
          )}
        </div>
      )}
      <span aria-hidden="true" className="h-5 w-px shrink-0 bg-separatore" />
      <span className="cifre shrink-0 text-[13px]" title="Ora del server">
        {ora.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
      </span>
    </>
  ) : (
    <>
      {luogo}
      {serbatoio}
      {avviso}
    </>
  )

  const classi = riga
    ? 'relative flex h-11 w-full items-center gap-4 border-b border-linea bg-barra/90 px-4 text-left backdrop-blur'
    : 'relative flex w-full flex-col gap-2 rounded-plancia border border-linea bg-pannello/85 px-3 py-2.5 text-left backdrop-blur'
  return onApri ? (
    <div className={classi}>
      <button type="button" className="absolute inset-0 rounded-plancia" aria-label="Apri il diario di bordo" onClick={onApri} />
      {contenuto}
    </div>
  ) : (
    <div className={classi}>{contenuto}</div>
  )
}
