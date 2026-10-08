import { BILANCIAMENTO } from '../dominio/bilanciamento'
import { carburanteOra, inViaggio, pienoTra, ricaricaQui, tettoQui, type Nave, type Viaggio } from '../dominio/navigazione'
import { BASE, settore, stessoSettore } from '../dominio/settore'
import { coordinatePlancia, durata, numero, orario, rovescia } from './formato'
import { Etichetta, Info } from './plancia'

interface Props {
  nave: Nave
  viaggio: Viaggio | null
  ora: Date
  /** Un tocco sulla striscia apre il diario di bordo. */
  onApri?: () => void
}

const SEGMENTI = 10

/**
 * La striscia di stato in cima a ogni pagina (doc/11-interfaccia.md#ossatura):
 * in sosta il luogo, in viaggio la meta e il conto alla rovescia; sotto il
 * carburante, con il tetto fin dove si ricarica qui.
 */
export function StrisciaStato({ nave, viaggio, ora, onApri }: Props) {
  const volo = inViaggio(nave, ora)
  const carburante = carburanteOra(nave, ora)
  const tetto = tettoQui(nave, nave.posizione)
  const pieno = pienoTra(nave, ora)
  const stellare = ricaricaQui(nave, nave.posizione) > nave.ricarica
  const percentoTetto = Math.round((tetto / nave.serbatoio) * 100)
  const nome = stessoSettore(nave.posizione, BASE) ? 'Base madre' : (settore(nave.posizione).corpo?.nome ?? 'Spazio vuoto')

  // I segmenti: pieni fino al carburante, scuri fino al tetto, spenti oltre.
  const segmenti = Array.from({ length: SEGMENTI }, (_, i) => {
    const soglia = ((i + 0.5) / SEGMENTI) * nave.serbatoio
    return soglia <= carburante ? 'bg-ambra' : !volo && soglia <= tetto ? 'bg-linea' : 'bg-[#211a10]'
  })

  const contenuto = (
    <>
      <div className="flex items-center gap-2.5">
        {volo ? (
          <>
            <Etichetta className="text-ambra!">▲ Verso</Etichetta>
            <span className="cifre text-[13px]">{coordinatePlancia(nave.posizione)}</span>
            <span className="cifre ml-auto text-[15px] font-medium text-ambra" aria-live="polite">
              {rovescia(nave.dal.getTime() - ora.getTime())}
            </span>
          </>
        ) : (
          <>
            <Etichetta className="text-ambra!">◉ Ferma</Etichetta>
            <span className="cifre text-[13px]">{coordinatePlancia(nave.posizione)}</span>
            <span className="ml-auto truncate text-[13px] font-semibold tracking-[0.12em] uppercase">{nome}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Etichetta>Carb</Etichetta>
        <div
          className="flex gap-0.5"
          role="meter"
          aria-label="Carburante"
          aria-valuemin={0}
          aria-valuemax={nave.serbatoio}
          aria-valuenow={Math.round(carburante * 10) / 10}
        >
          {segmenti.map((colore, i) => (
            <span key={i} className={`h-1.5 w-[11px] ${colore}`} />
          ))}
        </div>
        <span className="cifre text-[12px]">
          {numero(carburante, 1)}/{numero(nave.serbatoio, 1)}
        </span>
        <span className="relative z-10 ml-auto flex items-center gap-1 text-right">
          {volo ? (
            <Etichetta>Arrivo {orario(nave.dal, ora)}</Etichetta>
          ) : (
            <>
              <Etichetta>
                Tetto {percentoTetto}%{pieno > 0 ? ` · ${numero(tetto, 1)} tra ${durata(pieno)}` : ''}
              </Etichetta>
              <Info
                titolo="Ricarica"
                formula={`${numero(nave.ricarica, 2)}/h${stellare ? ` × ${BILANCIAMENTO.carburante.ricaricaStella} (stella)` : ''} fino a ${numero(nave.serbatoio, 1)} × ${percentoTetto}%`}
                esatto={`${numero(ricaricaQui(nave, nave.posizione), 2)}/h, tetto ${numero(tetto, 2)}`}
              />
            </>
          )}
        </span>
      </div>
      {volo && viaggio && !stessoSettore(viaggio.a, viaggio.meta) && (
        <p className="m-0 text-xs text-ambra">Carburante insufficiente: sosta forzata prima della meta {coordinatePlancia(viaggio.meta)}.</p>
      )}
    </>
  )

  const classi = 'relative flex w-full flex-col gap-2 rounded-plancia border border-linea bg-pannello/85 px-3 py-2.5 text-left backdrop-blur'
  return onApri ? (
    <div className={classi}>
      <button type="button" className="absolute inset-0 rounded-plancia" aria-label="Apri il diario di bordo" onClick={onApri} />
      {contenuto}
    </div>
  ) : (
    <div className={classi}>{contenuto}</div>
  )
}
