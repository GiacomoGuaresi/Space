import * as THREE from 'three'
import { additivo, type Generatore } from '../comune'
import { creaBagliore } from '../pezzi'

/** Un fascio: un cono lungo che sfuma dalla base alla punta. */
function fascio(lunghezza: number, larghezza: number, colore: THREE.Color) {
  const geometria = new THREE.ConeGeometry(larghezza, lunghezza, 32, 1, true)
  // Il cono parte dalla stella: la punta al centro, la base lontano.
  geometria.translate(0, -lunghezza / 2, 0)
  geometria.rotateX(Math.PI)
  const materiale = additivo({
    side: THREE.DoubleSide,
    uniforms: { uColore: { value: colore }, uLunghezza: { value: lunghezza } },
    vertexShader: /* glsl */ `
      varying float vLungo;
      varying vec3 vNormale;
      varying vec3 vVista;
      void main() {
        vLungo = position.y;
        vec4 vista = modelViewMatrix * vec4(position, 1.0);
        vNormale = normalize(normalMatrix * normal);
        vVista = normalize(-vista.xyz);
        gl_Position = projectionMatrix * vista;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColore;
      uniform float uLunghezza;
      varying float vLungo;
      varying vec3 vNormale;
      varying vec3 vVista;
      void main() {
        float t = clamp(vLungo / uLunghezza, 0.0, 1.0);
        // Più denso al centro del fascio, dove la vista lo attraversa di più.
        float centro = pow(abs(dot(vNormale, vVista)), 1.5);
        float a = pow(1.0 - t, 2.0) * centro;
        gl_FragColor = vec4(uColore * a * 0.45, 1.0);
      }
    `,
  })
  return new THREE.Mesh(geometria, materiale)
}

/**
 * Pulsar: una stella di neutroni piccolissima e accecante, con due fasci che
 * ruotano attorno a un asse inclinato rispetto a quello magnetico. Il periodo
 * vero (millisecondi) si rallenta: a schermo un giro dura da 1 a 4 secondi.
 */
export const pulsar: Generatore = (settore, c) => {
  if (settore.corpo?.dettagli.tipo !== 'pulsar') throw new Error('Attesa una pulsar')
  const { periodo } = settore.corpo.dettagli
  const gruppo = new THREE.Group()
  const colore = new THREE.Color(0.6, 0.75, 1.3)

  const nucleo = new THREE.Mesh(new THREE.SphereGeometry(0.35, 32, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.8, 2.2) }))
  gruppo.add(nucleo)
  const alone = creaBagliore(colore, 6, 1, 0.6, c.tra(0, 100))
  gruppo.add(alone.oggetto)

  // Asse di rotazione inclinato; i fasci seguono l'asse magnetico, inclinato ancora.
  const rotazione = new THREE.Group()
  rotazione.rotation.set(c.tra(-0.4, 0.4), 0, c.tra(-0.4, 0.4))
  const magnetico = new THREE.Group()
  magnetico.rotation.z = c.tra(0.35, 0.8)
  const lunghezza = 40
  const nord = fascio(lunghezza, c.tra(1.2, 2), colore)
  const sud = fascio(lunghezza, c.tra(1.2, 2), colore)
  sud.rotation.z = Math.PI
  magnetico.add(nord, sud)
  rotazione.add(magnetico)
  gruppo.add(rotazione)

  // Un disco di gas caldo attorno, come nella nebulosa del Granchio.
  const disco = new THREE.Mesh(
    new THREE.RingGeometry(0.8, 4, 96, 1),
    additivo({
      side: THREE.DoubleSide,
      uniforms: { uColore: { value: colore } },
      vertexShader: /* glsl */ `
        varying float vR;
        void main() {
          vR = length(position.xy);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColore;
        varying float vR;
        void main() {
          float a = exp(-pow((vR - 1.6) / 0.9, 2.0)) * 0.35;
          gl_FragColor = vec4(uColore * a, 1.0);
        }
      `,
    }),
  )
  disco.rotation.x = -Math.PI / 2
  rotazione.add(disco)

  const giro = 1 + Math.min(3, periodo * 2)
  return {
    oggetto: gruppo,
    inquadratura: { distanza: 26, altezza: 6, vicino: 3, lontano: 120 },
    aggiorna(tempo, camera) {
      magnetico.rotation.y = (tempo / giro) * Math.PI * 2
      alone.aggiorna(tempo, camera)
      // Il lampo quando un fascio passa verso la camera.
      const verso = new THREE.Vector3(0, 1, 0).applyQuaternion(nord.getWorldQuaternion(new THREE.Quaternion()))
      const lampo = Math.pow(Math.abs(verso.dot(camera.position.clone().normalize())), 12)
      nucleo.scale.setScalar(1 + lampo * 1.5)
    },
  }
}
