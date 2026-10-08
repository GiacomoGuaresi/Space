import { useState } from 'react'
import { magazzinoOra, pienoTra, tettoMagazzino, type Insediamento } from '../dominio/insediamenti'
import { inViaggio, type Nave } from '../dominio/navigazione'
import { RISORSE } from '../dominio/risorse'
import { distanza, settore, stessoSettore } from '../dominio/settore'
import { coordinatePlancia, numero } from './formato'
import { vaiA } from './indirizzo'
import { BarreMagazzino, NOMI_INSEDIAMENTI } from './Magazzino'
import { BottoneSecondario, Etichetta, Pannello } from './plancia'

type Ordine = 'riempimento' | 'distanza'

/** Quanto è pieno il magazzino, da 0 a 1: la risorsa più vicina al tetto. */
function riempimento(i: Insediamento, ora: Date): number {
  const tetti = tettoMagazzino(i)
  const adesso = magazzinoOra(i, ora)
  return Math.max(0, ...RISORSE.filter((r) => tetti[r]).map((r) => (adesso[r] ?? 0) / tetti[r]!))
}

/**
 * La Rete (doc/11-interfaccia.md#rete): gli insediamenti, dal più pieno o dal
 * più vicino, con il magazzino e il tasto VAI che imposta la rotta.
 */
export function Rete({ nave, insediamenti, ora }: { nave: Nave; insediamenti: readonly Insediamento[]; ora: Date }) {
  const [ordine, setOrdine] = useState<Ordine>('riempimento')
  const volo = inViaggio(nave, ora)
  const elenco = [...insediamenti].sort((a, b) =>
    ordine === 'riempimento'
      ? riempimento(b, ora) - riempimento(a, ora)
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
          const tra = pienoTra(i, ora)
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
                    {NOMI_INSEDIAMENTI[i.tipo]} · {coordinatePlancia(i.coordinate)} ·{' '}
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
              <BarreMagazzino insediamento={i} ora={ora} />
              {tra === 0 && !qui && <p className="m-0 text-xs text-ambra">Pieno: passa a raccogliere, la produzione è ferma.</p>}
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
