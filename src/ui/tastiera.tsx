// La tastiera della plancia per PC (doc/11-interfaccia.md#regole-delle-finestre):
// la lettera di una finestra la apre o la riduce, Tab scambia scena e mappa,
// Esc chiude la finestra in primo piano, ? mostra l'elenco.

import { useEffect, useSyncExternalStore } from 'react'
import { alterna, chiudi, disposizione, FINESTRE, inPrimoPiano, mostra, type IdFinestra } from './finestre'

let aiuto = false
const ascoltatori = new Set<() => void>()

/** Mostra o nasconde l'elenco delle scorciatoie (anche dal ? del dock). */
export function mostraAiuto(si: boolean) {
  aiuto = si
  for (const avvisa of ascoltatori) avvisa()
}

function useAiuto(): boolean {
  return useSyncExternalStore(
    (avvisa) => {
      ascoltatori.add(avvisa)
      return () => ascoltatori.delete(avvisa)
    },
    () => aiuto,
  )
}

const LETTERE = new Map((Object.keys(FINESTRE) as IdFinestra[]).map((id) => [FINESTRE[id].tasto.toLowerCase(), id]))

/** Vero se il tasto va a un campo: lì le lettere si scrivono. */
function inUnCampo(bersaglio: EventTarget | null): boolean {
  if (!(bersaglio instanceof HTMLElement)) return false
  return bersaglio.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(bersaglio.tagName)
}

/**
 * Le scorciatoie, attive solo con la plancia a finestre. Ascoltano sulla
 * finestra del browser, dopo il resto: un riquadro o un menu che usa Esc lo
 * segna con preventDefault e qui non succede nulla.
 */
export function useTastiera(attiva: boolean) {
  useEffect(() => {
    if (!attiva) return
    const tasto = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'Escape') {
        if (aiuto) return mostraAiuto(false)
        if (inUnCampo(e.target)) return (e.target as HTMLElement).blur()
        const sopra = inPrimoPiano(disposizione())
        if (sopra) chiudi(sopra)
        return
      }
      if (inUnCampo(e.target)) return
      if (e.key === '?') return mostraAiuto(!aiuto)
      // Tab scambia lo sfondo solo se non si sta già navigando tra i comandi con la tastiera.
      if (
        e.key === 'Tab' &&
        !e.shiftKey &&
        (document.activeElement === document.body || document.activeElement instanceof HTMLCanvasElement)
      ) {
        e.preventDefault()
        return mostra(disposizione().sfondo === 'mappa' ? 'scena' : 'mappa')
      }
      const id = LETTERE.get(e.key.toLowerCase())
      if (id) alterna(id)
    }
    window.addEventListener('keydown', tasto)
    return () => window.removeEventListener('keydown', tasto)
  }, [attiva])
}

const ELENCO: readonly [string, string][] = [
  ...(Object.keys(FINESTRE) as IdFinestra[]).map((id): [string, string] => [FINESTRE[id].tasto, `${FINESTRE[id].titolo}: apri o riduci`]),
  ['Tab', 'Scena o mappa sullo sfondo'],
  ['Esc', 'Chiudi la finestra in primo piano'],
  ['?', 'Questo elenco'],
]

/** L'elenco delle scorciatoie, sopra tutto. */
export function Scorciatoie() {
  const aperto = useAiuto()
  if (!aperto) return null
  return (
    <div className="pointer-events-auto absolute inset-0 z-[100] grid place-items-center bg-black/50" onClick={() => mostraAiuto(false)}>
      <section
        aria-label="Scorciatoie da tastiera"
        className="smussato w-80 border border-ambra-scura bg-pannello p-4 shadow-lg [--smusso-colore:var(--color-ambra-scura)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="etichetta m-0 mb-3 text-ambra!">Scorciatoie</h2>
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
          {ELENCO.map(([tasto, cosa]) => (
            <div key={tasto} className="contents">
              <dt className="cifre text-ambra">{tasto}</dt>
              <dd className="m-0">{cosa}</dd>
            </div>
          ))}
        </dl>
        <p className="m-0 mt-3 text-xs text-testo-tenue">Le lettere non valgono mentre si scrive in un campo.</p>
      </section>
    </div>
  )
}
