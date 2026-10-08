import { CATALOGO, NOMI_COLONIE, NOMI_RISORSE } from '../dominio/catalogo'
import { NOMI_CLASSI, NOMI_GENERI_NEBULOSA, type Dettagli, type Settore } from '../dominio/settore'
import type { ReactNode } from 'react'
import { ricchezzaMedia } from '../dominio/catalogo'
import { COLORI_RARITA } from './colori'
import { coordinate, coordinatePlancia } from './formato'
import { Etichetta, Info, SimboloRarita } from './plancia'


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
  const dove = coordinatePlancia(coordinate)
  const lontano = `${numero(distanzaBase, 1)} sett. dalla base madre`

  if (!corpo) {
    return (
      <div className="flex flex-col gap-1">
        <Etichetta>{settore.base ? 'Base madre' : 'Nessun corpo'}</Etichetta>
        <h2 className="m-0 text-xl font-semibold tracking-[0.1em] uppercase">{settore.base ? 'Base madre' : 'Spazio vuoto'}</h2>
        <p className="m-0 text-[13px] text-testo-tenue">
          <span className="cifre">{dove}</span> · {settore.base ? 'il punto di partenza' : lontano}
        </p>
      </div>
    )
  }

  const media = ricchezzaMedia(distanzaBase)
  const righe: [string, ReactNode][] = [
    ...righeDettagli(corpo.dettagli),
    ['Risorse', corpo.risorse.length ? corpo.risorse.map((r) => NOMI_RISORSE[r]).join(', ') : '—'],
    [
      'Ricchezza',
      <span className="inline-flex items-center gap-1">
        <span className="cifre">×{numero(corpo.ricchezza, 2)}</span>
        <Info
          titolo="Ricchezza"
          wiki={corpo.tipo}
          formula={`media 1 + √(${numero(distanzaBase, 1)} / 100) = ${numero(media, 2)}, × ${numero(corpo.ricchezza / media, 2)} per questo corpo`}
          esatto={numero(corpo.ricchezza, 4)}
        />
      </span>,
    ],
    ['Colonia', corpo.colonia ? NOMI_COLONIE[corpo.colonia] : '—'],
  ]
  if (corpo.effetto) righe.push(['Effetto', corpo.effetto])
  const { testo } = COLORI_RARITA[corpo.rarita]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Etichetta className={testo}>
          <SimboloRarita rarita={corpo.rarita} /> {CATALOGO[corpo.tipo].nome} · {corpo.rarita}
        </Etichetta>
        <h2 className="m-0 text-xl font-semibold tracking-[0.1em] uppercase">{corpo.nome}</h2>
        <p className="m-0 text-[13px] text-testo-tenue">
          <span className="cifre">{dove}</span> · {lontano}
        </p>
      </div>
      <dl className="m-0 grid grid-cols-2 gap-x-3.5 gap-y-2.5 border-y border-separatore py-2.5">
        {righe.map(([voce, valore]) => (
          <div key={voce} className="flex min-w-0 flex-col gap-0.5">
            <dt className="etichetta">{voce}</dt>
            <dd className="m-0 text-[13px]">{valore}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
