import * as THREE from 'three'
import type { GenereNebulosa } from '../../dominio/settore'
import { hsl, rivolgi, seme, type Generatore } from '../comune'
import { RUMORE } from '../glsl'
import { creaBagliore } from '../pezzi'

/** I due colori di ogni genere: quello principale e quello dei bordi. */
function colori(genere: GenereNebulosa, tinta: number): [THREE.Color, THREE.Color] {
  switch (genere) {
    // Idrogeno rosso-magenta, ossigeno verde-azzurro ai margini.
    case 'emissione':
      return [hsl(0.95 + tinta * 0.06, 0.8, 0.5), hsl(0.48 + tinta * 0.05, 0.7, 0.45)]
    case 'riflessione':
      return [hsl(0.58 + tinta * 0.06, 0.75, 0.55), hsl(0.68, 0.5, 0.5)]
    case 'planetaria':
      return [hsl(0.45 + tinta * 0.08, 0.75, 0.5), hsl(0.98, 0.75, 0.5)]
    case 'oscura':
      return [hsl(0.07, 0.4, 0.06), hsl(0.6, 0.5, 0.35)]
  }
}

/**
 * Una nebulosa fatta di molti strati piatti rivolti alla camera, ognuno con il
 * suo rumore: sovrapposti danno l'idea di volume. La planetaria è un guscio
 * attorno a una nana bianca; l'oscura copre la luce invece di emetterla.
 */
export const nebulosa: Generatore = (settore, c) => {
  if (settore.corpo?.dettagli.tipo !== 'nebulosa') throw new Error('Attesa una nebulosa')
  const { genere, densita } = settore.corpo.dettagli
  const gruppo = new THREE.Group()
  const [principale, bordo] = colori(genere, c.numero())
  const oscura = genere === 'oscura'
  const planetaria = genere === 'planetaria'
  const estensione = planetaria ? 9 : 22

  const strati = Array.from({ length: planetaria ? 10 : 16 }, (_, i) => {
    const materiale = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: oscura ? THREE.NormalBlending : THREE.AdditiveBlending,
      uniforms: {
        uPrincipale: { value: principale },
        uBordo: { value: bordo },
        uSeme: { value: seme(c) },
        uDensita: { value: densita },
        uTempo: { value: 0 },
        uPlanetaria: { value: planetaria ? 1 : 0 },
        uOscura: { value: oscura ? 1 : 0 },
        uScala: { value: c.tra(1.2, 2.2) },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv * 2.0 - 1.0;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        ${RUMORE}
        uniform vec3 uPrincipale;
        uniform vec3 uBordo;
        uniform float uSeme;
        uniform float uDensita;
        uniform float uTempo;
        uniform int uPlanetaria;
        uniform int uOscura;
        uniform float uScala;
        varying vec2 vUv;
        void main() {
          float r = length(vUv);
          vec3 p = vec3(vUv * uScala, uSeme + uTempo * 0.01);
          // Domain warping: il rumore deformato dal rumore dà i filamenti.
          vec3 spinta = vec3(fbm(p), fbm(p + 5.2), 0.0);
          float n = fbm(p + spinta * 1.6) * 0.5 + 0.5;
          float forma;
          if (uPlanetaria == 1) {
            float guscio = exp(-pow((r - 0.45) / 0.16, 2.0));
            forma = guscio * (0.5 + n);
          } else {
            forma = smoothstep(1.0, 0.15, r) * smoothstep(0.35, 0.75, n);
          }
          float a = forma * uDensita;
          vec3 colore = mix(uPrincipale, uBordo, smoothstep(0.3, 0.9, r + (n - 0.5) * 0.6));
          if (uOscura == 1) {
            gl_FragColor = vec4(colore, clamp(a * 1.4, 0.0, 0.92));
          } else {
            gl_FragColor = vec4(colore * a * 0.55, 1.0);
          }
        }
      `,
    })
    const lato = estensione * c.tra(0.9, 1.6) * (planetaria ? 1 : 1 - i * 0.02)
    const piano = new THREE.Mesh(new THREE.PlaneGeometry(lato, lato), materiale)
    piano.position.set(c.tra(-1, 1), c.tra(-1, 1), c.tra(-1, 1)).multiplyScalar(planetaria ? 0.6 : estensione * 0.25)
    gruppo.add(piano)
    return { piano, materiale, giro: c.tra(-0.02, 0.02) }
  })

  // Le stelle giovani dentro la nube (o la nana bianca al centro della planetaria).
  const bagliori = planetaria
    ? [creaBagliore(new THREE.Color(0.85, 0.92, 1), 4, 4)]
    : Array.from({ length: c.intero(oscura ? 4 : 2, oscura ? 9 : 6) }, () => {
        const b = creaBagliore(hsl(c.tra(0.55, 0.65), 0.4, 0.85), c.tra(1.5, 4), c.tra(1.5, 3))
        b.oggetto.position.set(c.tra(-1, 1), c.tra(-1, 1), c.tra(-1, 1)).multiplyScalar(estensione * 0.35)
        return b
      })
  // Nell'oscura la luce sta dietro: si disegna prima della polvere che la copre.
  for (const b of bagliori) {
    if (oscura) b.oggetto.position.z -= estensione * 0.5
    gruppo.add(b.oggetto)
  }

  return {
    oggetto: gruppo,
    inquadratura: {
      distanza: estensione * 1.4,
      altezza: estensione * 0.15,
      vicino: estensione * 0.4,
      lontano: estensione * 4,
    },
    aggiorna(tempo, camera) {
      for (const s of strati) {
        rivolgi(s.piano, camera)
        s.piano.rotateZ(tempo * s.giro)
        s.materiale.uniforms.uTempo.value = tempo
      }
      for (const b of bagliori) b.aggiorna(tempo, camera)
    },
  }
}
