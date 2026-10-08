import * as THREE from 'three'
import type { Generatore } from '../comune'

/** Settore vuoto: solo lo sfondo e un velo di polvere che passa vicino alla camera. */
export const vuoto: Generatore = (_settore, c) => {
  const numero = 600
  const posizioni = new Float32Array(numero * 3)
  for (let i = 0; i < numero * 3; i++) posizioni[i] = c.tra(-25, 25)
  const polvere = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(posizioni, 3)),
    new THREE.PointsMaterial({ color: 0x8796b3, size: 0.06, transparent: true, opacity: 0.6, depthWrite: false }),
  )
  return {
    oggetto: polvere,
    inquadratura: { distanza: 20, altezza: 2, vicino: 5, lontano: 60 },
    aggiorna(tempo) {
      polvere.rotation.y = tempo * 0.004
    },
  }
}
