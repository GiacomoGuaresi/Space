// Suoni discreti della plancia (doc/11-interfaccia.md#stile--plancia-ambra):
// sintetizzati al momento, niente file. Solo se accesi nelle impostazioni.

import { impostazioni } from './preferenze'

export type Suono = 'clic' | 'partenza' | 'arrivo' | 'scoperta'

/** Note di ogni suono: frequenza (Hz), inizio e durata (s). */
const NOTE: Readonly<Record<Suono, [number, number, number][]>> = {
  clic: [[1400, 0, 0.03]],
  partenza: [
    [330, 0, 0.18],
    [494, 0.12, 0.3],
  ],
  arrivo: [
    [494, 0, 0.16],
    [392, 0.13, 0.32],
  ],
  scoperta: [
    [523, 0, 0.14],
    [659, 0.1, 0.14],
    [784, 0.2, 0.36],
  ],
}

let contesto: AudioContext | null = null

export function suona(suono: Suono) {
  if (!impostazioni().suoni) return
  try {
    contesto ??= new AudioContext()
    const adesso = contesto.currentTime
    for (const [frequenza, inizio, durata] of NOTE[suono]) {
      const oscillatore = contesto.createOscillator()
      const volume = contesto.createGain()
      oscillatore.type = suono === 'clic' ? 'square' : 'sine'
      oscillatore.frequency.value = frequenza
      volume.gain.setValueAtTime(0, adesso + inizio)
      volume.gain.linearRampToValueAtTime(suono === 'clic' ? 0.03 : 0.08, adesso + inizio + 0.01)
      volume.gain.exponentialRampToValueAtTime(0.0001, adesso + inizio + durata)
      oscillatore.connect(volume).connect(contesto.destination)
      oscillatore.start(adesso + inizio)
      oscillatore.stop(adesso + inizio + durata + 0.02)
    }
  } catch {
    // Niente audio su questo dispositivo: si resta in silenzio.
  }
}
