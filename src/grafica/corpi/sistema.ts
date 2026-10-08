import * as THREE from 'three'
import type { Generatore } from '../comune'
import { creaAnelli, creaPianeta, creaStella } from '../pezzi'

/**
 * Sistema planetario: la stella al centro e i pianeti in orbita. Le orbite
 * vere andrebbero da 0,3 a decine di UA: in scena si comprimono col logaritmo,
 * così si vedono tutte.
 */
export const sistema: Generatore = (settore, c) => {
  if (settore.corpo?.dettagli.tipo !== 'sistema') throw new Error('Atteso un sistema')
  const { stella: datiStella, pianeti } = settore.corpo.dettagli
  const gruppo = new THREE.Group()
  const raggioStella = 1.4 * Math.cbrt(datiStella.raggio)
  const stella = creaStella(datiStella, raggioStella, c)
  gruppo.add(stella.oggetto)

  const centro = new THREE.Vector3(0, 0, 0)
  const orbite = pianeti.map((p) => raggioStella * 3 + Math.log2(1 + p.orbita / 0.3) * 4)
  const inclinazione = c.tra(-0.08, 0.08)

  const corpi = pianeti.map((dati, i) => {
    const raggio = dati.tipo === 'gassoso' ? 0.5 + dati.raggio * 0.09 : 0.18 + dati.raggio * 0.22
    const pianeta = creaPianeta(dati.tipo, raggio, c, centro)
    const perno = new THREE.Group()
    perno.add(pianeta.oggetto)
    if (dati.anelli) {
      const anelli = creaAnelli(raggio, pianeta.colore, c, centro)
      anelli.rotation.x = -Math.PI / 2 + c.tra(-0.5, 0.5)
      perno.add(anelli)
    }
    gruppo.add(perno)

    // L'orbita, appena accennata.
    const punti = Array.from({ length: 129 }, (_, k) => {
      const a = (k / 128) * Math.PI * 2
      return new THREE.Vector3(Math.cos(a) * orbite[i], 0, Math.sin(a) * orbite[i])
    })
    const linea = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(punti),
      new THREE.LineBasicMaterial({ color: 0x5a6a8a, transparent: true, opacity: 0.25 }),
    )
    gruppo.add(linea)

    // Terza legge di Keplero, accelerata: i pianeti interni girano più in fretta.
    const velocita = 0.6 / Math.pow(orbite[i] / orbite[0], 1.5)
    return { dati, pianeta, perno, raggio: orbite[i], velocita }
  })
  gruppo.rotation.x = inclinazione

  const esterna = orbite.at(-1) ?? raggioStella * 4
  return {
    oggetto: gruppo,
    inquadratura: { distanza: esterna * 1.5, altezza: esterna * 0.55, vicino: raggioStella * 2, lontano: esterna * 4 },
    aggiorna(tempo, camera) {
      stella.aggiorna(tempo, camera)
      for (const corpo of corpi) {
        const a = corpo.dati.fase + tempo * corpo.velocita * 0.1
        corpo.perno.position.set(Math.cos(a) * corpo.raggio, 0, Math.sin(a) * corpo.raggio)
        corpo.pianeta.aggiorna(tempo)
      }
    },
  }
}
