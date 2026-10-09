import { describe, expect, it } from 'vitest'
import { corpiNoti } from '../dominio/mappa'
import { scansione, type Rilevamento } from '../dominio/navigazione'
import { lavoroNoti, richiedi, Superato, type Lavoro } from './scansioni'

// Qui non ci sono worker: la coda fa i lavori sul thread, a turno, con le stesse regole.
const centro = { x: 3, y: -2, z: 5 }
const lavoro = (raggio: number): Lavoro => ({ tipo: 'scansione', centro, raggio, tipi: null })

describe('coda delle scansioni', () => {
  it('dà lo stesso risultato della scansione diretta, e lo stesso lavoro si fa una volta sola', async () => {
    const [a, b] = await Promise.all([richiedi<Rilevamento[]>(lavoro(6)), richiedi<Rilevamento[]>(lavoro(6))])
    expect(a).toBe(b)
    expect(a).toEqual(scansione(centro, 6))
    // Dopo: dalla memoria.
    expect(await richiedi(lavoro(6))).toBe(a)
  })

  it('un lavoro nuovo sullo stesso canale scarta quelli ancora in coda', async () => {
    const primo = richiedi(lavoro(7), { canale: 'prova' })
    // Il rifiuto arriva subito, all'arrivo del terzo: lo si raccoglie subito.
    const secondo = richiedi(lavoro(8), { canale: 'prova' }).catch((e: unknown) => e)
    const terzo = richiedi(lavoro(9), { canale: 'prova' })
    // Il primo è già partito; il secondo era ancora in coda.
    await expect(primo).resolves.toBeDefined()
    expect(await secondo).toBeInstanceOf(Superato)
    await expect(terzo).resolves.toEqual(scansione(centro, 9))
  })

  it('passa avanti i lavori ad alta priorità', async () => {
    const ordine: string[] = []
    const occupa = richiedi(lavoro(4.5)).then(() => ordine.push('occupa'))
    const bassa = richiedi(lavoro(5.5)).then(() => ordine.push('bassa'))
    const alta = richiedi(lavoro(6.5), { priorita: 'alta' }).then(() => ordine.push('alta'))
    await Promise.all([occupa, bassa, alta])
    expect(ordine).toEqual(['occupa', 'alta', 'bassa'])
  })

  it('calcola i corpi noti come la mappa', async () => {
    const soste = [
      { centro, raggio: 5, livello: 8, istante: new Date(0) },
      { centro: { x: 6, y: -2, z: 5 }, raggio: 5, livello: 8, istante: new Date(1) },
    ]
    const scoperte = [{ coordinate: { x: 0, y: 0, z: 1 }, tipo: 'cometa' as const }]
    expect(await richiedi(lavoroNoti(soste, scoperte))).toEqual(corpiNoti(soste, scoperte))
  })
})
