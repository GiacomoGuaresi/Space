import { useEffect, useRef } from 'react'
import * as THREE from 'three'

/** Quante stelle, e a che distanza massima dalla camera. */
const STELLE = 2500
const RAGGIO = 400

/**
 * Un campo di stelle che ruota piano, a tutto schermo: la prova che three.js
 * gira nella build e sul telefono (M0). In M1 lo sostituisce lo sfondo comune
 * seminato dal settore (doc/03-universo.md); qui la casualità non conta.
 */
export function Cielo() {
  const contenitore = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const dove = contenitore.current
    if (!dove) return

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    dove.appendChild(renderer.domElement)

    const scena = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, RAGGIO * 2)

    const posizioni = new Float32Array(STELLE * 3)
    for (let i = 0; i < posizioni.length; i++) posizioni[i] = (Math.random() * 2 - 1) * RAGGIO
    const geometria = new THREE.BufferGeometry()
    geometria.setAttribute('position', new THREE.BufferAttribute(posizioni, 3))
    const materiale = new THREE.PointsMaterial({ color: 0xdbe4f5, size: 1.4, sizeAttenuation: true })
    const stelle = new THREE.Points(geometria, materiale)
    scena.add(stelle)

    const ridimensiona = () => {
      const { clientWidth: larghezza, clientHeight: altezza } = dove
      renderer.setSize(larghezza, altezza)
      camera.aspect = larghezza / altezza
      camera.updateProjectionMatrix()
    }
    ridimensiona()
    const osservatore = new ResizeObserver(ridimensiona)
    osservatore.observe(dove)

    const fermo = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    renderer.setAnimationLoop((tempo) => {
      if (!fermo) stelle.rotation.y = tempo * 0.00002
      renderer.render(scena, camera)
    })

    return () => {
      renderer.setAnimationLoop(null)
      osservatore.disconnect()
      geometria.dispose()
      materiale.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div ref={contenitore} className="absolute inset-0" aria-hidden="true" />
}
