import * as THREE from 'three'
import { additivo, hsl, type Generatore } from '../comune'
import { creaBagliore, geometriaRoccia } from '../pezzi'

/**
 * Una coda di particelle calcolata nel vertex shader: ogni particella nasce al
 * nucleo e si allontana lungo `uDirezione`, allargandosi; poi rinasce.
 */
function coda(numero: number, colore: THREE.Color, lunghezza: number, apertura: number, curva: number, c: { tra(a: number, b: number): number }) {
  const partenze = new Float32Array(numero)
  const deviazioni = new Float32Array(numero * 3)
  for (let i = 0; i < numero; i++) {
    partenze[i] = c.tra(0, 1)
    deviazioni.set([c.tra(-1, 1), c.tra(-1, 1), c.tra(-1, 1)], i * 3)
  }
  const geometria = new THREE.BufferGeometry()
  // La posizione la calcola lo shader: questa serve solo a three.js per il conteggio.
  geometria.setAttribute('position', new THREE.BufferAttribute(new Float32Array(numero * 3), 3))
  geometria.setAttribute('aPartenza', new THREE.BufferAttribute(partenze, 1))
  geometria.setAttribute('aDeviazione', new THREE.BufferAttribute(deviazioni, 3))
  const materiale = additivo({
    uniforms: {
      uTempo: { value: 0 },
      uColore: { value: colore },
      uLunghezza: { value: lunghezza },
      uApertura: { value: apertura },
      uCurva: { value: curva },
      uPixel: { value: 1 },
    },
    vertexShader: /* glsl */ `
      attribute float aPartenza;
      attribute vec3 aDeviazione;
      uniform float uTempo;
      uniform float uLunghezza;
      uniform float uApertura;
      uniform float uCurva;
      uniform float uPixel;
      varying float vEta;
      void main() {
        float eta = fract(aPartenza + uTempo * 0.05);
        vEta = eta;
        vec3 p = vec3(eta * uLunghezza, 0.0, 0.0);
        p += aDeviazione * (0.15 + eta * uApertura);
        p.y += uCurva * eta * eta * uLunghezza;
        vec4 vista = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = uPixel * (2.0 + 4.0 * (1.0 - eta)) * (30.0 / -vista.z);
        gl_Position = projectionMatrix * vista;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColore;
      varying float vEta;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * pow(1.0 - vEta, 1.5) * 0.22;
        gl_FragColor = vec4(uColore * a, 1.0);
      }
    `,
  })
  const punti = new THREE.Points(geometria, materiale)
  punti.frustumCulled = false
  return { punti, materiale }
}

/**
 * Cometa: un nucleo di roccia e ghiaccio, la chioma luminosa e due code
 * opposte al sole lontano: quella di polvere, gialla e curva, e quella di
 * ioni, azzurra e dritta.
 */
export const cometa: Generatore = (settore, c) => {
  if (settore.corpo?.dettagli.tipo !== 'cometa') throw new Error('Attesa una cometa')
  const { coda: lunghezzaCoda } = settore.corpo.dettagli
  const gruppo = new THREE.Group()

  const sole = new THREE.DirectionalLight(0xffffff, 3)
  sole.position.set(-1, 0.2, 0.3).multiplyScalar(20)
  gruppo.add(sole, new THREE.AmbientLight(0x223344, 0.4))

  const nucleo = new THREE.Mesh(
    geometriaRoccia(c, 3, 0.45),
    new THREE.MeshStandardMaterial({ color: hsl(0.08, 0.1, 0.35), roughness: 1, flatShading: true }),
  )
  nucleo.scale.setScalar(0.6)
  gruppo.add(nucleo)

  const chioma = creaBagliore(new THREE.Color(0.75, 0.9, 1), 4, 1.1)
  gruppo.add(chioma.oggetto)

  const lunghezza = 30 * lunghezzaCoda + 10
  const polvere = coda(5000, new THREE.Color(1, 0.85, 0.6), lunghezza, 2.6, -0.12, c)
  const ioni = coda(3500, new THREE.Color(0.45, 0.7, 1.2), lunghezza * 1.3, 0.7, 0, c)
  // Le code puntano lontano dal sole, cioè verso +x.
  const code = new THREE.Group()
  code.add(polvere.punti, ioni.punti)
  code.rotation.z = c.tra(-0.15, 0.15)
  gruppo.add(code)

  return {
    oggetto: gruppo,
    inquadratura: { distanza: 18, altezza: 5, vicino: 2, lontano: 90 },
    aggiorna(tempo, camera) {
      nucleo.rotation.set(tempo * 0.05, tempo * 0.13, 0)
      chioma.aggiorna(tempo, camera)
      for (const m of [polvere.materiale, ioni.materiale]) {
        m.uniforms.uTempo.value = tempo
        m.uniforms.uPixel.value = Math.min(window.devicePixelRatio, 2)
      }
    },
  }
}
