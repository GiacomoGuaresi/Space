import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CATALOGO, type Rarita } from '../dominio/catalogo'
import type { PuntoMappa, Sosta } from '../dominio/mappa'
import { stessoSettore, type Coordinate } from '../dominio/settore'
import { COLORI_RARITA } from '../ui/colori'
import { libera } from './comune'

interface Props {
  punti: readonly PuntoMappa[]
  soste: readonly Sosta[]
  /** Dove si trova la nave, o dove arriverà: il centro della mappa. */
  nave: Coordinate
  /** Dove portare il centro della vista; `volta` cambia a ogni richiesta, anche verso lo stesso punto. */
  centra: { su: Coordinate; volta: number } | null
  selezionato: Coordinate | null
  onSeleziona: (punto: Coordinate | null) => void
}

const COLORE_NAVE = '#ffb547'
const COLORE_BASE = '#f2e6cc'

/** Forme dei punti, disegnate dal fragment shader: la rarità si legge dalla forma e dal colore. */
const FORMA = { cerchio: 0, rombo: 1, stella: 2, scintilla: 3, anello: 4, triangolo: 5 } as const
const FORME_RARITA: Readonly<Record<Rarita, number>> = {
  comune: FORMA.cerchio,
  'non comune': FORMA.rombo,
  rara: FORMA.stella,
  leggendaria: FORMA.scintilla,
}

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
 * Punti con dimensione, forma e riempimento per vertice: pieni o solo il
 * contorno. Le coordinate sono relative alla nave: lontano dalla base gli
 * interi a 32 bit non entrano in un float della GPU senza perdere i settori.
 */
function creaPunti(
  posizioni: number[],
  colori: number[],
  dimensioni: number[],
  forme: number[],
  pieni: number[] = forme.map(() => 1),
): THREE.Points {
  const geometria = new THREE.BufferGeometry()
  geometria.setAttribute('position', new THREE.Float32BufferAttribute(posizioni, 3))
  geometria.setAttribute('aColore', new THREE.Float32BufferAttribute(colori, 3))
  geometria.setAttribute('aDimensione', new THREE.Float32BufferAttribute(dimensioni, 1))
  geometria.setAttribute('aForma', new THREE.Float32BufferAttribute(forme, 1))
  geometria.setAttribute('aPieno', new THREE.Float32BufferAttribute(pieni, 1))
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
      attribute float aPieno;
      uniform float uScala;
      varying vec3 vColore;
      varying float vForma;
      varying float vPieno;
      void main() {
        vColore = aColore;
        vForma = aForma;
        vPieno = aPieno;
        vec4 vista = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = clamp(aDimensione * uScala / -vista.z, 9.0, 64.0);
        gl_Position = projectionMatrix * vista;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColore;
      varying float vForma;
      varying float vPieno;
      // Quanto si è fuori dal bordo della forma: negativo dentro.
      float bordo(vec2 p, float forma) {
        float r = length(p);
        float a = atan(p.y, p.x);
        if (forma < 0.5) return r - 0.62;
        if (forma < 1.5) return (abs(p.x) + abs(p.y)) - 0.8;
        if (forma < 2.5) return r - 0.9 * (0.42 + 0.58 * pow(abs(cos(2.5 * (a - 1.5708))), 2.0));
        if (forma < 3.5) return r - 0.95 * (0.22 + 0.78 * pow(abs(cos(2.0 * a)), 5.0));
        if (forma < 4.5) return abs(r - 0.78) - 0.1;
        return max(abs(p.x) * 0.866 + p.y * 0.5, -p.y) - 0.42;
      }
      void main() {
        vec2 p = (gl_PointCoord - 0.5) * 2.0;
        p.y = -p.y;
        float d = bordo(p, vForma);
        float morbido = 0.09;
        // Vuoti: solo un contorno sottile appena dentro il bordo.
        float alfa = vPieno > 0.5
          ? 1.0 - smoothstep(-morbido, morbido, d)
          : 1.0 - smoothstep(0.0, morbido, abs(d + 0.11) - 0.07);
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
 * La mappa dei settori scansionati in 3D (doc/11-interfaccia.md#mappa): i
 * corpi noti con la forma e il colore della rarità (pieni se visitati), le
 * bolle delle soste, la nave e la base madre. Si gira trascinando, si sposta
 * con due dita, si tocca un punto per sceglierlo.
 */
export function Mappa3D({ punti, soste, nave, centra, selezionato, onSeleziona }: Props) {
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

    // I corpi: la forma dice la rarità, pieni se visitati.
    const posizioni: number[] = []
    const colori: number[] = []
    const dimensioni: number[] = []
    const forme: number[] = []
    const pieni: number[] = []
    for (const p of punti) {
      const rarita = CATALOGO[p.tipo].rarita
      posizioni.push(...relativa(p.coordinate, nave))
      colori.push(...rgb(COLORI_RARITA[rarita].esadecimale))
      dimensioni.push(rarita === 'comune' ? 0.5 : 0.6)
      forme.push(FORME_RARITA[rarita])
      pieni.push(p.scoperto ? 1 : 0)
    }
    const corpi = creaPunti(posizioni, colori, dimensioni, forme, pieni)
    gruppo.add(corpi)

    // La nave e la base madre.
    const segni = creaPunti(
      [...relativa(nave, nave), ...relativa({ x: 0, y: 0, z: 0 }, nave)],
      [...rgb(COLORE_NAVE), ...rgb(COLORE_BASE)],
      [0.75, 1.2],
      [FORMA.triangolo, FORMA.anello],
    )
    gruppo.add(segni)

    m.scena.add(gruppo)
    m.contenuto = gruppo
    m.bersagli = corpi
    m.elenco = punti
    if (!stessoSettore(m.centro, nave)) {
      m.centro = nave
      m.camera.position.sub(m.controlli.target)
      m.controlli.target.set(0, 0, 0)
    }
  }, [punti, soste, nave])

  // Ricentra la vista su un punto, spostando la camera con lo stesso scarto.
  useEffect(() => {
    const m = motore.current
    if (!m || !centra) return
    const nuovo = new THREE.Vector3(...relativa(centra.su, m.centro))
    m.camera.position.add(nuovo.clone().sub(m.controlli.target))
    m.controlli.target.copy(nuovo)
  }, [centra])

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
    m.selezione = creaPunti([...relativa(selezionato, nave)], rgb('#ffffff'), [1.3], [FORMA.anello])
    m.scena.add(m.selezione)
  }, [selezionato, nave])

  return <div ref={contenitore} className="absolute inset-0 touch-none" />
}
