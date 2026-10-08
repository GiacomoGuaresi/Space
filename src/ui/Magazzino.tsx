import { useContext } from 'react'
import { BILANCIAMENTO } from '../dominio/bilanciamento'
import { NOMI_RISORSE } from '../dominio/catalogo'
import { magazzinoOra, pienoTra, ritmoInsediamento, tettoMagazzino, type Insediamento } from '../dominio/insediamenti'
import type { Nave } from '../dominio/navigazione'
import { RISORSE } from '../dominio/risorse'
import { stessoSettore } from '../dominio/settore'
import { durata, numero } from './formato'
import { Etichetta, Info, Numero } from './plancia'
import { CaricoAttuale } from './SchedaNave'

export const NOMI_INSEDIAMENTI = { madre: 'Base madre', base: 'Base', estrattore: 'Estrattore' } as const

/** Le barre del magazzino di un insediamento, con ritmo, tetto e quando sarà pieno. */
export function BarreMagazzino({ insediamento, ora }: { insediamento: Insediamento; ora: Date }) {
  const ritmi = ritmoInsediamento(insediamento)
  const tetti = tettoMagazzino(insediamento)
  const adesso = magazzinoOra(insediamento, ora)
  const tra = pienoTra(insediamento, ora)
  const { ore, crescita } = BILANCIAMENTO.magazzino
  return (
    <div className="flex flex-col gap-2">
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {RISORSE.filter((r) => ritmi[r]).map((r) => {
          const tetto = tetti[r]!
          const q = adesso[r] ?? 0
          return (
            <li key={r} className="flex flex-col gap-1 text-[13px]">
              <div className="flex items-baseline gap-3">
                <span className="flex-1">{NOMI_RISORSE[r]}</span>
                <span className="cifre inline-flex items-center gap-1 text-testo-tenue">
                  {numero(ritmi[r]!, 2)}/h
                  <Info
                    titolo={`Tetto di ${NOMI_RISORSE[r].toLowerCase()}`}
                    wiki="insediamenti"
                    formula={`${ore} h × ${numero(ritmoInsediamento({ ...insediamento, produzione: 1 })[r]!, 2)}/h × ${crescita}^(magazzino − 1)`}
                    esatto={numero(tetto, 1)}
                  />
                </span>
                <span className="cifre w-20 text-right">
                  <Numero valore={q} />/<Numero valore={tetto} />
                </span>
              </div>
              <div
                className="h-1.5 bg-[#211a10]"
                role="meter"
                aria-label={NOMI_RISORSE[r]}
                aria-valuemin={0}
                aria-valuemax={tetto}
                aria-valuenow={Math.round(q)}
              >
                <div
                  className={`h-full ${q >= tetto ? 'bg-ambra' : 'bg-ambra-scura'}`}
                  style={{ width: `${Math.min(1, q / tetto) * 100}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>
      <Etichetta className={tra === 0 ? 'text-ambra!' : ''}>{tra === 0 ? 'Pieno' : `Pieno tra ${durata(tra * 3_600_000)}`}</Etichetta>
    </div>
  )
}

/** In Qui, se la nave sta su un insediamento: il suo magazzino. */
export function MagazzinoQui({ nave, ora }: { nave: Nave; ora: Date }) {
  const bordo = useContext(CaricoAttuale)
  const insediamento = bordo?.insediamenti.find((i) => stessoSettore(i.coordinate, nave.posizione))
  if (!insediamento || nave.dal > ora) return null
  return (
    <section aria-label="Magazzino" className="mt-3 flex flex-col gap-2 border-t border-separatore pt-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="etichetta m-0 text-ambra!">Magazzino · {NOMI_INSEDIAMENTI[insediamento.tipo]}</h3>
        <Etichetta>
          produzione liv. {insediamento.produzione} · magazzino liv. {insediamento.magazzino}
        </Etichetta>
      </div>
      <BarreMagazzino insediamento={insediamento} ora={ora} />
      <p className="m-0 text-xs text-testo-tenue">Produce da solo fino al tetto, poi si ferma: per ora si accumula e basta.</p>
    </section>
  )
}
