import { useState, type FormEvent } from 'react'
import { Orbit } from 'lucide-react'
import type { EsitoAccesso } from '../dati'

const avvisi: Record<Exclude<EsitoAccesso, 'dentro'>, string> = {
  'passphrase-sbagliata': 'Passphrase sbagliata.',
  errore: 'Non riesco a entrare: controlla la connessione e riprova.',
}

interface Props {
  onEntra: (passphrase: string) => Promise<EsitoAccesso>
}

/**
 * La schermata d'accesso: come nelle altre app, il solo campo passphrase. Si
 * vede una volta per dispositivo, poi la sessione resta nei cookie, condivisa
 * con le altre app di casa.
 */
export function Accesso({ onEntra }: Props) {
  const [passphrase, setPassphrase] = useState('')
  const [inCorso, setInCorso] = useState(false)
  const [avviso, setAvviso] = useState<string | null>(null)

  const invia = async (evento: FormEvent) => {
    evento.preventDefault()
    if (!passphrase || inCorso) return
    setInCorso(true)
    setAvviso(null)
    const esito = await onEntra(passphrase)
    // Se si è entrati questa schermata sparisce: non c'è altro da fare.
    if (esito === 'dentro') return
    setAvviso(avvisi[esito])
    setInCorso(false)
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-fondo p-3">
      <form className="flex w-full max-w-[300px] flex-col gap-2" onSubmit={invia}>
        <Orbit className="size-11 self-center text-nebula" aria-hidden="true" />
        <h1 className="mb-3 text-center text-lg font-semibold">Space</h1>
        <label className="text-xs text-testo-tenue" htmlFor="passphrase">
          Passphrase
        </label>
        <input
          id="passphrase"
          className="min-h-11 rounded-[11px] border border-bordo bg-pannello px-3 focus:outline-2 focus:-outline-offset-1 focus:outline-nebula"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={passphrase}
          onChange={(evento) => {
            setPassphrase(evento.target.value)
            setAvviso(null)
          }}
        />
        {avviso && (
          <p className="m-0 text-xs text-pericolo" role="alert">
            {avviso}
          </p>
        )}
        <button
          className="min-h-11 rounded-[11px] bg-nebula font-semibold text-fondo hover:bg-nebula-scura disabled:opacity-50"
          type="submit"
          disabled={!passphrase || inCorso}
        >
          {inCorso ? 'Entro…' : 'Entra'}
        </button>
      </form>
    </main>
  )
}

/** Quando non si riesce nemmeno a chiedere la passphrase (configurazione mancante). */
export function AccessoImpossibile() {
  return (
    <main className="grid min-h-dvh place-items-center bg-fondo p-3">
      <p className="m-0 text-center text-testo-tenue" role="alert">
        Non riesco a collegarmi al database condiviso.
      </p>
    </main>
  )
}
