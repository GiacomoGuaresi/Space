import * as THREE from 'three'
import type { Casuale } from '../../dominio/casuale'
import { hsl, type Generatore } from '../comune'
import { geometriaRoccia } from '../pezzi'

type Pezzo = { mesh: THREE.Mesh; deriva: THREE.Vector3; giro: THREE.Vector3 }

/** Lo scafo di una nave: segmenti lungo l'asse, con ali e antenne, spezzato in un punto. */
function nave(c: Casuale, scafo: THREE.Material, dettagli: THREE.Material) {
  const intera = new THREE.Group()
  const segmenti = c.intero(4, 7)
  let z = 0
  const parti: THREE.Mesh[] = []
  for (let i = 0; i < segmenti; i++) {
    const lungo = c.tra(1.2, 3)
    const largo = c.tra(0.6, 1.6) * (i === 0 ? 0.6 : 1)
    const forma = c.prova(0.5)
      ? new THREE.BoxGeometry(largo, largo * c.tra(0.5, 1), lungo)
      : new THREE.CylinderGeometry(largo * 0.55, largo * 0.6, lungo, 10).rotateX(Math.PI / 2)
    const pezzo = new THREE.Mesh(forma, scafo)
    pezzo.position.z = z + lungo / 2
    z += lungo
    parti.push(pezzo)
    if (c.prova(0.4)) {
      const ala = new THREE.Mesh(new THREE.BoxGeometry(c.tra(3, 6), 0.08, lungo * 0.6), dettagli)
      ala.position.copy(pezzo.position)
      parti.push(ala)
    }
    if (c.prova(0.3)) {
      const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, c.tra(1, 3), 4), dettagli)
      antenna.position.set(pezzo.position.x, largo / 2 + 0.8, pezzo.position.z)
      parti.push(antenna)
    }
  }
  for (const p of parti) intera.add(p)
  intera.position.z = -z / 2
  return { intera, lunghezza: z }
}

/** Una stazione: un anello a cui manca un pezzo, il mozzo al centro e i raggi. */
function stazione(c: Casuale, scafo: THREE.Material, dettagli: THREE.Material) {
  const intera = new THREE.Group()
  const raggio = c.tra(4, 6)
  const arco = Math.PI * 2 * c.tra(0.55, 0.85)
  intera.add(new THREE.Mesh(new THREE.TorusGeometry(raggio, c.tra(0.35, 0.6), 12, 64, arco), scafo))
  intera.add(new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 2.5, 16).rotateX(Math.PI / 2), scafo))
  const raggi = c.intero(3, 6)
  for (let i = 0; i < raggi; i++) {
    const a = (i / raggi) * Math.PI * 2
    if (a > arco) continue
    const braccio = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, raggio, 6), dettagli)
    braccio.position.set((Math.cos(a) * raggio) / 2, (Math.sin(a) * raggio) / 2, 0)
    braccio.rotation.z = a - Math.PI / 2
    intera.add(braccio)
  }
  return { intera, lunghezza: raggio * 2 }
}

/** Una sonda: corpo piccolo, parabola e bracci con i sensori. */
function sonda(c: Casuale, scafo: THREE.Material, dettagli: THREE.Material) {
  const intera = new THREE.Group()
  intera.add(new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 1.2), scafo))
  const parabola = new THREE.Mesh(new THREE.SphereGeometry(1.6, 24, 8, 0, Math.PI * 2, 0, 0.6), dettagli)
  parabola.position.y = -0.2
  parabola.rotation.x = Math.PI
  intera.add(parabola)
  for (let i = 0; i < c.intero(2, 4); i++) {
    const braccio = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, c.tra(2, 4), 4), dettagli)
    braccio.rotation.set(c.tra(0, Math.PI), c.tra(0, Math.PI), c.tra(0, Math.PI))
    intera.add(braccio)
  }
  return { intera, lunghezza: 4 }
}

/**
 * Relitto alieno: una struttura metallica spenta che ruota lenta su se stessa,
 * qualche luce ancora accesa che lampeggia e frammenti che vanno alla deriva.
 */
export const relitto: Generatore = (settore, c) => {
  if (settore.corpo?.dettagli.tipo !== 'relitto') throw new Error('Atteso un relitto')
  const { forma } = settore.corpo.dettagli
  const gruppo = new THREE.Group()
  const tinta = c.tra(0, 1)
  const scafo = new THREE.MeshStandardMaterial({ color: hsl(tinta, 0.08, 0.55), metalness: 0.55, roughness: 0.5, flatShading: true })
  const dettagli = new THREE.MeshStandardMaterial({ color: hsl(tinta + 0.5, 0.12, 0.4), metalness: 0.5, roughness: 0.6 })

  const chiave = new THREE.DirectionalLight(0xd8e4ff, 4)
  chiave.position.set(c.tra(-1, 1), 1, c.tra(0.3, 1)).multiplyScalar(30)
  const contro = new THREE.DirectionalLight(hsl(tinta + 0.5, 0.6, 0.6), 2.5)
  contro.position.set(-chiave.position.x, -10, -chiave.position.z)
  gruppo.add(chiave, contro, new THREE.AmbientLight(0x405070, 1.2))

  const struttura = forma === 'nave' ? nave(c, scafo, dettagli) : forma === 'stazione' ? stazione(c, scafo, dettagli) : sonda(c, scafo, dettagli)
  const tutto = new THREE.Group()
  tutto.add(struttura.intera)
  const posa = new THREE.Euler(c.tra(0, Math.PI), c.tra(0, Math.PI), c.tra(0, Math.PI))
  const deriva = new THREE.Vector3(c.tra(-0.03, 0.03), c.tra(0.02, 0.05), c.tra(-0.02, 0.02))
  gruppo.add(tutto)

  // Le luci rimaste: piccole sfere che si accendono e spengono.
  const coloreLuci = hsl(c.prova(0.5) ? 0.0 : 0.45, 0.9, 0.55)
  const luci = Array.from({ length: c.intero(3, 7) }, () => {
    const materiale = new THREE.MeshBasicMaterial({ color: coloreLuci.clone() })
    const luce = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 4), materiale)
    luce.position.set(c.tra(-1, 1), c.tra(-0.6, 0.6), c.tra(-1, 1)).multiplyScalar(struttura.lunghezza * 0.4)
    struttura.intera.add(luce)
    return { materiale, ritmo: c.tra(0.5, 2.5), fase: c.tra(0, 6) }
  })

  // Frammenti alla deriva.
  const pezzi: Pezzo[] = Array.from({ length: c.intero(8, 20) }, () => {
    const mesh = new THREE.Mesh(c.prova(0.5) ? new THREE.BoxGeometry(c.tra(0.1, 0.6), c.tra(0.05, 0.3), c.tra(0.2, 0.9)) : geometriaRoccia(c, 1, 0.5), scafo)
    mesh.scale.multiplyScalar(c.tra(0.12, 0.45))
    mesh.position.set(c.tra(-1, 1), c.tra(-1, 1), c.tra(-1, 1)).multiplyScalar(struttura.lunghezza * 0.8)
    gruppo.add(mesh)
    return {
      mesh,
      deriva: new THREE.Vector3(c.tra(-1, 1), c.tra(-1, 1), c.tra(-1, 1)).multiplyScalar(0.02),
      giro: new THREE.Vector3(c.tra(-0.5, 0.5), c.tra(-0.5, 0.5), c.tra(-0.5, 0.5)),
    }
  })
  const partenze = pezzi.map((p) => p.mesh.position.clone())

  const lato = struttura.lunghezza
  return {
    oggetto: gruppo,
    inquadratura: { distanza: lato * 1.1 + 4, altezza: lato * 0.25, vicino: 2, lontano: lato * 6 + 30 },
    aggiorna(tempo) {
      tutto.rotation.set(posa.x + tempo * deriva.x, posa.y + tempo * deriva.y, posa.z + tempo * deriva.z)
      for (const l of luci) l.materiale.color.copy(coloreLuci).multiplyScalar(Math.sin(tempo * l.ritmo + l.fase) > 0.6 ? 4 : 0.15)
      pezzi.forEach((p, i) => {
        p.mesh.position.copy(partenze[i]).addScaledVector(p.deriva, tempo)
        p.mesh.rotation.set(tempo * p.giro.x, tempo * p.giro.y, tempo * p.giro.z)
      })
    },
  }
}
