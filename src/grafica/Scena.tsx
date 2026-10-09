import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { casuale, derivato } from '../dominio/casuale'
import type { Settore } from '../dominio/settore'
import { libera, type Contenuto } from './comune'
import { GENERATORI } from './generatori'
import { creaSfondo } from './sfondo'
import { movimentoRidotto } from '../ui/impostazioni'
import { Misuratore, qualitaAutomatica, qualitaIniziale, resa, ricordaQualita } from './qualita'

/** Le sequenze della grafica, separate da quelle del dominio (dominio/settore.ts). */
const PARTE_GRAFICA = 10
const PARTE_SFONDO = 11

interface Motore {
  renderer: THREE.WebGLRenderer
  composer: EffectComposer
  camera: THREE.PerspectiveCamera
  controlli: OrbitControls
  scena: THREE.Scene
  attuale: { contenuto: Contenuto; sfondo: ReturnType<typeof creaSfondo> } | null
}

/**
 * La vista di un settore a tutto schermo: lo sfondo, il corpo e il bloom che
 * allarga le luci più forti. Si gira attorno al corpo trascinando e si zooma
 * con la rotella o le dita; da fermo la camera gira da sola, piano.
 */
export function Scena({ settore, inViaggio = false }: { settore: Settore; inViaggio?: boolean }) {
  const contenitore = useRef<HTMLDivElement>(null)
  const motore = useRef<Motore | null>(null)

  // Il motore si crea una volta sola: cambiare settore cambia solo il contenuto.
  useEffect(() => {
    const dove = contenitore.current
    if (!dove) return

    // La qualità (qualita.ts): l'ultima scelta qui, che in automatico scende se i fotogrammi sono pochi.
    const misura = new Misuratore(qualitaIniziale())
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(resa(misura.qualita).pixel)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1
    dove.appendChild(renderer.domElement)

    const scena = new THREE.Scene()
    scena.background = new THREE.Color(0x000000)
    const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 3000)
    const controlli = new OrbitControls(camera, renderer.domElement)
    controlli.enableDamping = true
    controlli.enablePan = false
    controlli.autoRotate = !movimentoRidotto()
    controlli.autoRotateSpeed = 0.25

    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scena, camera))
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.7, 0.5, 0.85)
    bloom.enabled = resa(misura.qualita).bloom
    composer.addPass(bloom)
    composer.addPass(new OutputPass())

    const ridimensiona = () => {
      const { clientWidth: larghezza, clientHeight: altezza } = dove
      renderer.setPixelRatio(resa(misura.qualita).pixel)
      renderer.setSize(larghezza, altezza)
      composer.setPixelRatio(resa(misura.qualita).pixel)
      composer.setSize(larghezza, altezza)
      camera.aspect = larghezza / altezza
      camera.updateProjectionMatrix()
    }
    ridimensiona()
    const osservatore = new ResizeObserver(ridimensiona)
    osservatore.observe(dove)

    const m: Motore = { renderer, composer, camera, controlli, scena, attuale: null }
    motore.current = m
    const orologio = new THREE.Clock()
    let prima = 0
    renderer.setAnimationLoop(() => {
      const tempo = orologio.getElapsedTime()
      // Fotogrammi troppo lenti: si scende di qualità, e qui lo si ricorda per la prossima volta.
      const nuova = qualitaAutomatica() && prima > 0 ? misura.campione(tempo - prima) : null
      prima = tempo
      if (nuova) {
        ricordaQualita(nuova)
        bloom.enabled = resa(nuova).bloom
        ridimensiona()
      }
      controlli.update()
      if (m.attuale) {
        // Lo sfondo segue la camera: è "all'infinito", non ci si avvicina mai.
        m.attuale.sfondo.oggetto.position.copy(camera.position)
        m.attuale.sfondo.aggiorna(tempo, renderer.getPixelRatio())
        m.attuale.contenuto.aggiorna(tempo, camera)
      }
      composer.render()
    })

    return () => {
      renderer.setAnimationLoop(null)
      osservatore.disconnect()
      if (m.attuale) {
        libera(m.attuale.contenuto.oggetto)
        libera(m.attuale.sfondo.oggetto)
      }
      controlli.dispose()
      composer.dispose()
      renderer.dispose()
      renderer.domElement.remove()
      motore.current = null
    }
  }, [])

  useEffect(() => {
    const m = motore.current
    if (!m) return
    if (m.attuale) {
      m.scena.remove(m.attuale.contenuto.oggetto, m.attuale.sfondo.oggetto)
      libera(m.attuale.contenuto.oggetto)
      libera(m.attuale.sfondo.oggetto)
    }
    const generatore = GENERATORI[inViaggio ? 'viaggio' : (settore.corpo?.tipo ?? 'vuoto')]
    const contenuto = generatore(settore, casuale(derivato(settore.seed, PARTE_GRAFICA)))
    const sfondo = creaSfondo(casuale(derivato(settore.seed, PARTE_SFONDO)))
    m.scena.add(sfondo.oggetto, contenuto.oggetto)
    m.attuale = { contenuto, sfondo }

    // L'inquadratura è pensata per uno schermo largo: su uno stretto (telefono in
    // verticale) la camera si allontana, così il corpo entra anche in larghezza.
    const allarga = m.camera.aspect < 1 ? Math.min(2.2, 0.9 / m.camera.aspect) : 1
    const { vicino, lontano } = contenuto.inquadratura
    const distanza = contenuto.inquadratura.distanza * allarga
    const altezza = contenuto.inquadratura.altezza * allarga
    m.camera.position.set(0, altezza, Math.sqrt(Math.max(1, distanza * distanza - altezza * altezza)))
    m.controlli.target.set(0, 0, 0)
    m.controlli.minDistance = vicino
    m.controlli.maxDistance = lontano * allarga
    const fissa = contenuto.inquadratura.fissa === true
    m.controlli.enabled = !fissa
    m.controlli.autoRotate = !fissa && !movimentoRidotto()
    m.controlli.update()
  }, [settore, inViaggio])

  return <div ref={contenitore} className="absolute inset-0 touch-none" aria-hidden="true" />
}
