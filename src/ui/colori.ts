import type { Rarita } from '../dominio/catalogo'

/** I colori delle rarità: testo, pallino e lo stesso colore per la mappa 3D. */
export const COLORI_RARITA: Readonly<Record<Rarita, { testo: string; punto: string; esadecimale: string }>> = {
  comune: { testo: 'text-testo-tenue', punto: 'bg-testo-tenue', esadecimale: '#8796b3' },
  'non comune': { testo: 'text-[#7fd1a8]', punto: 'bg-[#7fd1a8]', esadecimale: '#7fd1a8' },
  rara: { testo: 'text-[#c39bff]', punto: 'bg-[#c39bff]', esadecimale: '#c39bff' },
  leggendaria: { testo: 'text-[#ffc46b]', punto: 'bg-[#ffc46b]', esadecimale: '#ffc46b' },
}
