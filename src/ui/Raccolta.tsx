import { useContext } from 'react'
import { BILANCIAMENTO } from '../dominio/bilanciamento'
import type { Nave } from '../dominio/navigazione'
import { bottinoCometa, mixCorpo, RISORSE, ritmoMano, stivaPienaTra } from '../dominio/risorse'
import { NOMI_RISORSE } from '../dominio/catalogo'
import { settore, stessoSettore } from '../dominio/settore'
import { durata, numero, orario } from './formato'
import { Etichetta, Info, Numero } from './plancia'
import { CaricoAttuale } from './SchedaNave'

/**
 * La raccolta a mano in Qui (doc/02-meccaniche.md#risorse): in sosta su un
 * corpo con risorse la nave raccoglie da sola, fino a riempire la stiva.
 */
export function Raccolta({ nave, ora }: { nave: Nave; ora: Date }) {
  const bordo = useContext(CaricoAttuale)
  const corpo = settore(nave.posizione).corpo
  const ritmi = ritmoMano(corpo)
  const mix = mixCorpo(corpo)
  const cometa = bottinoCometa(corpo)
  if (bordo && cometa && nave.dal <= ora) {
    const preso = bordo.raccolti.find((r) => stessoSettore(r.coordinate, nave.posizione))
    return (
      <section aria-label="Bottino della cometa" className="mt-3 flex flex-col gap-1.5 border-t border-separatore pt-3">
        <h3 className="etichetta m-0 text-ambra!">Bottino della cometa</h3>
        <p className="m-0 text-[13px]">
          {preso
            ? `Preso ${orario(preso.istante, ora)}: ${
                RISORSE.filter((r) => (preso.bottino[r] ?? 0) > 0)
                  .map((r) => `+${numero(preso.bottino[r]!, 0)} ${NOMI_RISORSE[r]}`)
                  .join(', ') || 'la stiva era già piena'
              }.`
            : 'Si prende arrivando: aggiorna tra un attimo.'}
        </p>
        <p className="m-0 text-xs text-testo-tenue">
          Una volta sola:{' '}
          {RISORSE.filter((r) => cometa[r])
            .map((r) => `${numero(cometa[r]!, 0)} ${NOMI_RISORSE[r]}`)
            .join(' e ')}
          , fin dove entra nella stiva.
        </p>
      </section>
    )
  }
  if (!bordo || !corpo || !ritmi || !mix || nave.dal > ora) return null
  const tra = stivaPienaTra(bordo.carico, nave, ora)
  const { mano, ritmo } = BILANCIAMENTO.produzione
  const raccolte = RISORSE.filter((r) => ritmi[r])
  const piena = raccolte.every((r) => bordo.quantita[r] >= bordo.capacita)
  return (
    <section aria-label="Raccolta a mano" className="mt-3 flex flex-col gap-2 border-t border-separatore pt-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="etichetta m-0 text-ambra!">Raccolta a mano</h3>
        <Etichetta>{piena ? 'Stiva piena' : 'In corso'}</Etichetta>
      </div>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {raccolte.map((r) => (
          <li key={r} className="flex flex-col gap-0.5 text-[13px]">
            <div className="flex items-baseline gap-3">
              <span className="flex-1">{NOMI_RISORSE[r]}</span>
              <span className="cifre inline-flex items-center gap-1 text-testo-tenue">
                {numero(ritmi[r]!, 1)}/h
                <Info
                  titolo={`Raccolta di ${NOMI_RISORSE[r].toLowerCase()}`}
                  wiki="risorse"
                  formula={`${mano} × ${ritmo.comune}/h × ricchezza ${numero(corpo.ricchezza, 2)} × ${numero(mix[r]! * 100, 0)} %`}
                  esatto={`${numero(ritmi[r]!, 3)}/h`}
                />
              </span>
              <span className="cifre w-16 text-right">
                <Numero valore={bordo.quantita[r]} />/<Numero valore={bordo.capacita} />
              </span>
            </div>
            <span className="text-right text-xs text-testo-tenue">
              {tra[r]! > 0 ? `piena tra ${durata(tra[r]! * 3_600_000)}` : 'piena'}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
