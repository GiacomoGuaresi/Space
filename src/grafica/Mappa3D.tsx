import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CATALOGO } from '../dominio/catalogo'
import type { PuntoMappa, Sosta } from '../dominio/mappa'
import { stessoSettore, type Coordinate } from '../dominio/settore'
import { COLORI_RARITA } from '../ui/colori'
import { libera } from './comune'

interface Props {
  punti: readonly PuntoMappa[]
  soste: readonly Sosta[]
  /** Dove si trova la nave, o dove arriverà: il centro della mappa. */
  nave: Coordinate
  /** Il viaggio in corso, da dove a dove. */
  rotta: { da: Coordinate; a: Coordinate } | null
  selezionato: Coordinate | null
  onSeleziona: (punto: Coordinate | null) => void
}

const COLORE_NAVE = '#ffb547'
const COLORE_BASE = '#f2e6cc'

/** Forme dei punti, disegnate dal fragment shader. */
const PIENO = 0
const ANELLO = 1

interface Motore {
  renderer: THREE.WebGLRenderer
  camera: THREE.PerspectiveCamera
  controlli: OrbitControls
  scena: THREE.Scene
  contenuto: THREE.Group | null
  selezione: THREE.Points | null
  bersagli: THREE.Points | null
  /** I punti nell'ordine dei vertici di `bersagli`, per la selezione. */
  elenco: readonly PuntoMappa[]
  centro: Coordinate
}

/**
 * Punti rotondi con dimensione e forma per vertice. Le coordinate sono
 * relative alla nave: lontano dalla base gli interi a 32 bit non entrano in
 * un float della GPU senza perdere i settori.
 */
function creaPunti(posizioni: number[], colori: number[], dimensioni: number[], forme: number[]): THREE.Points {
  const geometria = new THREE.BufferGeometry()
  geometria.setAttribute('position', new THREE.Float32BufferAttribute(posizioni, 3))
  geometria.setAttribute('aColore', new THREE.Float32BufferAttribute(colori, 3))
  geometria.setAttribute('aDimensione', new THREE.Float32BufferAttribute(dimensioni, 1))
  geometria.setAttribute('aForma', new THREE.Float32BufferAttribute(forme, 1))
  const materiale = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    // Sopra la griglia e le bolle: in una mappa così rada i punti si vedono sempre.
    depthTest: false,
    uniforms: { uScala: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute vec3 aColore;
      attribute float aDimensione;
      attribute float aForma;
      uniform float uScala;
      varying vec3 vColore;
      varying float vForma;
      void main() {
        vColore = aColore;
        vForma = aForma;
        vec4 vista = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = clamp(aDimensione * uScala / -vista.z, 3.0, 64.0);
        gl_Position = projectionMatrix * vista;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColore;
      varying float vForma;
      void main() {
        float r = length(gl_PointCoord - 0.5) * 2.0;
        float alfa = vForma < 0.5
          ? 1.0 - smoothstep(0.55, 1.0, r)
          : smoothstep(0.55, 0.7, r) * (1.0 - smoothstep(0.85, 1.0, r));
        if (alfa < 0.01) discard;
        gl_FragColor = vec4(vColore, alfa);
      }
    `,
  })
  const punti = new THREE.Points(geometria, materiale)
  punti.renderOrder = 1
  return punti
}

const relativa = (c: Coordinate, centro: Coordinate): [number, number, number] => [
  c.x - centro.x,
  // In three.js l'alto è y: la mappa tiene z verso l'alto, come gli assi del gioco.
  c.z - centro.z,
  -(c.y - centro.y),
]

const rgb = (esadecimale: string) => new THREE.Color(esadecimale).toArray() as number[]

/**
 * La mappa dei settori scansionati in 3D: i corpi noti come punti colorati per
 * rarità (pieni se scoperti), le bolle delle soste, la nave e la base. Si
 * gira trascinando, si sposta con due dita, si tocca un punto per sceglierlo.
 */
export function Mappa3D({ punti, soste, nave, rotta, selezionato, onSeleziona }: Props) {
  const contenitore = useRef<HTMLDivElement>(null)
  const motore = useRef<Motore | null>(null)
  const seleziona = useRef(onSeleziona)
  seleziona.current = onSeleziona

  useEffect(() => {
    const dove = contenitore.current
    if (!dove) return

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    dove.appendChild(renderer.domElement)
    const scena = new THREE.Scene()
    scena.background = new THREE.Color('#030405')
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 5000)
    camera.position.set(9, 7, 12)
    const controlli = new OrbitControls(camera, renderer.domElement)
    controlli.enableDamping = true
    controlli.minDistance = 2
    controlli.maxDistance = 800
    controlli.screenSpacePanning = true

    const m: Motore = { renderer, camera, controlli, scena, contenuto: null, selezione: null, bersagli: null, elenco: [], centro: nave }
    motore.current = m

    const ridimensiona = () => {
      const { clientWidth: larghezza, clientHeight: altezza } = dove
      renderer.setSize(larghezza, altezza)
      camera.aspect = larghezza / altezza
      camera.updateProjectionMatrix()
    }
    ridimensiona()
    const osservatore = new ResizeObserver(ridimensiona)
    osservatore.observe(dove)

    renderer.setAnimationLoop(() => {
      controlli.update()
      // I punti hanno una dimensione in "settori": a schermo dipende dall'altezza della vista.
      const scala = renderer.domElement.height / (2 * Math.tan((camera.fov * Math.PI) / 360))
      m.contenuto?.traverse((o) => {
        if (o instanceof THREE.Points) (o.material as THREE.ShaderMaterial).uniforms.uScala.value = scala
      })
      if (m.selezione) (m.selezione.material as THREE.ShaderMaterial).uniforms.uScala.value = scala
      renderer.render(scena, camera)
    })

    // Un tocco, non un trascinamento: si sceglie il punto più vicino al raggio.
    let giu: { x: number; y: number } | null = null
    const premi = (e: PointerEvent) => {
      giu = { x: e.clientX, y: e.clientY }
    }
    const rilascia = (e: PointerEvent) => {
      if (!giu || Math.hypot(e.clientX - giu.x, e.clientY - giu.y) > 6 || !m.bersagli) return
      giu = null
      const rettangolo = renderer.domElement.getBoundingClientRect()
      const mouse = new THREE.Vector2(
        ((e.clientX - rettangolo.left) / rettangolo.width) * 2 - 1,
        -((e.clientY - rettangolo.top) / rettangolo.height) * 2 + 1,
      )
      const raggio = new THREE.Raycaster()
      raggio.setFromCamera(mouse, camera)
      // La tolleranza cresce con la distanza: i punti hanno sempre almeno qualche pixel.
      raggio.params.Points.threshold = Math.max(0.35, camera.position.distanceTo(controlli.target) * 0.03)
      const colpi = raggio.intersectObject(m.bersagli)
      colpi.sort((a, b) => (a.distanceToRay ?? 0) - (b.distanceToRay ?? 0))
      const colpo = colpi[0]
      seleziona.current(colpo?.index !== undefined ? m.elenco[colpo.index].coordinate : null)
    }
    renderer.domElement.addEventListener('pointerdown', premi)
    renderer.domElement.addEventListener('pointerup', rilascia)

    return () => {
      renderer.setAnimationLoop(null)
      osservatore.disconnect()
      renderer.domElement.removeEventListener('pointerdown', premi)
      renderer.domElement.removeEventListener('pointerup', rilascia)
      if (m.contenuto) libera(m.contenuto)
      if (m.selezione) libera(m.selezione)
      controlli.dispose()
      renderer.dispose()
      renderer.domElement.remove()
      motore.current = null
    }
    // La nave iniziale serve solo al primo centro: dopo lo aggiorna l'effetto qui sotto.
  }, [])

  // Il contenuto si rifà quando cambiano i dati; la camera resta dov'è, salvo
  // quando la nave si sposta.
  useEffect(() => {
    const m = motore.current
    if (!m) return
    if (m.contenuto) {
      m.scena.remove(m.contenuto)
      libera(m.contenuto)
    }
    const gruppo = new THREE.Group()

    // Le bolle delle soste: dove lo scanner ha guardato.
    for (const s of soste) {
      const bolla = new THREE.Mesh(
        new THREE.SphereGeometry(s.raggio, 32, 16),
        new THREE.MeshBasicMaterial({ color: COLORE_NAVE, transparent: true, opacity: 0.045, depthWrite: false }),
      )
      bolla.position.set(...relativa(s.centro, nave))
      gruppo.add(bolla)
    }

    // Una griglia sul piano della nave, un quadretto per settore.
    const griglia = new THREE.GridHelper(40, 40, '#3a2b15', '#1a1309')
    ;(griglia.material as THREE.Material).transparent = true
    ;(griglia.material as THREE.Material).opacity = 0.6
    gruppo.add(griglia)

    // I corpi: pieni e più grandi se scoperti.
    const posizioni: number[] = []
    const colori: number[] = []
    const dimensioni: number[] = []
    const forme: number[] = []
    for (const p of punti) {
      posizioni.push(...relativa(p.coordinate, nave))
      colori.push(...rgb(COLORI_RARITA[CATALOGO[p.tipo].rarita].esadecimale).map((v) => (p.scoperto ? v : v * 0.75)))
      dimensioni.push(p.scoperto ? 0.55 : 0.4)
      forme.push(p.scoperto ? PIENO : ANELLO)
    }
    const corpi = creaPunti(posizioni, colori, dimensioni, forme)
    gruppo.add(corpi)

    // Nave e base.
    const segni = creaPunti(
      [...relativa(nave, nave), ...relativa({ x: 0, y: 0, z: 0 }, nave)],
      [...rgb(COLORE_NAVE), ...rgb(COLORE_BASE)],
      [0.8, 1.2],
      [PIENO, ANELLO],
    )
    gruppo.add(segni)

    // Il viaggio in corso, dalla partenza all'arrivo.
    if (rotta) {
      const linea = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(...relativa(rotta.da, nave)),
          new THREE.Vector3(...relativa(rotta.a, nave)),
        ]),
        new THREE.LineDashedMaterial({ color: COLORE_NAVE, dashSize: 0.3, gapSize: 0.2 }),
      )
      linea.computeLineDistances()
      gruppo.add(linea)
    }

    m.scena.add(gruppo)
    m.contenuto = gruppo
    m.bersagli = corpi
    m.elenco = punti
    if (!stessoSettore(m.centro, nave)) {
      m.centro = nave
      m.controlli.target.set(0, 0, 0)
    }
  }, [punti, soste, nave, rotta])

  // Il punto scelto: un anello più grande attorno.
  useEffect(() => {
    const m = motore.current
    if (!m) return
    if (m.selezione) {
      m.scena.remove(m.selezione)
      libera(m.selezione)
      m.selezione = null
    }
    if (!selezionato) return
    m.selezione = creaPunti([...relativa(selezionato, nave)], rgb('#ffffff'), [1.3], [ANELLO])
    m.scena.add(m.selezione)
  }, [selezionato, nave])

  return <div ref={contenitore} className="absolute inset-0 touch-none" />
}
