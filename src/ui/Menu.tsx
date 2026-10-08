import { BookOpen, Telescope, Rocket } from 'lucide-react'
import { indirizzo, type Pagina } from './indirizzo'

const voce =
  'grid size-9 place-items-center rounded-lg border border-bordo/70 bg-pannello/75 backdrop-blur hover:border-nebula hover:text-nebula aria-[current=page]:border-nebula aria-[current=page]:text-nebula'

/** Le pagine: ponte, catalogo e, solo in sviluppo, l'osservatorio libero. */
export function Menu({ attuale }: { attuale: Pagina['pagina'] }) {
  return (
    <nav className="flex gap-1.5" aria-label="Pagine">
      <a className={voce} href={indirizzo({ pagina: 'ponte' })} aria-current={attuale === 'ponte' ? 'page' : undefined} title="Ponte di comando">
        <Rocket className="size-4" aria-label="Ponte di comando" />
      </a>
      <a className={voce} href={indirizzo({ pagina: 'catalogo' })} aria-current={attuale === 'catalogo' ? 'page' : undefined} title="Catalogo delle scoperte">
        <BookOpen className="size-4" aria-label="Catalogo delle scoperte" />
      </a>
      {import.meta.env.DEV && (
        <a
          className={voce}
          href={indirizzo({ pagina: 'osservatorio', coordinate: { x: 0, y: 0, z: 0 } })}
          aria-current={attuale === 'osservatorio' ? 'page' : undefined}
          title="Osservatorio (solo in sviluppo)"
        >
          <Telescope className="size-4" aria-label="Osservatorio" />
        </a>
      )}
    </nav>
  )
}
