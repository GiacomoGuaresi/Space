import type { ReactNode } from 'react'
import { Rnd } from 'react-rnd'
import { ICONE_FINESTRE, IconaChiudi, IconaRiduci } from './icone'
import { DentroFinestra } from './plancia'
import { chiudi, FINESTRE, primoPiano, riduci, sposta, type Finestra as DatiFinestra, type IdFinestra } from './finestre'

interface Props {
  id: IdFinestra
  finestra: DatiFinestra
  /** La posizione nell'ordine: più alta, più in primo piano. */
  livello: number
  attiva: boolean
  /** Oltre a chiuderla: il diario, chiudendosi, segna la lettura. */
  onChiudi?: () => void
  children: ReactNode
}

/**
 * Una finestra della plancia per PC (doc/11-interfaccia.md#regole-delle-finestre):
 * si trascina dal titolo, si ridimensiona dall'angolo, _ la riduce nel dock,
 * × la chiude, un clic la porta in primo piano. Non esce dall'area.
 */
export function Finestra({ id, finestra, livello, attiva, onChiudi, children }: Props) {
  const { titolo, minW, minH, piena } = FINESTRE[id]
  const Icona = ICONE_FINESTRE[id]
  return (
    <Rnd
      bounds="parent"
      dragHandleClassName="maniglia"
      cancel=".comando"
      position={{ x: finestra.x, y: finestra.y }}
      size={{ width: finestra.w, height: finestra.h }}
      minWidth={minW}
      minHeight={minH}
      enableResizing={{ bottomRight: true, right: true, bottom: true }}
      onDragStart={() => primoPiano(id)}
      onDragStop={(_, d) => sposta(id, { x: d.x, y: d.y, w: finestra.w, h: finestra.h })}
      onResizeStop={(_, __, elemento, ___, posizione) =>
        sposta(id, { x: posizione.x, y: posizione.y, w: elemento.offsetWidth, h: elemento.offsetHeight })
      }
      onMouseDown={() => primoPiano(id)}
      style={{ zIndex: livello, display: 'flex' }}
      className="pointer-events-auto"
    >
      <section
        aria-label={titolo}
        className={`smussato flex min-h-0 flex-1 flex-col overflow-hidden border bg-pannello/92 backdrop-blur ${
          attiva ? 'border-ambra-scura [--smusso-colore:var(--color-ambra-scura)]' : 'border-linea'
        }`}
      >
        <header className="maniglia flex h-8 shrink-0 cursor-move items-center gap-2 border-b border-linea pr-1 pl-3 select-none">
          <Icona className={`size-4 shrink-0 ${attiva ? 'text-ambra' : 'text-testo-tenue'}`} />
          <h2 className={`etichetta m-0 flex-1 truncate ${attiva ? 'text-ambra!' : ''}`}>{titolo}</h2>
          <button
            type="button"
            className="comando grid size-6 place-items-center rounded-plancia text-testo-tenue hover:bg-separatore hover:text-testo"
            aria-label={`Riduci ${titolo}`}
            title="Riduci nel dock"
            onClick={() => riduci(id)}
          >
            <IconaRiduci className="size-3.5" />
          </button>
          <button
            type="button"
            className="comando grid size-6 place-items-center rounded-plancia text-testo-tenue hover:bg-separatore hover:text-testo"
            aria-label={`Chiudi ${titolo}`}
            title="Chiudi"
            onClick={() => {
              chiudi(id)
              onChiudi?.()
            }}
          >
            <IconaChiudi className="size-3.5" />
          </button>
        </header>
        <div className={`flex min-h-0 flex-1 flex-col overflow-y-auto ${piena ? '' : 'p-3'}`}>
          <DentroFinestra.Provider value={true}>{children}</DentroFinestra.Provider>
        </div>
      </section>
    </Rnd>
  )
}
