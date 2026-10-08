import { useEffect, useState, type FormEvent } from 'react'
import { ChevronDown, ChevronUp, Crosshair, Home, Search } from 'lucide-react'
import { CATALOGO, TIPI, type TipoCorpo } from '../dominio/catalogo'
import { piuVicino } from '../dominio/ricerca'
import { BASE, type Coordinate, type Settore } from '../dominio/settore'
import { vaiA } from './indirizzo'

const ASSI = ['x', 'y', 'z'] as const

const pulsante =
  'grid min-h-9 min-w-9 place-items-center rounded-lg border border-bordo/70 bg-pannello/75 px-2 text-xs backdrop-blur hover:border-nebula hover:text-nebula disabled:opacity-40'

/**
 * I comandi dell'osservatorio (M1): si scrivono le coordinate, ci si sposta di
 * un settore per asse, si cerca il corpo più vicino di un tipo. Nessuna nave e
 * nessuna attesa: è uno strumento per guardare l'universo.
 */
export function Osservatorio({ settore }: { settore: Settore }) {
  const { coordinate } = settore
  const [bozza, setBozza] = useState(() => ({ ...coordinate }))
  const [tipo, setTipo] = useState<TipoCorpo | 'qualsiasi'>('qualsiasi')
  const [avviso, setAvviso] = useState<string | null>(null)

  // Quando il settore cambia da fuori (frecce, ricerca, indirizzo) i campi lo seguono.
  useEffect(() => setBozza({ ...coordinate }), [coordinate])

  const vai = (evento: FormEvent) => {
    evento.preventDefault()
    vaiA(bozza)
  }

  const sposta = (asse: (typeof ASSI)[number], passo: number) => vaiA({ ...coordinate, [asse]: coordinate[asse] + passo })

  const cerca = () => {
    const trovato: Coordinate | null = piuVicino(coordinate, tipo)
    if (trovato) {
      setAvviso(null)
      vaiA(trovato)
    } else {
      setAvviso(
        `Nessun ${tipo === 'qualsiasi' ? 'corpo' : CATALOGO[tipo].nome.toLowerCase()} entro 25 settori. Prova più lontano dalla base.`,
      )
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <form className="flex flex-wrap items-end gap-1.5" onSubmit={vai}>
        {ASSI.map((asse) => (
          <label key={asse} className="flex flex-col gap-0.5 text-[11px] text-testo-tenue">
            {asse.toUpperCase()}
            <div className="flex">
              <input
                className="h-9 w-[4.25rem] rounded-l-lg border border-bordo/70 bg-pannello/75 px-2 text-testo tabular-nums backdrop-blur focus:outline-2 focus:-outline-offset-1 focus:outline-nebula"
                type="number"
                inputMode="numeric"
                step={1}
                value={Number.isNaN(bozza[asse]) ? '' : bozza[asse]}
                onChange={(e) => setBozza({ ...bozza, [asse]: Math.trunc(e.target.valueAsNumber) })}
              />
              <div className="flex flex-col">
                <button
                  type="button"
                  className="grid h-[18px] w-6 place-items-center rounded-tr-lg border border-l-0 border-bordo/70 bg-pannello/75 hover:text-nebula"
                  aria-label={`${asse} + 1`}
                  onClick={() => sposta(asse, 1)}
                >
                  <ChevronUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  className="grid h-[18px] w-6 place-items-center rounded-br-lg border border-t-0 border-l-0 border-bordo/70 bg-pannello/75 hover:text-nebula"
                  aria-label={`${asse} − 1`}
                  onClick={() => sposta(asse, -1)}
                >
                  <ChevronDown className="size-3.5" />
                </button>
              </div>
            </div>
          </label>
        ))}
        <button className={`${pulsante} font-semibold`} type="submit" disabled={ASSI.some((a) => Number.isNaN(bozza[a]))}>
          Vai
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-1.5">
        <select
          className="h-9 rounded-lg border border-bordo/70 bg-pannello/75 px-2 text-xs backdrop-blur"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoCorpo | 'qualsiasi')}
          aria-label="Tipo di corpo da cercare"
        >
          <option value="qualsiasi">Qualsiasi corpo</option>
          {TIPI.map((t) => (
            <option key={t} value={t}>
              {CATALOGO[t].nome}
            </option>
          ))}
        </select>
        <button className={`${pulsante} flex gap-1.5`} type="button" onClick={cerca}>
          <Search className="size-3.5" />
          Più vicino
        </button>
        <button className={pulsante} type="button" aria-label="Torna alla base" title="Torna alla base" onClick={() => vaiA(BASE)}>
          <Home className="size-4" />
        </button>
        <button
          className={pulsante}
          type="button"
          title="Un settore a caso, lontano"
          aria-label="Un settore a caso, lontano"
          // Qui il caso non genera nulla: sceglie solo dove guardare.
          onClick={() => {
            const a = () => Math.round((Math.random() * 2 - 1) * 1500)
            vaiA({ x: a(), y: a(), z: a() })
          }}
        >
          <Crosshair className="size-4" />
        </button>
      </div>
      {avviso && (
        <p className="m-0 max-w-sm rounded-lg bg-pannello/75 px-2 py-1 text-xs text-pericolo backdrop-blur" role="alert">
          {avviso}
        </p>
      )}
    </div>
  )
}
