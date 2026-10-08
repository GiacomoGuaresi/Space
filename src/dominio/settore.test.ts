import { describe, expect, it } from 'vitest'
import { DISTANZA_LONTANA, PIENEZZA, TIPI, pesi, ricchezzaMedia, type TipoCorpo } from './catalogo'
import { piuVicino } from './ricerca'
import { distanza, settore, tipoSettore, type Coordinate } from './settore'

/** I tipi di un cubo di lato 2·lato+1 attorno a `centro`. */
function campione(centro: Coordinate, lato: number) {
  const conti = new Map<TipoCorpo | null, number>()
  let totale = 0
  for (let dx = -lato; dx <= lato; dx++)
    for (let dy = -lato; dy <= lato; dy++)
      for (let dz = -lato; dz <= lato; dz++) {
        const tipo = tipoSettore({ x: centro.x + dx, y: centro.y + dy, z: centro.z + dz })
        conti.set(tipo, (conti.get(tipo) ?? 0) + 1)
        totale++
      }
  return { conti, totale }
}

describe('pesi', () => {
  it('alla base non ci sono buchi neri, relitti né varchi', () => {
    const vicini = pesi(0)
    expect(vicini.buconero).toBe(0)
    expect(vicini.relitto).toBe(0)
    expect(vicini.wormhole).toBe(0)
  })

  it('lontano ci sono tutti i corpi, e oltre la soglia i pesi non cambiano', () => {
    const lontani = pesi(DISTANZA_LONTANA)
    for (const tipo of TIPI) expect(lontani[tipo]).toBeGreaterThan(0)
    expect(pesi(DISTANZA_LONTANA * 10)).toEqual(lontani)
  })

  it('i rari compaiono solo oltre la loro soglia', () => {
    for (const [tipo, soglia] of [
      ['pulsar', 25],
      ['buconero', 80],
      ['relitto', 80],
      ['wormhole', 150],
    ] as const) {
      expect(pesi(soglia - 0.5)[tipo]).toBe(0)
      expect(pesi(soglia + 1)[tipo]).toBeGreaterThan(0)
    }
  })

  it('i rari crescono con la distanza', () => {
    expect(pesi(250).buconero).toBeGreaterThan(pesi(100).buconero)
    expect(pesi(250).wormhole).toBeGreaterThan(pesi(160).wormhole)
  })
})

describe('ricchezzaMedia', () => {
  it('vale 1 alla base e cresce sempre più piano', () => {
    expect(ricchezzaMedia(0)).toBe(1)
    expect(ricchezzaMedia(100)).toBe(2)
    expect(ricchezzaMedia(400)).toBe(3)
  })
})

describe('settore', () => {
  it('dà sempre lo stesso contenuto per le stesse coordinate', () => {
    for (const c of [{ x: 3, y: -4, z: 9 }, { x: 600, y: 2, z: -300 }]) {
      expect(settore(c)).toEqual(settore(c))
    }
  })

  it('la base è vuota', () => {
    const base = settore({ x: 0, y: 0, z: 0 })
    expect(base.base).toBe(true)
    expect(base.corpo).toBeNull()
  })

  it('circa un settore su dieci non è vuoto', () => {
    const { conti, totale } = campione({ x: 1000, y: 0, z: 0 }, 12)
    const pieni = 1 - (conti.get(null) ?? 0) / totale
    expect(pieni).toBeGreaterThan(PIENEZZA * 0.9)
    expect(pieni).toBeLessThan(PIENEZZA * 1.1)
  })

  it('lontano dalla base si trovano tutti i tipi', () => {
    const { conti } = campione({ x: 2000, y: -2000, z: 500 }, 14)
    for (const tipo of TIPI) expect(conti.get(tipo) ?? 0).toBeGreaterThan(0)
  })

  it('vicino alla base non ci sono rari', () => {
    const { conti } = campione({ x: 0, y: 0, z: 0 }, 6)
    expect(conti.get('buconero') ?? 0).toBe(0)
    expect(conti.get('wormhole') ?? 0).toBe(0)
  })

  it('tipoSettore e settore concordano', () => {
    for (let x = -20; x <= 20; x++) {
      const c = { x, y: 7, z: -3 }
      expect(settore(c).corpo?.tipo ?? null).toBe(tipoSettore(c))
    }
  })

  it('ogni corpo ha nome, ricchezza e dettagli del suo tipo', () => {
    let visti = 0
    for (let x = 900; x < 1400 && visti < 300; x++) {
      const { corpo } = settore({ x, y: 50, z: -20 })
      if (!corpo) continue
      visti++
      expect(corpo.nome.length).toBeGreaterThan(2)
      expect(corpo.ricchezza).toBeGreaterThan(0)
      expect(corpo.dettagli.tipo).toBe(corpo.tipo)
    }
    expect(visti).toBeGreaterThan(20)
  })

  it('i pianeti di un sistema hanno orbite crescenti e nomi numerati', () => {
    const dove = piuVicino({ x: 100, y: 100, z: 100 }, 'sistema')!
    const { corpo } = settore(dove)
    if (corpo?.dettagli.tipo !== 'sistema') throw new Error('atteso un sistema')
    const { pianeti } = corpo.dettagli
    expect(pianeti.length).toBeGreaterThan(0)
    expect(pianeti[0].nome).toBe(`${corpo.nome} I`)
    for (let i = 1; i < pianeti.length; i++) expect(pianeti[i].orbita).toBeGreaterThan(pianeti[i - 1].orbita)
  })

  it("l'uscita di un varco è lontana e sempre la stessa", () => {
    const dove = piuVicino({ x: 3000, y: 0, z: 0 }, 'wormhole', 40)!
    const { corpo } = settore(dove)
    if (corpo?.dettagli.tipo !== 'wormhole') throw new Error('atteso un varco')
    const d = distanza(dove, corpo.dettagli.uscita)
    expect(d).toBeGreaterThan(290)
    expect(d).toBeLessThan(1510)
    expect(settore(dove).corpo).toEqual(corpo)
  })

  // Valori fissati: se cambiano, cambia l'universo (doc/03-universo.md).
  it('non cambia per sbaglio', () => {
    const vicino = piuVicino({ x: 0, y: 0, z: 0 }, 'qualsiasi')!
    const { corpo } = settore(vicino)
    expect({ vicino, tipo: corpo?.tipo, nome: corpo?.nome }).toMatchInlineSnapshot(`
      {
        "nome": "Briciana",
        "tipo": "stella",
        "vicino": {
          "x": 0,
          "y": -1,
          "z": 1,
        },
      }
    `)
  })
})

describe('piuVicino', () => {
  it('trova il corpo più vicino del tipo chiesto', () => {
    const da = { x: 40, y: -10, z: 5 }
    const trovato = piuVicino(da, 'stella')!
    expect(tipoSettore(trovato)).toBe('stella')
    const d = distanza(da, trovato)
    // Nessuna stella più vicina, controllando a forza bruta.
    const r = Math.ceil(d)
    for (let dx = -r; dx <= r; dx++)
      for (let dy = -r; dy <= r; dy++)
        for (let dz = -r; dz <= r; dz++) {
          if (dx === 0 && dy === 0 && dz === 0) continue
          const qui = { x: da.x + dx, y: da.y + dy, z: da.z + dz }
          if (distanza(da, qui) < d) expect(tipoSettore(qui)).not.toBe('stella')
        }
  })

  it('restituisce null se non trova nulla entro il raggio', () => {
    expect(piuVicino({ x: 0, y: 0, z: 0 }, 'wormhole', 3)).toBeNull()
  })
})
