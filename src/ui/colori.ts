import type { Rarita } from '../dominio/catalogo'

/** I colori delle rarità: testo e pallino. */
export const COLORI_RARITA: Readonly<Record<Rarita, { testo: string; punto: string }>> = {
  comune: { testo: 'text-testo-tenue', punto: 'bg-testo-tenue' },
  'non comune': { testo: 'text-[#7fd1a8]', punto: 'bg-[#7fd1a8]' },
  rara: { testo: 'text-[#c39bff]', punto: 'bg-[#c39bff]' },
  leggendaria: { testo: 'text-[#ffc46b]', punto: 'bg-[#ffc46b]' },
}
