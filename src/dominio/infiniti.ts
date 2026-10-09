// I nodi infiniti dell'albero (doc/10-ricerche.md): si ricercano a livelli, e
// tra le ricerche fatte ogni livello compare come `nodo#livello`. A parte da
// ricerche.ts perché li leggono anche insediamenti e navigazione.

/** I nodi a livelli infiniti: Propulsione avanzata e Colonizzazione avanzata. */
export const INFINITI = ['P∞', 'C∞'] as const

export function infinito(id: string): boolean {
  return (INFINITI as readonly string[]).includes(id)
}

/**
 * Le ricerche completate a `ora`, come insieme: i nodi, e per i nodi infiniti
 * anche un `nodo#livello` per ogni livello fatto (vedi `livelloRicerca`).
 */
export function ricercheFatte(ricerche: readonly { nodo: string; livello: number; fine: Date }[], ora: Date): ReadonlySet<string> {
  const fatte = new Set<string>()
  for (const r of ricerche) {
    if (r.fine > ora) continue
    fatte.add(r.nodo)
    if (infinito(r.nodo)) fatte.add(`${r.nodo}#${r.livello}`)
  }
  return fatte
}

/** A che livello è un nodo infinito (0 se mai fatto). Come `space.livello_ricerca`. */
export function livelloRicerca(fatte: ReadonlySet<string>, id: string): number {
  let livello = 0
  for (const f of fatte) if (f.startsWith(`${id}#`)) livello++
  return livello
}
