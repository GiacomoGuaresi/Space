// PC o telefono (doc/11-interfaccia.md#principi): da 1024 px di larghezza in
// su la plancia a finestre, sotto le pagine.

import { useSyncExternalStore } from 'react'
import { useImpostazioni } from './preferenze'

export const LARGHEZZA_PC = 1024

const query = `(min-width: ${LARGHEZZA_PC}px)`

function iscriviti(avvisa: () => void) {
  const elenco = window.matchMedia(query)
  elenco.addEventListener('change', avvisa)
  return () => elenco.removeEventListener('change', avvisa)
}

/** Vero dove vale la plancia a finestre: sugli schermi larghi, o se lo si è scelto nelle impostazioni. */
export function usePC(): boolean {
  const largo = useSyncExternalStore(iscriviti, () => window.matchMedia(query).matches)
  const { interfaccia } = useImpostazioni()
  return interfaccia === 'auto' ? largo : interfaccia === 'finestre'
}
