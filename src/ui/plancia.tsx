// I pezzi comuni della plancia ambra (doc/11-interfaccia.md): pannello,
// etichetta, numero abbreviato, simbolo di rarità, bottoni e ⓘ con la formula.

import { createContext, useContext, useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import type { Rarita } from '../dominio/catalogo'
import { createPortal } from 'react-dom'
import { COLORI_RARITA } from './colori'
import { abbreviato } from './formato'
import { indirizzo } from './indirizzo'
import { suona } from './suoni'

/** Un pannello sopra la scena: fondo scuro quasi pieno, bordo di 1 px, angoli piccoli. */
export function Pannello({
  children,
  className = '',
  etichetta,
}: {
  children: ReactNode
  className?: string
  /** Il nome per le tecnologie assistive, se il pannello non ha un titolo. */
  etichetta?: string
}) {
  // Dentro una finestra il bordo e il fondo li mette già la finestra.
  const nudo = useContext(DentroFinestra)
  return (
    <section
      aria-label={etichetta}
      className={`${nudo ? '' : 'smussato border border-linea bg-pannello/90 backdrop-blur'} ${className}`}
    >
      {children}
    </section>
  )
}

/** Vero dentro una finestra della plancia per PC. */
export const DentroFinestra = createContext(false)

export function Etichetta({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`etichetta ${className}`}>{children}</span>
}

/** Un numero in monospazio, abbreviato (1,2 k · 2,68 M) se non si chiede altrimenti. */
export function Numero({ valore, cifre, className = '' }: { valore: number; cifre?: number; className?: string }) {
  return <span className={`cifre ${className}`}>{abbreviato(valore, cifre)}</span>
}

/** Il simbolo della rarità, nel suo colore: ● comune, ◆ non comune, ★ raro, ✦ leggendario. */
export function SimboloRarita({ rarita, className = '' }: { rarita: Rarita; className?: string }) {
  const { simbolo, testo } = COLORI_RARITA[rarita]
  return (
    <span className={`${testo} ${className}`} aria-hidden="true">
      {simbolo}
    </span>
  )
}

const BOTTONE =
  'flex items-center justify-center gap-2 rounded-plancia px-3 text-[13px] font-semibold uppercase tracking-[0.16em] disabled:opacity-40'

/** Il bottone dell'azione principale: pieno, ambra. Nelle finestre del PC è più basso: lì si usa il mouse. */
export function BottonePrimario({ className = '', onClick, ...resto }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const compatto = useContext(DentroFinestra)
  return (
    <button
      type="button"
      className={`${BOTTONE} ${compatto ? 'min-h-9' : 'min-h-12'} bg-ambra text-su-ambra hover:bg-[#ffc46b] ${className}`}
      onClick={(e) => {
        suona('clic')
        onClick?.(e)
      }}
      {...resto}
    />
  )
}

/** Il bottone delle azioni secondarie: solo il bordo. */
export function BottoneSecondario({ className = '', ...resto }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const compatto = useContext(DentroFinestra)
  return (
    <button
      type="button"
      className={`${BOTTONE} ${compatto ? 'min-h-8' : 'min-h-11'} border border-ambra-scura bg-transparent text-ambra hover:border-ambra ${className}`}
      {...resto}
    />
  )
}

const LARGHEZZA_INFO = 256

/**
 * ⓘ accanto a un valore calcolato: un tocco mostra la formula con i numeri
 * attuali e il valore esatto. Si chiude toccando fuori o con Esc. Col mouse
 * si apre anche al passaggio, e un clic la tiene aperta.
 */
export function Info({
  titolo,
  formula,
  esatto,
  wiki,
}: {
  titolo: string
  formula: ReactNode
  esatto?: ReactNode
  /** La pagina della wiki con la sezione Numeri. */
  wiki?: string
}) {
  const [aperta, setAperta] = useState<{ x: number; y: number; fissa: boolean } | null>(null)
  const id = useId()
  const dove = useRef<HTMLSpanElement>(null)
  const riquadro = useRef<HTMLSpanElement>(null)
  const timer = useRef<number | undefined>(undefined)

  // Il riquadro sta sopra tutto, anche fuori dalle finestre: sotto la ⓘ, dentro lo schermo.
  const apri = (bottone: HTMLElement, fissa: boolean) => {
    window.clearTimeout(timer.current)
    const r = bottone.getBoundingClientRect()
    const x = Math.max(8, Math.min(r.left + r.width / 2 - LARGHEZZA_INFO / 2, window.innerWidth - LARGHEZZA_INFO - 8))
    setAperta({ x, y: r.bottom + 4, fissa })
  }
  // Al passaggio si chiude con un attimo di ritardo, per lasciare il tempo di entrare nel riquadro.
  const lascia = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    timer.current = window.setTimeout(() => setAperta((a) => (a?.fissa ? a : null)), 200)
  }

  useEffect(() => {
    if (!aperta) return
    const fuori = (e: PointerEvent) => {
      const bersaglio = e.target as Node
      if (!dove.current?.contains(bersaglio) && !riquadro.current?.contains(bersaglio)) setAperta(null)
    }
    const tasto = (e: KeyboardEvent) => {
      // Esc chiude il riquadro e basta: la finestra sotto resta (tastiera.ts guarda defaultPrevented).
      if (e.key === 'Escape') {
        e.preventDefault()
        setAperta(null)
      }
    }
    // Il riquadro è fisso sullo schermo: se sotto si scorre, si chiude.
    const scorri = (e: Event) => {
      if (!riquadro.current?.contains(e.target as Node)) setAperta(null)
    }
    document.addEventListener('pointerdown', fuori)
    document.addEventListener('keydown', tasto)
    document.addEventListener('scroll', scorri, true)
    return () => {
      document.removeEventListener('pointerdown', fuori)
      document.removeEventListener('keydown', tasto)
      document.removeEventListener('scroll', scorri, true)
    }
  }, [aperta])

  return (
    <span ref={dove} className="relative inline-flex">
      <button
        type="button"
        aria-label={`Formula: ${titolo}`}
        aria-expanded={aperta !== null}
        aria-controls={id}
        className="-m-2 p-2 text-[12px] leading-none text-ambra"
        onClick={(e) => {
          if (aperta?.fissa) return setAperta(null)
          apri(e.currentTarget, true)
        }}
        onPointerEnter={(e) => {
          if (e.pointerType === 'mouse' && !aperta) apri(e.currentTarget, false)
        }}
        onPointerLeave={lascia}
      >
        ⓘ
      </button>
      {aperta &&
        createPortal(
          <span
            ref={riquadro}
            id={id}
            role="note"
            style={{ left: aperta.x, top: aperta.y, width: LARGHEZZA_INFO }}
            onPointerEnter={() => window.clearTimeout(timer.current)}
            onPointerLeave={lascia}
            className="smussato fixed z-50 flex flex-col gap-1 border border-linea bg-pannello p-2.5 [--smusso:7px] text-left text-xs font-normal tracking-normal normal-case text-testo shadow-lg"
          >
            <span className="etichetta">{titolo}</span>
            <span className="cifre text-[12px] leading-relaxed">{formula}</span>
            {esatto !== undefined && <span className="cifre text-[12px] text-ambra">= {esatto}</span>}
            {wiki && (
              <a
                href={indirizzo({ pagina: 'wiki', voce: wiki, numeri: true })}
                className="etichetta mt-1 self-end no-underline text-ambra!"
              >
                Numeri ›
              </a>
            )}
          </span>,
          document.body,
        )}
    </span>
  )
}

/** Un lavoro in corso (una scansione nel worker): la scritta e una barra che si riempie. */
export function Caricamento({ testo, avanzamento, className = '' }: { testo: string; avanzamento: number | null; className?: string }) {
  const percento = Math.round((avanzamento ?? 0) * 100)
  return (
    <div className={`flex flex-col gap-1.5 ${className}`} role="status" aria-live="polite">
      <span className="flex items-baseline justify-between gap-2 text-xs text-testo-tenue">
        <span>{testo}…</span>
        <span className="cifre">{percento}%</span>
      </span>
      <span
        className="h-1 bg-[#211a10]"
        role="progressbar"
        aria-label={testo}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percento}
      >
        <span className="block h-full bg-ambra transition-[width] duration-150" style={{ width: `${percento}%` }} />
      </span>
    </div>
  )
}
