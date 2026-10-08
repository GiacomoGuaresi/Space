import * as THREE from 'three'
import { additivo, hsl, rivolgi, seme, type Generatore } from '../comune'
import { RUMORE } from '../glsl'

/**
 * Wormhole: una sfera di spazio piegato. Dentro si vede l'altro capo, un cielo
 * diverso e distorto; attorno, l'anello di luce della lente e la materia che
 * ci cade dentro a spirale.
 */
export const wormhole: Generatore = (settore, c) => {
  if (settore.corpo?.dettagli.tipo !== 'wormhole') throw new Error('Atteso un varco')
  const gruppo = new THREE.Group()
  const raggio = 4
  const tinta = c.tra(0, 1)
  const uniformi = {
    uTempo: { value: 0 },
    uSeme: { value: seme(c) },
    uColoreA: { value: hsl(tinta, 0.8, 0.6) },
    uColoreB: { value: hsl(tinta + 0.35, 0.8, 0.55) },
    uRaggio: { value: raggio },
  }

  const varco = new THREE.Mesh(
    new THREE.PlaneGeometry(raggio * 4, raggio * 4),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: uniformi,
      vertexShader: /* glsl */ `
        varying vec2 vLocale;
        void main() {
          vLocale = position.xy;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        ${RUMORE}
        uniform float uTempo;
        uniform float uSeme;
        uniform vec3 uColoreA;
        uniform vec3 uColoreB;
        uniform float uRaggio;
        varying vec2 vLocale;

        float stelle(vec2 p) {
          vec2 cella = floor(p);
          vec2 dentro = fract(p) - 0.5;
          float h = fract(sin(dot(cella, vec2(127.1, 311.7)) + uSeme) * 43758.5453);
          float luce = step(0.88, h) * smoothstep(0.12, 0.0, length(dentro - (h - 0.5) * 0.5));
          return luce * (0.5 + h);
        }

        void main() {
          float r = length(vLocale) / uRaggio;
          float angolo = atan(vLocale.y, vLocale.x);
          if (r > 2.0) discard;
          vec3 colore = vec3(0.0);
          float alfa = 0.0;
          if (r < 1.0) {
            // L'altro capo: coordinate ripiegate verso il bordo, che gira piano.
            float piega = pow(r, 0.35);
            vec2 q = vec2(cos(angolo + uTempo * 0.05 + (1.0 - r) * 3.0), sin(angolo + uTempo * 0.05 + (1.0 - r) * 3.0)) * piega * 18.0;
            float nube = fbm(vec3(q * 0.15, uSeme)) * 0.5 + 0.5;
            colore = mix(uColoreB * 0.15, uColoreA * 0.5, nube) * nube + vec3(stelle(q)) * 1.5;
            colore *= smoothstep(1.0, 0.85, r) * 0.9 + 0.1;
            alfa = 1.0;
          }
          // L'anello di Einstein, con un velo a spirale attorno.
          float anello = exp(-pow((r - 1.0) / 0.035, 2.0)) * 2.5;
          float spirale = fbm(vec3(angolo * 2.0 - log(r) * 6.0 + uTempo * 0.4, r * 2.0, uSeme)) * 0.5 + 0.5;
          float velo = smoothstep(2.0, 1.0, r) * smoothstep(0.95, 1.05, r) * pow(spirale, 2.0) * 1.2;
          colore += mix(uColoreA, uColoreB, spirale) * (anello + velo);
          alfa = max(alfa, clamp(anello + velo, 0.0, 1.0));
          gl_FragColor = vec4(colore, alfa);
        }
      `,
    }),
  )
  gruppo.add(varco)

  // La materia che cade nel varco, in spirale: calcolata nel vertex shader.
  const numero = 2500
  const partenze = new Float32Array(numero)
  const angoli = new Float32Array(numero)
  const quote = new Float32Array(numero)
  for (let i = 0; i < numero; i++) {
    partenze[i] = c.numero()
    angoli[i] = c.tra(0, Math.PI * 2)
    quote[i] = c.tra(-1, 1)
  }
  const geometria = new THREE.BufferGeometry()
  geometria.setAttribute('position', new THREE.BufferAttribute(new Float32Array(numero * 3), 3))
  geometria.setAttribute('aPartenza', new THREE.BufferAttribute(partenze, 1))
  geometria.setAttribute('aAngolo', new THREE.BufferAttribute(angoli, 1))
  geometria.setAttribute('aQuota', new THREE.BufferAttribute(quote, 1))
  const caduta = new THREE.Points(
    geometria,
    additivo({
      uniforms: { ...uniformi, uPixel: { value: 1 } },
      vertexShader: /* glsl */ `
        attribute float aPartenza;
        attribute float aAngolo;
        attribute float aQuota;
        uniform float uTempo;
        uniform float uRaggio;
        uniform float uPixel;
        varying float vVita;
        void main() {
          float vita = fract(aPartenza + uTempo * 0.04);
          vVita = vita;
          float r = uRaggio * mix(4.0, 1.0, vita * vita);
          float a = aAngolo + vita * 9.0;
          vec3 p = vec3(cos(a) * r, aQuota * (1.0 - vita) * 1.5, sin(a) * r);
          vec4 vista = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = uPixel * 1.2 * (40.0 / -vista.z);
          gl_Position = projectionMatrix * vista;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColoreA;
        uniform vec3 uColoreB;
        varying float vVita;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d) * sin(vVita * 3.1416) * 0.8;
          gl_FragColor = vec4(mix(uColoreB, uColoreA, vVita) * a, 1.0);
        }
      `,
    }),
  )
  caduta.frustumCulled = false
  caduta.rotation.x = c.tra(-0.3, 0.3)
  gruppo.add(caduta)

  const materialeCaduta = caduta.material as THREE.ShaderMaterial
  return {
    oggetto: gruppo,
    inquadratura: { distanza: raggio * 5, altezza: raggio * 0.8, vicino: raggio * 1.6, lontano: raggio * 18 },
    aggiorna(tempo, camera) {
      uniformi.uTempo.value = tempo
      materialeCaduta.uniforms.uPixel.value = Math.min(window.devicePixelRatio, 2)
      rivolgi(varco, camera)
    },
  }
}
