import { CATALOGO, NOMI_COLONIE, NOMI_RISORSE } from '../dominio/catalogo'
import { NOMI_CLASSI, NOMI_GENERI_NEBULOSA, type Dettagli, type Settore } from '../dominio/settore'
import { COLORI_RARITA } from './colori'
import { coordinate } from './formato'


const numero = (n: number, cifre = 0) => n.toLocaleString('it-IT', { maximumFractionDigits: cifre })

/** I dettagli del corpo, a parole: una riga per voce. */
function righeDettagli(d: Dettagli): [string, string][] {
  switch (d.tipo) {
    case 'asteroidi':
      return [['Composizione', d.composizione], ['Rocce grandi', numero(d.rocce)]]
    case 'nebulosa':
      return [['Genere', NOMI_GENERI_NEBULOSA[d.genere]], ['Densità', `${numero(d.densita * 100)} %`]]
    case 'stella':
      return [
        ['Classe', `${d.stella.classe} · ${NOMI_CLASSI[d.stella.classe]}`],
        ['Temperatura', `${numero(d.stella.temperatura)} K`],
        ['Raggio', `${numero(d.stella.raggio, 2)} soli`],
      ]
    case 'sistema':
      return [
        ['Stella', `${d.stella.classe} · ${NOMI_CLASSI[d.stella.classe]}`],
        ['Pianeti', d.pianeti.map((p) => `${p.nome.split(' ').at(-1)} ${p.tipo}${p.anelli ? ' con anelli' : ''}`).join(', ')],
      ]
    case 'gigante':
      return [['Raggio', `${numero(d.raggio, 1)} terre`], ['Anelli', d.anelli ? 'sì' : 'no']]
    case 'cometa':
      return [['Coda', `${numero(d.coda * 100)} %`]]
    case 'pulsar':
      return [['Periodo', `${numero(d.periodo, 3)} s`]]
    case 'buconero':
      return [['Massa', `${numero(d.massa)} soli`]]
    case 'relitto':
      return [['Forma', d.forma], ['Età', `${numero(d.eta)} mila anni`]]
    case 'wormhole':
      return [['Uscita', coordinate(d.uscita)]]
  }
}

/** La scheda del settore: cosa c'è, quanto vale, cosa ci si può fare. */
export function Scheda({ settore }: { settore: Settore }) {
  const { corpo, coordinate, distanzaBase } = settore
  const dove = `(${coordinate.x}, ${coordinate.y}, ${coordinate.z})`
  const lontano = `${numero(distanzaBase, 1)} settori dalla base`

  if (!corpo) {
    return (
      <section className="rounded-plancia border border-linea/70 bg-pannello/75 p-3 backdrop-blur">
        <h2 className="m-0 text-base font-semibold">{settore.base ? 'Base' : 'Spazio vuoto'}</h2>
        <p className="m-0 mt-0.5 text-xs text-testo-tenue">
          {dove} · {settore.base ? 'il punto di partenza' : lontano}
        </p>
      </section>
    )
  }

  const righe: [string, string][] = [
    ...righeDettagli(corpo.dettagli),
    ['Risorse', corpo.risorse.length ? corpo.risorse.map((r) => NOMI_RISORSE[r]).join(', ') : '—'],
    ['Ricchezza', `×${numero(corpo.ricchezza, 2)}`],
    ['Colonia', corpo.colonia ? NOMI_COLONIE[corpo.colonia] : '—'],
  ]
  if (corpo.effetto) righe.push(['Effetto', corpo.effetto])

  return (
    <section className="rounded-plancia border border-linea/70 bg-pannello/75 p-3 backdrop-blur">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="m-0 text-base font-semibold">{corpo.nome}</h2>
        <span className={`shrink-0 text-xs ${COLORI_RARITA[corpo.rarita].testo}`}>{corpo.rarita}</span>
      </div>
      <p className="m-0 mt-0.5 text-xs text-testo-tenue">
        {CATALOGO[corpo.tipo].nome} · {dove} · {lontano}
      </p>
      <dl className="m-0 mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        {righe.map(([voce, valore]) => (
          <div key={voce} className="contents">
            <dt className="text-testo-tenue">{voce}</dt>
            <dd className="m-0">{valore}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
