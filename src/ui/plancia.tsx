// I pezzi comuni della plancia ambra (doc/11-interfaccia.md): pannello,
// etichetta, numero abbreviato, simbolo di rarità, bottoni e ⓘ con la formula.

import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import type { Rarita } from '../dominio/catalogo'
import { COLORI_RARITA } from './colori'
import { abbreviato } from './formato'

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
  return (
    <section aria-label={etichetta} className={`rounded-plancia border border-linea bg-pannello/90 backdrop-blur ${className}`}>
      {children}
    </section>
  )
}

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

const BOTTONE = 'flex items-center justify-center gap-2 rounded-plancia px-3 text-[13px] font-semibold uppercase tracking-[0.16em] disabled:opacity-40'

/** Il bottone dell'azione principale: pieno, ambra. */
export function BottonePrimario({ className = '', ...resto }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={`${BOTTONE} min-h-12 bg-ambra text-su-ambra hover:bg-[#ffc46b] ${className}`} {...resto} />
}

/** Il bottone delle azioni secondarie: solo il bordo. */
export function BottoneSecondario({ className = '', ...resto }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`${BOTTONE} min-h-11 border border-ambra-scura bg-transparent text-ambra hover:border-ambra ${className}`}
      {...resto}
    />
  )
}

/**
 * ⓘ accanto a un valore calcolato: un tocco mostra la formula con i numeri
 * attuali e il valore esatto. Si chiude toccando fuori o con Esc.
 */
export function Info({ titolo, formula, esatto }: { titolo: string; formula: ReactNode; esatto?: ReactNode }) {
  const [aperta, setAperta] = useState(false)
  const id = useId()
  const dove = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!aperta) return
    const fuori = (e: PointerEvent) => {
      if (!dove.current?.contains(e.target as Node)) setAperta(false)
    }
    const tasto = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAperta(false)
    }
    document.addEventListener('pointerdown', fuori)
    document.addEventListener('keydown', tasto)
    return () => {
      document.removeEventListener('pointerdown', fuori)
      document.removeEventListener('keydown', tasto)
    }
  }, [aperta])

  return (
    <span ref={dove} className="relative inline-flex">
      <button
        type="button"
        aria-label={`Formula: ${titolo}`}
        aria-expanded={aperta}
        aria-controls={id}
        className="-m-2 p-2 text-[12px] leading-none text-ambra"
        onClick={() => setAperta(!aperta)}
      >
        ⓘ
      </button>
      {aperta && (
        <span
          id={id}
          role="note"
          className="absolute top-full left-1/2 z-20 mt-1 flex w-64 -translate-x-1/2 flex-col gap-1 rounded-plancia border border-linea bg-pannello p-2.5 text-left text-xs font-normal tracking-normal normal-case text-testo shadow-lg"
        >
          <span className="etichetta">{titolo}</span>
          <span className="cifre text-[12px] leading-relaxed">{formula}</span>
          {esatto !== undefined && <span className="cifre text-[12px] text-ambra">= {esatto}</span>}
        </span>
      )}
    </span>
  )
}
