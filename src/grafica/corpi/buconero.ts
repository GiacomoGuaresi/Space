import * as THREE from 'three'
import { additivo, rivolgi, seme, type Generatore } from '../comune'
import { RUMORE } from '../glsl'

/** Il gas del disco: più caldo e chiaro all'interno, a spirale, più luminoso dal lato che si avvicina. */
const GAS = /* glsl */ `
  ${RUMORE}
  uniform float uTempo;
  uniform float uSeme;
  uniform float uInterno;
  uniform float uEsterno;

  vec3 gas(float r, float angolo, float lato) {
    float t = clamp((r - uInterno) / (uEsterno - uInterno), 0.0, 1.0);
    // Il gas interno gira più in fretta (Keplero): le striature si avvolgono.
    float giro = angolo + uTempo * 0.6 / pow(r / uInterno, 1.5);
    float striature = fbm(vec3(cos(giro) * 2.0, sin(giro) * 2.0, r * 0.8 + uSeme)) * 0.5 + 0.5;
    vec3 caldo = vec3(1.0, 0.95, 0.85);
    vec3 medio = vec3(1.0, 0.55, 0.15);
    vec3 freddo = vec3(0.6, 0.12, 0.03);
    vec3 colore = t < 0.3 ? mix(caldo, medio, t / 0.3) : mix(medio, freddo, (t - 0.3) / 0.7);
    float luce = pow(1.0 - t, 1.6) * (0.4 + 1.2 * striature);
    // Effetto Doppler: un lato brilla di più.
    luce *= 1.0 + 0.7 * lato;
    return colore * luce * 2.2;
  }
`

/**
 * Buco nero: l'orizzonte nero, il disco di accrescimento e l'immagine del disco
 * piegata dalla gravità, che lo fa vedere anche sopra e sotto l'ombra. Il
 * piegamento si imita con un anello sempre rivolto alla camera, dietro l'ombra.
 */
export const buconero: Generatore = (settore, c) => {
  if (settore.corpo?.dettagli.tipo !== 'buconero') throw new Error('Atteso un buco nero')
  const { massa } = settore.corpo.dettagli
  const gruppo = new THREE.Group()
  const orizzonte = 1.2 + Math.log10(massa) * 0.6
  const interno = orizzonte * 1.6
  const esterno = orizzonte * c.tra(5, 7)
  const uniformi = {
    uTempo: { value: 0 },
    uSeme: { value: seme(c) },
    uInterno: { value: interno },
    uEsterno: { value: esterno },
  }

  gruppo.add(new THREE.Mesh(new THREE.SphereGeometry(orizzonte, 64, 32), new THREE.MeshBasicMaterial({ color: 0x000000 })))

  const disco = new THREE.Mesh(
    new THREE.RingGeometry(interno, esterno, 256, 8),
    additivo({
      side: THREE.DoubleSide,
      uniforms: uniformi,
      vertexShader: /* glsl */ `
        varying vec2 vLocale;
        void main() {
          vLocale = position.xy;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        ${GAS}
        varying vec2 vLocale;
        void main() {
          float r = length(vLocale);
          float angolo = atan(vLocale.y, vLocale.x);
          float bordo = smoothstep(uInterno, uInterno * 1.08, r) * smoothstep(uEsterno, uEsterno * 0.8, r);
          gl_FragColor = vec4(gas(r, angolo, vLocale.x / r) * bordo, 1.0);
        }
      `,
    }),
  )
  disco.rotation.x = -Math.PI / 2
  const inclinato = new THREE.Group()
  inclinato.rotation.z = c.tra(-0.25, 0.25)
  inclinato.add(disco)
  gruppo.add(inclinato)

  // L'immagine piegata: un anello piatto rivolto alla camera, con l'anello di fotoni.
  const lente = new THREE.Mesh(
    new THREE.PlaneGeometry(esterno * 1.6, esterno * 1.6),
    additivo({
      uniforms: { ...uniformi, uOrizzonte: { value: orizzonte } },
      vertexShader: /* glsl */ `
        varying vec2 vLocale;
        void main() {
          vLocale = position.xy;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        ${GAS}
        uniform float uOrizzonte;
        varying vec2 vLocale;
        void main() {
          // Schiacciato in verticale: l'arco sopra e sotto l'ombra.
          vec2 q = vec2(vLocale.x, vLocale.y * 1.0);
          float r = length(q);
          float angolo = atan(q.y, q.x);
          float raggioArco = mix(uOrizzonte * 1.15, uInterno * 1.6, smoothstep(0.0, 1.0, abs(q.y) / max(r, 0.001)));
          float arco = exp(-pow((r - raggioArco) / (uOrizzonte * 0.45), 2.0));
          float fotoni = exp(-pow((r - uOrizzonte * 1.08) / (uOrizzonte * 0.04), 2.0));
          vec3 colore = gas(uInterno + (r - uOrizzonte) * 1.2, angolo, q.x / max(r, 0.001)) * arco * 0.55;
          colore += vec3(1.0, 0.85, 0.6) * fotoni * 1.8;
          gl_FragColor = vec4(colore, 1.0);
        }
      `,
    }),
  )
  // Dietro l'orizzonte: la sfera nera ne copre il centro.
  lente.renderOrder = -0.5
  gruppo.add(lente)

  return {
    oggetto: gruppo,
    inquadratura: { distanza: esterno * 2.4, altezza: esterno * 0.22, vicino: orizzonte * 3, lontano: esterno * 8 },
    aggiorna(tempo, camera) {
      uniformi.uTempo.value = tempo
      rivolgi(lente, camera)
    },
  }
}
