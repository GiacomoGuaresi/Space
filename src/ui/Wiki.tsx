import { useEffect, useRef } from 'react'
import type { TipoCorpo } from '../dominio/catalogo'
import { SOTTOTIPI } from '../dominio/sottotipi'
import { indirizzo } from './indirizzo'
import { segnaWikiAperta, useVisti } from './pallini'
import { Etichetta, Pannello } from './plancia'
import { NOMI_SEZIONI, PAGINE_WIKI, type SezioneWiki, type StatoWiki } from './pagineWiki'

const COPERTO = '■■■■ ■■■■'

/**
 * La wiki (doc/11-interfaccia.md#wiki): senza `voce` l'indice, con le pagine
 * chiuse coperte e il suggerimento; con `voce` la pagina, che finisce con i
 * Numeri. `numeri` porta subito lì (dalla ⓘ di un valore).
 */
export function Wiki({
  stato,
  voce,
  numeri,
  affiancata = false,
}: {
  stato: StatoWiki
  voce?: string
  numeri?: boolean
  affiancata?: boolean
}) {
  const pagina = voce ? PAGINE_WIKI.find((p) => p.id === voce) : undefined
  const aperta = pagina && pagina.sbloccata(stato)
  // Su PC (doc/11-interfaccia.md#finestre) l'indice sta a sinistra e la pagina a destra.
  if (affiancata) {
    return (
      <div className="flex min-h-0 flex-1">
        <div className="flex w-60 shrink-0 flex-col border-r border-linea">
          <Indice stato={stato} attuale={aperta ? pagina.id : undefined} compatto />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          {aperta ? (
            <PaginaAperta stato={stato} id={pagina.id} numeri={numeri} />
          ) : (
            <p className="m-0 p-3.5 text-[13px] text-testo-tenue">Scegli una pagina dall'indice.</p>
          )}
        </div>
      </div>
    )
  }
  return aperta ? <PaginaAperta stato={stato} id={pagina.id} numeri={numeri} /> : <Indice stato={stato} />
}

function Indice({ stato, attuale, compatto = false }: { stato: StatoWiki; attuale?: string; compatto?: boolean }) {
  const { wiki: aperte } = useVisti()
  return (
    <Pannello className="flex min-h-0 flex-1 flex-col overflow-y-auto" etichetta="Wiki">
      {/* Accanto alla pagina il titolo lo dà la finestra. */}
      {!compatto && (
        <header className="border-b border-linea p-3.5">
          <h1 className="m-0 text-base font-semibold tracking-[0.2em] uppercase">Wiki</h1>
          <Etichetta>Come funziona il gioco · il catalogo dice cosa hai trovato</Etichetta>
        </header>
      )}
      {(Object.keys(NOMI_SEZIONI) as SezioneWiki[]).map((sezione) => (
        <section key={sezione} aria-label={NOMI_SEZIONI[sezione]}>
          <h2 className="etichetta m-0 border-b border-separatore px-3.5 pt-3 pb-1.5">{NOMI_SEZIONI[sezione]}</h2>
          <ul className="m-0 list-none p-0">
            {PAGINE_WIKI.filter((p) => p.sezione === sezione).map((p) => {
              const aperta = p.sbloccata(stato)
              const nuova = aperta && sezione !== 'guida' && !aperte.includes(p.id)
              return (
                <li key={p.id} className="border-b border-separatore">
                  {aperta ? (
                    <a
                      href={indirizzo({ pagina: 'wiki', voce: p.id })}
                      aria-current={attuale === p.id ? 'page' : undefined}
                      className="flex min-h-12 items-center justify-between gap-2 px-3.5 py-2.5 text-sm no-underline hover:text-ambra aria-[current=page]:text-ambra"
                    >
                      {p.titolo}
                      {nuova && (
                        <span className="text-ambra" aria-label="nuova">
                          ●
                        </span>
                      )}
                    </a>
                  ) : (
                    <div className="flex flex-col gap-0.5 px-3.5 py-2.5" aria-label={`Pagina chiusa. ${p.suggerimento}`}>
                      <span className="text-sm tracking-[0.1em] text-testo-tenue" aria-hidden="true">
                        {COPERTO}
                      </span>
                      <span className="text-xs text-ambra">{p.suggerimento}</span>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </Pannello>
  )
}

function PaginaAperta({ stato, id, numeri }: { stato: StatoWiki; id: string; numeri?: boolean }) {
  const pagina = PAGINE_WIKI.find((p) => p.id === id)!
  const sezioneNumeri = useRef<HTMLElement>(null)

  // Aprirla spegne il suo pallino.
  useEffect(() => {
    segnaWikiAperta(id)
  }, [id])
  useEffect(() => {
    if (numeri) sezioneNumeri.current?.scrollIntoView({ block: 'start' })
  }, [numeri, id])

  const sottotipi = pagina.sezione === 'corpi' ? SOTTOTIPI[pagina.id as TipoCorpo] : []
  const trovati = stato.trovati.get(pagina.id as TipoCorpo)

  return (
    <Pannello className="flex min-h-0 flex-1 flex-col overflow-y-auto" etichetta={pagina.titolo}>
      <header className="flex flex-col gap-1 border-b border-linea p-3.5">
        <a href={indirizzo({ pagina: 'wiki' })} className="etichetta no-underline hover:text-ambra">
          ‹ Wiki · {NOMI_SEZIONI[pagina.sezione]}
        </a>
        <h1 className="m-0 text-base font-semibold tracking-[0.2em] uppercase">{pagina.titolo}</h1>
      </header>
      <div className="flex flex-col gap-3 p-3.5">{pagina.testo(stato)}</div>

      {sottotipi.length > 0 && (
        <section aria-label="Sottotipi" className="border-t border-separatore p-3.5">
          <h2 className="etichetta m-0 mb-2">
            Sottotipi · {trovati?.size ?? 0} di {sottotipi.length}
          </h2>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {sottotipi.map((s) =>
              trovati?.has(s.chiave) ? (
                <li key={s.chiave} className="text-[13px]">
                  {s.nome}
                  {s.mix && <span className="text-testo-tenue"> · {s.mix}</span>}
                </li>
              ) : (
                <li key={s.chiave} className="text-[13px] text-testo-tenue" aria-label="Sottotipo non ancora trovato">
                  ■■■
                </li>
              ),
            )}
          </ul>
        </section>
      )}

      <section ref={sezioneNumeri} aria-label="Numeri" className="scroll-mt-2 border-t border-linea p-3.5">
        <h2 className="etichetta m-0 mb-2 text-ambra!">Numeri</h2>
        <dl className="m-0 flex flex-col gap-2">
          {pagina.numeri(stato).map(([nome, valore]) => (
            <div key={nome} className="flex flex-col gap-0.5">
              <dt className="etichetta">{nome}</dt>
              <dd className="cifre m-0 text-[12px] leading-relaxed">{valore}</dd>
            </div>
          ))}
        </dl>
      </section>
    </Pannello>
  )
}
