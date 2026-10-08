import { cambiaImpostazioni, useImpostazioni, type Movimento } from './impostazioni'
import { Etichetta, Pannello } from './plancia'
import { suona } from './suoni'

const MOVIMENTI: readonly { valore: Movimento; nome: string }[] = [
  { valore: 'sistema', nome: 'Come il sistema' },
  { valore: 'ridotto', nome: 'Riduci movimento' },
  { valore: 'pieno', nome: 'Tutto animato' },
]

/** Le impostazioni di questo dispositivo: suoni, animazioni, account. */
export function Impostazioni() {
  const { suoni, movimento } = useImpostazioni()
  return (
    <Pannello className="flex flex-col gap-4 p-3.5" etichetta="Impostazioni">
      <h1 className="m-0 text-base font-semibold tracking-[0.2em] uppercase">Impostazioni</h1>

      <label className="flex min-h-11 items-center justify-between gap-3">
        <span className="flex flex-col">
          <span className="text-sm">Suoni</span>
          <span className="text-xs text-testo-tenue">Clic, partenza, arrivo, scoperta: discreti.</span>
        </span>
        <input
          type="checkbox"
          className="size-5 accent-ambra"
          checked={suoni}
          onChange={(e) => {
            cambiaImpostazioni({ suoni: e.target.checked })
            if (e.target.checked) suona('scoperta')
          }}
        />
      </label>

      <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
        <legend className="mb-1.5 p-0">
          <Etichetta>Animazioni</Etichetta>
        </legend>
        {MOVIMENTI.map(({ valore, nome }) => (
          <label key={valore} className="flex min-h-10 items-center gap-2.5 text-sm">
            <input
              type="radio"
              name="movimento"
              className="size-4 accent-ambra"
              checked={movimento === valore}
              onChange={() => cambiaImpostazioni({ movimento: valore })}
            />
            {nome}
          </label>
        ))}
        <span className="text-xs text-testo-tenue">Riducendo il movimento la camera smette di girare da sola e le transizioni si spengono.</span>
      </fieldset>

      <div className="flex flex-col gap-1 border-t border-separatore pt-3">
        <Etichetta>Account</Etichetta>
        <span className="text-xs text-testo-tenue">
          L'account di casa, condiviso con le altre app: si esce da lì, non da qui. Le impostazioni valgono solo su questo
          dispositivo.
        </span>
      </div>
    </Pannello>
  )
}
