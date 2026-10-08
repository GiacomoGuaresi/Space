import * as THREE from 'three'
import type { Generatore } from '../comune'
import { creaAnelli, creaPianeta } from '../pezzi'

/**
 * Gigante gassoso errante: nessuna stella vicina, lo illumina una stella
 * lontana da una direzione fissa. Qualche luna gli gira attorno.
 */
export const gigante: Generatore = (settore, c) => {
  if (settore.corpo?.dettagli.tipo !== 'gigante') throw new Error('Atteso un gigante gassoso')
  const { anelli, raggio: raggioVero } = settore.corpo.dettagli
  const gruppo = new THREE.Group()
  const raggio = 3 + raggioVero * 0.25
  const luce = new THREE.Vector3(c.tra(-1, 1), c.tra(-0.3, 0.6), c.tra(0.2, 1)).normalize()

  const pianeta = creaPianeta('gassoso', raggio, c, luce, true)
  const inclinato = new THREE.Group()
  inclinato.rotation.z = c.tra(-0.5, 0.5)
  inclinato.add(pianeta.oggetto)
  if (anelli) inclinato.add(creaAnelli(raggio, pianeta.colore, c, luce, true))
  gruppo.add(inclinato)

  const lune = Array.from({ length: c.intero(0, 3) }, () => {
    const r = c.tra(0.15, 0.45)
    const luna = creaPianeta(c.prova(0.5) ? 'roccioso' : 'ghiacciato', r, c, luce, true)
    gruppo.add(luna.oggetto)
    return { luna, orbita: raggio * c.tra(2.2, 4), fase: c.tra(0, Math.PI * 2), velocita: c.tra(0.03, 0.1) }
  })

  return {
    oggetto: gruppo,
    inquadratura: { distanza: raggio * 4.2, altezza: raggio * 0.8, vicino: raggio * 1.4, lontano: raggio * 14 },
    aggiorna(tempo) {
      pianeta.aggiorna(tempo)
      for (const l of lune) {
        const a = l.fase + tempo * l.velocita
        l.luna.oggetto.position.set(Math.cos(a) * l.orbita, Math.sin(a) * l.orbita * 0.08, Math.sin(a) * l.orbita)
        l.luna.aggiorna(tempo)
      }
    },
  }
}
