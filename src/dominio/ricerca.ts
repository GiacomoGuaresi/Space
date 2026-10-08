// Cerca il corpo di un tipo più vicino a un settore: serve all'osservatorio per
// trovare in fretta un esempio di ogni corpo, e più avanti allo scanner.

import type { TipoCorpo } from './catalogo'
import { distanza, tipoSettore, type Coordinate } from './settore'

/**
 * Il settore più vicino a `da` (escluso `da`) con un corpo del tipo dato, o
 * `null` se non ce n'è entro `raggioMassimo`. Si guarda a gusci di cubi
 * crescenti: un raggio di 25 sono circa 130 000 settori.
 */
export function piuVicino(da: Coordinate, tipo: TipoCorpo | 'qualsiasi', raggioMassimo = 25): Coordinate | null {
  let migliore: Coordinate | null = null
  let migliorDistanza = Infinity
  for (let r = 1; r <= raggioMassimo; r++) {
    for (let dx = -r; dx <= r; dx++)
      for (let dy = -r; dy <= r; dy++)
        for (let dz = -r; dz <= r; dz++) {
          // Solo il guscio: l'interno l'ha già visto il giro prima.
          if (Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) !== r) continue
          const qui = { x: da.x + dx, y: da.y + dy, z: da.z + dz }
          const d = distanza(da, qui)
          if (d >= migliorDistanza) continue
          const trovato = tipoSettore(qui)
          if (!trovato || (tipo !== 'qualsiasi' && trovato !== tipo)) continue
          migliore = qui
          migliorDistanza = d
        }
    // Ogni settore dei gusci successivi dista almeno r + 1: lì non c'è di meglio.
    if (migliore && migliorDistanza <= r + 1) return migliore
  }
  return migliore
}
