import type { Generatore } from '../comune'
import { creaStella } from '../pezzi'

/** Stella solitaria: la dimensione in scena cresce col raggio vero, ma piano. */
export const stella: Generatore = (settore, c) => {
  if (settore.corpo?.dettagli.tipo !== 'stella') throw new Error('Attesa una stella')
  const { stella: dati } = settore.corpo.dettagli
  const raggio = 3 * Math.cbrt(dati.raggio)
  const s = creaStella(dati, raggio, c)
  return {
    oggetto: s.oggetto,
    inquadratura: { distanza: raggio * 6, altezza: raggio, vicino: raggio * 1.6, lontano: raggio * 20 },
    aggiorna: s.aggiorna,
  }
}
