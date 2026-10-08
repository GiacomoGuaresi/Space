import * as THREE from 'three'
import { additivo, type Generatore } from '../comune'

const PROFONDITA = 300

/**
 * In viaggio: scie di stelle che vengono incontro lungo l'asse della camera.
 * Ogni scia è un segmento; la posizione la calcola il vertex shader dal tempo.
 */
export const viaggio: Generatore = (_settore, c) => {
  const numero = 900
  // Due vertici per scia: la testa (0) e la coda (1).
  const posizioni = new Float32Array(numero * 2 * 3)
  const partenze = new Float32Array(numero * 2)
  const estremi = new Float32Array(numero * 2)
  const colori = new Float32Array(numero * 2 * 3)
  for (let i = 0; i < numero; i++) {
    const a = c.tra(0, Math.PI * 2)
    const r = 1.5 + Math.pow(c.numero(), 0.7) * 40
    const partenza = c.numero()
    const calda = c.prova(0.3)
    for (let k = 0; k < 2; k++) {
      const j = i * 2 + k
      posizioni.set([Math.cos(a) * r, Math.sin(a) * r, 0], j * 3)
      partenze[j] = partenza
      estremi[j] = k
      colori.set(calda ? [1, 0.85, 0.7] : [0.7, 0.82, 1], j * 3)
    }
  }
  const geometria = new THREE.BufferGeometry()
  geometria.setAttribute('position', new THREE.BufferAttribute(posizioni, 3))
  geometria.setAttribute('aPartenza', new THREE.BufferAttribute(partenze, 1))
  geometria.setAttribute('aEstremo', new THREE.BufferAttribute(estremi, 1))
  geometria.setAttribute('aColore', new THREE.BufferAttribute(colori, 3))
  const materiale = additivo({
    uniforms: { uTempo: { value: 0 }, uProfondita: { value: PROFONDITA } },
    vertexShader: /* glsl */ `
      attribute float aPartenza;
      attribute float aEstremo;
      attribute vec3 aColore;
      uniform float uTempo;
      uniform float uProfondita;
      varying vec3 vColore;
      void main() {
        float avanzamento = fract(aPartenza + uTempo * 0.35);
        float z = -uProfondita + avanzamento * (uProfondita + 10.0);
        // La coda si allunga man mano che la scia si avvicina.
        z -= aEstremo * (2.0 + avanzamento * avanzamento * 40.0);
        float luce = smoothstep(0.0, 0.3, avanzamento) * (1.0 - aEstremo * 0.9);
        vColore = aColore * luce * 0.8;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position.xy, z, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColore;
      void main() {
        gl_FragColor = vec4(vColore, 1.0);
      }
    `,
  })
  const scie = new THREE.LineSegments(geometria, materiale)
  scie.frustumCulled = false
  return {
    oggetto: scie,
    inquadratura: { distanza: 8, altezza: 0, vicino: 8, lontano: 8, fissa: true },
    aggiorna(tempo) {
      materiale.uniforms.uTempo.value = tempo
    },
  }
}
