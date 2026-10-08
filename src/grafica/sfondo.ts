// Lo sfondo comune a tutti i settori (doc/03-universo.md): un campo di stelle
// con una fascia galattica, tutto seminato dal settore.

import * as THREE from 'three'
import type { Casuale } from '../dominio/casuale'
import { RUMORE } from './glsl'
import { coloreTemperatura, hsl, seme } from './comune'

const RAGGIO = 900

/** Le stelle sono punti tondi e morbidi che brillano piano, ognuno col suo ritmo. */
const materialeStelle = () =>
  new THREE.ShaderMaterial({
    uniforms: { uTempo: { value: 0 }, uPixel: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float aDimensione;
      attribute float aFase;
      attribute vec3 aColore;
      uniform float uTempo;
      uniform float uPixel;
      varying vec3 vColore;
      void main() {
        float scintilla = 0.8 + 0.2 * sin(uTempo * (0.6 + fract(aFase * 7.0)) + aFase * 6.28);
        vColore = aColore * scintilla;
        gl_PointSize = aDimensione * uPixel;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColore;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vColore * a * a, 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })

/** Una direzione uniforme sulla sfera. */
function direzione(c: Casuale): THREE.Vector3 {
  const z = c.tra(-1, 1)
  const a = c.tra(0, Math.PI * 2)
  const r = Math.sqrt(1 - z * z)
  return new THREE.Vector3(r * Math.cos(a), r * Math.sin(a), z)
}

export function creaSfondo(c: Casuale): { oggetto: THREE.Object3D; aggiorna(tempo: number): void } {
  const gruppo = new THREE.Group()

  // La fascia galattica: un piano a caso, con stelle più fitte vicino.
  const asse = direzione(c)
  const sparse = 3500
  const fascia = 6000
  const totale = sparse + fascia
  const posizioni = new Float32Array(totale * 3)
  const colori = new Float32Array(totale * 3)
  const dimensioni = new Float32Array(totale)
  const fasi = new Float32Array(totale)
  const punto = new THREE.Vector3()
  for (let i = 0; i < totale; i++) {
    punto.copy(direzione(c))
    if (i >= sparse) {
      // Si schiaccia il punto verso il piano della fascia.
      const quota = punto.dot(asse)
      punto.addScaledVector(asse, -quota * (1 - c.tra(0.02, 0.25))).normalize()
    }
    punto.multiplyScalar(RAGGIO).toArray(posizioni, i * 3)
    // Molte stelle fredde e piccole, poche calde e grandi.
    const calda = c.prova(0.12)
    const colore = coloreTemperatura(calda ? c.tra(8000, 25000) : c.tra(2800, 7000))
    const luce = i >= sparse ? c.tra(0.15, 0.6) : c.tra(0.3, 1)
    colore.multiplyScalar(luce).toArray(colori, i * 3)
    dimensioni[i] = (i >= sparse ? c.tra(1, 2.2) : c.tra(1.2, 3.2)) * (c.prova(0.02) ? 1.8 : 1)
    fasi[i] = c.numero()
  }
  const geometria = new THREE.BufferGeometry()
  geometria.setAttribute('position', new THREE.BufferAttribute(posizioni, 3))
  geometria.setAttribute('aColore', new THREE.BufferAttribute(colori, 3))
  geometria.setAttribute('aDimensione', new THREE.BufferAttribute(dimensioni, 1))
  geometria.setAttribute('aFase', new THREE.BufferAttribute(fasi, 1))
  const stelle = new THREE.Points(geometria, materialeStelle())
  stelle.frustumCulled = false
  gruppo.add(stelle)

  // Il velo della fascia: una sfera vista da dentro, con polvere a rumore.
  const tinta = c.tra(0, 1)
  const cielo = new THREE.Mesh(
    new THREE.SphereGeometry(RAGGIO * 1.05, 48, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uAsse: { value: asse },
        uSeme: { value: seme(c) },
        uColoreA: { value: hsl(tinta, 0.45, 0.5) },
        uColoreB: { value: hsl(tinta + 0.12, 0.35, 0.35) },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDirezione;
        void main() {
          vDirezione = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        ${RUMORE}
        uniform vec3 uAsse;
        uniform float uSeme;
        uniform vec3 uColoreA;
        uniform vec3 uColoreB;
        varying vec3 vDirezione;
        void main() {
          float quota = dot(vDirezione, uAsse);
          float fascia = exp(-quota * quota * 18.0);
          float polvere = fbm(vDirezione * 3.0 + uSeme) * 0.5 + 0.5;
          float scura = smoothstep(0.55, 0.75, fbm(vDirezione * 6.0 + uSeme * 2.0) * 0.5 + 0.5);
          vec3 colore = mix(uColoreB, uColoreA, polvere) * fascia * polvere * (1.0 - 0.7 * scura);
          gl_FragColor = vec4(colore * 0.09 + vec3(0.002, 0.003, 0.006), 1.0);
        }
      `,
    }),
  )
  gruppo.add(cielo)
  // Lo sfondo si disegna per primo e sotto tutto il resto.
  cielo.renderOrder = -2
  stelle.renderOrder = -1

  const materiale = stelle.material as THREE.ShaderMaterial
  return {
    oggetto: gruppo,
    aggiorna(tempo) {
      materiale.uniforms.uTempo.value = tempo
      materiale.uniforms.uPixel.value = Math.min(window.devicePixelRatio, 2)
    },
  }
}
