import * as THREE from 'three'
import type { Composizione } from '../../dominio/settore'
import { hsl, type Generatore } from '../comune'
import { geometriaRoccia } from '../pezzi'

const MATERIALI: Readonly<Record<Composizione, { tinta: [number, number]; metallo: number }>> = {
  metallica: { tinta: [0.55, 0.62], metallo: 0.7 },
  silicea: { tinta: [0.06, 0.11], metallo: 0.05 },
  mista: { tinta: [0.04, 0.6], metallo: 0.3 },
}

/**
 * Campo di asteroidi: poche forme di roccia ripetute in istanze, sparse in un
 * anello spesso, che girano piano ognuna sul suo asse.
 */
export const asteroidi: Generatore = (settore, c) => {
  if (settore.corpo?.dettagli.tipo !== 'asteroidi') throw new Error('Atteso un campo di asteroidi')
  const { composizione, rocce } = settore.corpo.dettagli
  const gruppo = new THREE.Group()
  const { tinta, metallo } = MATERIALI[composizione]

  const sole = new THREE.DirectionalLight(0xfff1dd, 3)
  sole.position.set(c.tra(-1, 1), c.tra(0.2, 1), c.tra(-1, 1)).multiplyScalar(30)
  gruppo.add(sole, new THREE.AmbientLight(0x334466, 0.35))

  const forme = Array.from({ length: 6 }, () => geometriaRoccia(c))
  const materiale = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: metallo, flatShading: true })

  const raggioCampo = 16
  type Roccia = { posizione: THREE.Vector3; scala: THREE.Vector3; asse: THREE.Vector3; velocita: number; fase: number }
  const perForma: Roccia[][] = forme.map(() => [])
  for (let i = 0; i < rocce; i++) {
    const a = c.tra(0, Math.PI * 2)
    const r = raggioCampo * Math.sqrt(c.tra(0.04, 1))
    // Le grandi sono rare: dimensioni con una coda lunga.
    const s = 0.08 + Math.pow(c.numero(), 4) * 1.3
    perForma[c.intero(0, forme.length - 1)].push({
      posizione: new THREE.Vector3(Math.cos(a) * r, c.tra(-1, 1) * c.tra(0.3, 2.5), Math.sin(a) * r),
      scala: new THREE.Vector3(s, s, s),
      asse: new THREE.Vector3(c.tra(-1, 1), c.tra(-1, 1), c.tra(-1, 1)).normalize(),
      velocita: c.tra(0.05, 0.4),
      fase: c.tra(0, Math.PI * 2),
    })
  }

  const istanze = forme.map((forma, f) => {
    const mesh = new THREE.InstancedMesh(forma, materiale, Math.max(1, perForma[f].length))
    mesh.count = perForma[f].length
    perForma[f].forEach((_, i) => mesh.setColorAt(i, hsl(c.tra(tinta[0], tinta[1]), c.tra(0.05, 0.25), c.tra(0.25, 0.5))))
    gruppo.add(mesh)
    return mesh
  })

  // Polvere fine attorno alle rocce.
  const polvere = new Float32Array(1500 * 3)
  for (let i = 0; i < 1500; i++) {
    const a = c.tra(0, Math.PI * 2)
    const r = raggioCampo * Math.sqrt(c.numero()) * 1.1
    polvere.set([Math.cos(a) * r, c.tra(-1.5, 1.5), Math.sin(a) * r], i * 3)
  }
  gruppo.add(
    new THREE.Points(
      new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(polvere, 3)),
      new THREE.PointsMaterial({ color: 0x9a8f80, size: 0.05, transparent: true, opacity: 0.5, depthWrite: false }),
    ),
  )

  const matrice = new THREE.Matrix4()
  const rotazione = new THREE.Quaternion()
  const inclinazione = c.tra(-0.3, 0.3)
  gruppo.rotation.x = inclinazione
  return {
    oggetto: gruppo,
    inquadratura: { distanza: raggioCampo * 2.2, altezza: raggioCampo * 0.6, vicino: 3, lontano: raggioCampo * 5 },
    aggiorna(tempo) {
      gruppo.rotation.y = tempo * 0.01
      istanze.forEach((mesh, f) => {
        perForma[f].forEach((roccia, i) => {
          rotazione.setFromAxisAngle(roccia.asse, roccia.fase + tempo * roccia.velocita)
          matrice.compose(roccia.posizione, rotazione, roccia.scala)
          mesh.setMatrixAt(i, matrice)
        })
        mesh.instanceMatrix.needsUpdate = true
      })
    },
  }
}
