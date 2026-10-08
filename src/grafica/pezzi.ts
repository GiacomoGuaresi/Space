// Pezzi usati da più generatori: stelle, pianeti, anelli, bagliori.

import * as THREE from 'three'
import type { Casuale } from '../dominio/casuale'
import type { Stella, TipoPianeta } from '../dominio/settore'
import { additivo, coloreTemperatura, hsl, rivolgi, seme } from './comune'
import { RUMORE } from './glsl'

/** I vertici comuni: posizione nel mondo, normale nel mondo, posizione locale. */
const VERTICE_MONDO = /* glsl */ `
  varying vec3 vNormale;
  varying vec3 vMondo;
  varying vec3 vLocale;
  void main() {
    vLocale = position;
    vNormale = normalize(mat3(modelMatrix) * normal);
    vec4 mondo = modelMatrix * vec4(position, 1.0);
    vMondo = mondo.xyz;
    gl_Position = projectionMatrix * viewMatrix * mondo;
  }
`

// Bagliore ------------------------------------------------------------------

/**
 * Un alone tondo, rivolto sempre alla camera: `raggi` aggiunge i raggi
 * irregolari di una corona. L'intensità supera 1, così il bloom lo allarga.
 */
export function creaBagliore(colore: THREE.Color, dimensione: number, intensita: number, raggi = 0, semeRumore = 0) {
  const materiale = additivo({
    uniforms: {
      uColore: { value: colore },
      uIntensita: { value: intensita },
      uRaggi: { value: raggi },
      uSeme: { value: semeRumore },
      uTempo: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv - 0.5;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${RUMORE}
      uniform vec3 uColore;
      uniform float uIntensita;
      uniform float uRaggi;
      uniform float uSeme;
      uniform float uTempo;
      varying vec2 vUv;
      void main() {
        float r = length(vUv) * 2.0;
        float angolo = atan(vUv.y, vUv.x);
        float alone = exp(-r * 5.0) + 0.25 * exp(-r * 1.6);
        float raggi = uRaggi * pow(max(0.0, snoise(vec3(cos(angolo) * 2.5, sin(angolo) * 2.5, uSeme + uTempo * 0.05)) * 0.5 + 0.5), 3.0) * exp(-r * 2.2);
        float a = (alone + raggi) * smoothstep(1.0, 0.6, r);
        gl_FragColor = vec4(uColore * a * uIntensita, 1.0);
      }
    `,
  })
  const piano = new THREE.Mesh(new THREE.PlaneGeometry(dimensione, dimensione), materiale)
  return {
    oggetto: piano,
    aggiorna(tempo: number, camera: THREE.Camera) {
      materiale.uniforms.uTempo.value = tempo
      rivolgi(piano, camera)
    },
  }
}

// Stella --------------------------------------------------------------------

/** Una stella con la superficie granulosa e la corona, di raggio `raggio` in scena. */
export function creaStella(stella: Stella, raggio: number, c: Casuale) {
  const gruppo = new THREE.Group()
  const colore = coloreTemperatura(stella.temperatura)
  const semeStella = seme(c)
  const superficie = new THREE.ShaderMaterial({
    uniforms: { uColore: { value: colore }, uSeme: { value: semeStella }, uTempo: { value: 0 } },
    vertexShader: VERTICE_MONDO,
    fragmentShader: /* glsl */ `
      ${RUMORE}
      uniform vec3 uColore;
      uniform float uSeme;
      uniform float uTempo;
      varying vec3 vNormale;
      varying vec3 vMondo;
      varying vec3 vLocale;
      void main() {
        vec3 p = normalize(vLocale);
        float granuli = fbm(p * 7.0 + vec3(uSeme, uTempo * 0.03, 0.0)) * 0.5 + 0.5;
        float macchie = smoothstep(0.62, 0.75, fbmLeggero(p * 2.0 + uSeme) * 0.5 + 0.5);
        vec3 vista = normalize(cameraPosition - vMondo);
        float bordo = pow(max(dot(vNormale, vista), 0.0), 0.45);
        vec3 c = uColore * (0.55 + 0.9 * granuli) * (1.0 - 0.55 * macchie);
        gl_FragColor = vec4(c * (0.3 + 0.9 * bordo) * 1.15, 1.0);
      }
    `,
  })
  gruppo.add(new THREE.Mesh(new THREE.SphereGeometry(raggio, 64, 32), superficie))
  const corona = creaBagliore(colore, raggio * 5, 0.75, 0.8, semeStella)
  gruppo.add(corona.oggetto)
  // La luce per i pianeti attorno.
  gruppo.add(new THREE.PointLight(colore, 3, 0, 0))
  return {
    oggetto: gruppo,
    colore,
    aggiorna(tempo: number, camera: THREE.Camera) {
      superficie.uniforms.uTempo.value = tempo
      corona.aggiorna(tempo, camera)
    },
  }
}

// Pianeta -------------------------------------------------------------------

const TIPI_PIANETA: Readonly<Record<TipoPianeta, number>> = { roccioso: 0, oceanico: 1, ghiacciato: 2, gassoso: 3 }

/** Tre colori e l'atmosfera, scelti per tipo con un po' di variazione. */
function tavolozza(tipo: TipoPianeta, c: Casuale) {
  switch (tipo) {
    case 'roccioso': {
      const h = c.tra(0, 0.12) + (c.prova(0.3) ? 0.5 : 0)
      return [hsl(h, 0.25, 0.18), hsl(h + 0.03, 0.35, 0.38), hsl(h + 0.05, 0.3, 0.62), hsl(h, 0.2, 0.6)]
    }
    case 'oceanico':
      return [hsl(c.tra(0.55, 0.62), 0.7, 0.25), hsl(c.tra(0.22, 0.32), 0.45, 0.32), hsl(c.tra(0.08, 0.12), 0.4, 0.45), hsl(0.57, 0.7, 0.6)]
    case 'ghiacciato': {
      const h = c.tra(0.5, 0.62)
      return [hsl(h, 0.35, 0.55), hsl(h, 0.25, 0.75), hsl(h, 0.1, 0.92), hsl(h, 0.5, 0.75)]
    }
    case 'gassoso': {
      const calda = c.prova(0.55)
      const h = calda ? c.tra(0.03, 0.12) : c.tra(0.5, 0.65)
      return [hsl(h, 0.45, 0.35), hsl(h + 0.03, 0.4, 0.6), hsl(h - 0.02, 0.25, 0.82), hsl(h, 0.5, 0.65)]
    }
  }
}

/**
 * Un pianeta illuminato dalla posizione `luce` (in coordinate del mondo), o da
 * una direzione fissa se `direzione` è vero.
 */
export function creaPianeta(tipo: TipoPianeta, raggio: number, c: Casuale, luce: THREE.Vector3, direzione = false) {
  const [c1, c2, c3, atmosfera] = tavolozza(tipo, c)
  const materiale = new THREE.ShaderMaterial({
    uniforms: {
      uTipo: { value: TIPI_PIANETA[tipo] },
      uSeme: { value: seme(c) },
      uC1: { value: c1 },
      uC2: { value: c2 },
      uC3: { value: c3 },
      uAtmosfera: { value: atmosfera },
      uLuce: { value: luce },
      uDirezione: { value: direzione ? 1 : 0 },
      uBande: { value: c.tra(6, 14) },
      uTempo: { value: 0 },
    },
    vertexShader: VERTICE_MONDO,
    fragmentShader: /* glsl */ `
      ${RUMORE}
      uniform int uTipo;
      uniform float uSeme;
      uniform vec3 uC1;
      uniform vec3 uC2;
      uniform vec3 uC3;
      uniform vec3 uAtmosfera;
      uniform vec3 uLuce;
      uniform int uDirezione;
      uniform float uBande;
      uniform float uTempo;
      varying vec3 vNormale;
      varying vec3 vMondo;
      varying vec3 vLocale;

      vec3 rampa(float t) {
        return t < 0.5 ? mix(uC1, uC2, t * 2.0) : mix(uC2, uC3, t * 2.0 - 1.0);
      }

      void main() {
        vec3 p = normalize(vLocale);
        vec3 s = p + uSeme;
        vec3 colore;
        float nuvole = 0.0;
        if (uTipo == 0) {
          float h = fbm(s * 2.5) * 0.5 + 0.5;
          float crateri = smoothstep(0.7, 0.75, snoise(s * 9.0) * 0.5 + 0.5);
          colore = rampa(h) * (1.0 - 0.3 * crateri);
        } else if (uTipo == 1) {
          float h = fbm(s * 2.0);
          colore = h > 0.05 ? mix(uC2, uC3, smoothstep(0.05, 0.4, h)) : uC1 * (0.7 + 0.6 * (h + 0.5));
          colore = mix(colore, vec3(0.95), smoothstep(0.78, 0.86, abs(p.y)));
          nuvole = smoothstep(0.1, 0.45, fbm(s * 3.0 + vec3(uTempo * 0.01, 0.0, 0.0)));
        } else if (uTipo == 2) {
          float crepe = 1.0 - abs(snoise(s * 5.0));
          colore = mix(rampa(fbm(s * 2.0) * 0.5 + 0.5), uC1, pow(crepe, 12.0) * 0.6);
        } else {
          float v = p.y * uBande + fbm(vec3(p.x * 2.0, p.y * 9.0, p.z * 2.0) + uSeme + vec3(uTempo * 0.02, 0.0, 0.0)) * 1.4;
          colore = rampa(sin(v) * 0.5 + 0.5);
          float tempesta = smoothstep(0.82, 0.9, snoise(s * 3.0) * 0.5 + 0.5);
          colore = mix(colore, uC1 * 1.3, tempesta);
        }
        colore = mix(colore, vec3(1.0), nuvole * 0.85);

        vec3 L = uDirezione == 1 ? normalize(uLuce) : normalize(uLuce - vMondo);
        vec3 V = normalize(cameraPosition - vMondo);
        float luce = smoothstep(-0.15, 0.6, dot(vNormale, L));
        float fresnel = pow(1.0 - max(dot(vNormale, V), 0.0), 3.0);
        vec3 c = colore * (0.02 + luce) + uAtmosfera * fresnel * (0.15 + luce) * 0.9;
        gl_FragColor = vec4(c, 1.0);
      }
    `,
  })
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(raggio, 64, 32), materiale)
  mesh.rotation.z = c.tra(-0.4, 0.4)
  const rotazione = c.tra(0.02, 0.12) * (c.prova(0.85) ? 1 : -1)
  return {
    oggetto: mesh,
    colore: c2,
    aggiorna(tempo: number) {
      materiale.uniforms.uTempo.value = tempo
      mesh.rotation.y = tempo * rotazione
    },
  }
}

// Anelli --------------------------------------------------------------------

/** Anelli piatti a bande, attorno a un pianeta di raggio `raggio`. */
export function creaAnelli(raggio: number, colore: THREE.Color, c: Casuale, luce: THREE.Vector3, direzione = false) {
  const interno = raggio * c.tra(1.3, 1.6)
  const esterno = raggio * c.tra(2.1, 2.8)
  const materiale = new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    uniforms: {
      uInterno: { value: interno },
      uEsterno: { value: esterno },
      uColore: { value: colore.clone().lerp(new THREE.Color(1, 1, 1), 0.3) },
      uSeme: { value: seme(c) },
      uLuce: { value: luce },
      uDirezione: { value: direzione ? 1 : 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vLocale;
      varying vec3 vMondo;
      void main() {
        vLocale = position;
        vec4 mondo = modelMatrix * vec4(position, 1.0);
        vMondo = mondo.xyz;
        gl_Position = projectionMatrix * viewMatrix * mondo;
      }
    `,
    fragmentShader: /* glsl */ `
      ${RUMORE}
      uniform float uInterno;
      uniform float uEsterno;
      uniform vec3 uColore;
      uniform float uSeme;
      uniform vec3 uLuce;
      uniform int uDirezione;
      varying vec3 vLocale;
      varying vec3 vMondo;
      void main() {
        float r = (length(vLocale.xy) - uInterno) / (uEsterno - uInterno);
        float bande = fbmLeggero(vec3(r * 14.0, uSeme, 0.0)) * 0.5 + 0.5;
        float vuoti = smoothstep(0.15, 0.25, snoise(vec3(r * 7.0, uSeme + 3.0, 0.0)) * 0.5 + 0.5);
        float a = bande * vuoti * smoothstep(0.0, 0.05, r) * smoothstep(1.0, 0.9, r) * 0.85;
        vec3 L = uDirezione == 1 ? normalize(uLuce) : normalize(uLuce - vMondo);
        float luce = 0.35 + 0.65 * abs(L.y);
        gl_FragColor = vec4(uColore * (0.6 + 0.6 * bande) * luce, a);
      }
    `,
  })
  const anelli = new THREE.Mesh(new THREE.RingGeometry(interno, esterno, 160, 1), materiale)
  anelli.rotation.x = -Math.PI / 2
  return anelli
}

// Rocce ---------------------------------------------------------------------

/** Una roccia irregolare: un icosaedro deformato da rumore seminato. */
export function geometriaRoccia(c: Casuale, dettaglio = 3, deformazione = 0.35): THREE.BufferGeometry {
  const geometria = new THREE.IcosahedronGeometry(1, dettaglio)
  const posizioni = geometria.attributes.position as THREE.BufferAttribute
  // Pochi "bozzi" casuali: per ogni vertice si sommano i loro contributi.
  const bozzi = Array.from({ length: 9 }, () => ({
    centro: new THREE.Vector3(c.tra(-1, 1), c.tra(-1, 1), c.tra(-1, 1)).normalize(),
    ampiezza: c.tra(-deformazione, deformazione),
    larghezza: c.tra(0.3, 1.1),
  }))
  const allungamento = new THREE.Vector3(c.tra(0.7, 1.3), c.tra(0.6, 1), c.tra(0.8, 1.4))
  const v = new THREE.Vector3()
  for (let i = 0; i < posizioni.count; i++) {
    v.fromBufferAttribute(posizioni, i).normalize()
    let r = 1
    for (const b of bozzi) r += b.ampiezza * Math.exp(-v.distanceToSquared(b.centro) / (b.larghezza * b.larghezza))
    // Un po' di rugosità fine, legata al vertice.
    r += Math.sin(v.x * 17.3 + v.y * 31.7 + v.z * 11.1) * 0.03
    v.multiplyScalar(r).multiply(allungamento)
    posizioni.setXYZ(i, v.x, v.y, v.z)
  }
  geometria.computeVertexNormals()
  return geometria
}
