import type { Rarita } from '../dominio/catalogo'

/**
 * Le rarità si distinguono per forma e colore (doc/11-interfaccia.md): il
 * simbolo, la classe del testo e lo stesso colore per la mappa 3D.
 */
export const COLORI_RARITA: Readonly<Record<Rarita, { simbolo: string; testo: string; esadecimale: string }>> = {
  comune: { simbolo: '●', testo: 'text-[#d9cbb0]', esadecimale: '#d9cbb0' },
  'non comune': { simbolo: '◆', testo: 'text-[#7fd1c7]', esadecimale: '#7fd1c7' },
  rara: { simbolo: '★', testo: 'text-[#c4a2ff]', esadecimale: '#c4a2ff' },
  leggendaria: { simbolo: '✦', testo: 'text-[#ffb547]', esadecimale: '#ffb547' },
}
