// Quello che serve a tutti i generatori: il contratto, la pulizia, i colori.

import * as THREE from 'three'
import type { Casuale } from '../dominio/casuale'
import type { Settore } from '../dominio/settore'

/** Quello che un generatore mette in scena per un settore. */
export interface Contenuto {
  oggetto: THREE.Object3D
  /**
   * Dove sta la camera all'arrivo: distanza dal centro e altezza sul piano.
   * `fissa`: la camera non si gira e non zooma (il viaggio).
   */
  inquadratura: { distanza: number; altezza: number; vicino: number; lontano: number; fissa?: boolean }
  /** A ogni fotogramma, con il tempo in secondi. */
  aggiorna(tempo: number, camera: THREE.Camera): void
}

/** Un generatore riceve solo il settore e un caso seminato dal suo seed. */
export type Generatore = (settore: Settore, c: Casuale) => Contenuto

/** Libera geometrie e materiali di tutto quello che sta sotto `oggetto`. */
export function libera(oggetto: THREE.Object3D) {
  oggetto.traverse((figlio) => {
    const conRisorse = figlio as THREE.Object3D & {
      geometry?: THREE.BufferGeometry
      material?: THREE.Material | THREE.Material[]
    }
    conRisorse.geometry?.dispose()
    const materiali = Array.isArray(conRisorse.material) ? conRisorse.material : [conRisorse.material]
    for (const m of materiali) m?.dispose()
  })
}

/** Gira un piano verso la camera: per bagliori e nebulose. */
export function rivolgi(oggetto: THREE.Object3D, camera: THREE.Camera) {
  oggetto.quaternion.copy(camera.quaternion)
}

/**
 * Il colore di un corpo nero alla temperatura data, in kelvin: l'approssimazione
 * di Tanner Helland, buona tra 1000 e 40000 K.
 */
export function coloreTemperatura(kelvin: number): THREE.Color {
  const t = Math.min(40000, Math.max(1000, kelvin)) / 100
  const r = t <= 66 ? 255 : 329.698727446 * (t - 60) ** -0.1332047592
  const g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * (t - 60) ** -0.0755148492
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307
  const limita = (v: number) => Math.min(255, Math.max(0, v)) / 255
  return new THREE.Color().setRGB(limita(r), limita(g), limita(b), THREE.SRGBColorSpace)
}

/** Un colore da tinta, saturazione e luminosità, tutte in [0, 1]. */
export function hsl(h: number, s: number, l: number): THREE.Color {
  return new THREE.Color().setHSL(((h % 1) + 1) % 1, s, l, THREE.SRGBColorSpace)
}

/** Un numero per spostare il rumore dei shader: diverso per ogni settore. */
export function seme(c: Casuale): number {
  return c.tra(0, 500)
}

/** Un materiale additivo per bagliori: non scrive la profondità, somma la luce. */
export function additivo(parametri: THREE.ShaderMaterialParameters): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    ...parametri,
  })
}
