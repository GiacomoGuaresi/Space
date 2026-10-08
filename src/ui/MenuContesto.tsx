import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { CATALOGO, type TipoCorpo } from '../dominio/catalogo'
import type { Coordinate } from '../dominio/settore'
import { coordinatePlancia } from './formato'
import { vaiA } from './indirizzo'

export interface VoceMenu {
  nome: string
  azione: () => void
}

export interface Menu {
  x: number
  y: number
  titolo: string
  voci: readonly VoceMenu[]
}

const LARGHEZZA = 200

/** Il menu di un corpo: Imposta rotta (se non è dove sta la nave) · Apri nella wiki. */
export function menuCorpo(x: number, y: number, tipo: TipoCorpo, c: Coordinate, onRotta?: () => void): Menu {
  return {
    x,
    y,
    titolo: `${CATALOGO[tipo].nome} · ${coordinatePlancia(c)}`,
    voci: [
      ...(onRotta ? [{ nome: 'Imposta rotta', azione: onRotta }] : []),
      { nome: 'Apri nella wiki', azione: () => vaiA({ pagina: 'wiki', voce: tipo }) },
    ],
  }
}

/**
 * Il menu col tasto destro sui corpi, su PC (doc/11-interfaccia.md#stile--plancia-ambra):
 * Imposta rotta · Apri nella wiki. Si chiude scegliendo, cliccando fuori, con Esc.
 */
export function MenuContesto({ menu, onChiudi }: { menu: Menu | null; onChiudi: () => void }) {
  const riquadro = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menu) return
    riquadro.current?.querySelector('button')?.focus()
    const fuori = (e: PointerEvent) => {
      if (!riquadro.current?.contains(e.target as Node)) onChiudi()
    }
    const tasto = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Esc chiude il menu e basta (tastiera.ts guarda defaultPrevented).
        e.preventDefault()
        onChiudi()
      }
    }
    document.addEventListener('pointerdown', fuori)
    document.addEventListener('keydown', tasto)
    return () => {
      document.removeEventListener('pointerdown', fuori)
      document.removeEventListener('keydown', tasto)
    }
  }, [menu, onChiudi])

  if (!menu) return null
  const x = Math.min(menu.x, window.innerWidth - LARGHEZZA - 8)
  const y = Math.min(menu.y, window.innerHeight - 40 - menu.voci.length * 32)
  return createPortal(
    <div
      ref={riquadro}
      role="menu"
      aria-label={menu.titolo}
      style={{ left: x, top: y, width: LARGHEZZA }}
      className="fixed z-50 flex flex-col rounded-plancia border border-linea bg-pannello py-1 shadow-lg"
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="etichetta truncate px-3 py-1.5">{menu.titolo}</span>
      {menu.voci.map((v) => (
        <button
          key={v.nome}
          type="button"
          role="menuitem"
          className="h-8 px-3 text-left text-[13px] hover:bg-separatore hover:text-ambra focus:bg-separatore focus:outline-none"
          onClick={() => {
            onChiudi()
            v.azione()
          }}
        >
          {v.nome}
        </button>
      ))}
    </div>,
    document.body,
  )
}
