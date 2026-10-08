import { useEffect, useState, type ReactNode } from 'react'
import { accesso, type Accesso as PortaAccesso } from '../dati'
import { Accesso, AccessoImpossibile } from './Accesso'

type Stato =
  | { fase: 'verifica' }
  | { fase: 'fuori'; porta: PortaAccesso }
  | { fase: 'dentro' }
  | { fase: 'errore' }

/**
 * Il cancello davanti all'app, come nelle altre app di casa: finché non c'è una sessione
 * mostra la passphrase, poi l'app. Se la sessione finisce mentre l'app è aperta
 * si torna alla passphrase.
 */
export function ConAccesso({ children }: { children: ReactNode }) {
  const [stato, setStato] = useState<Stato>({ fase: 'verifica' })

  useEffect(() => {
    let vivo = true
    let smetti: (() => void) | undefined
    try {
      const porta = accesso()
      smetti = porta.quandoEsce(() => {
        if (vivo) setStato({ fase: 'fuori', porta })
      })
      porta
        .haSessione()
        .then((dentro) => {
          if (vivo) setStato(dentro ? { fase: 'dentro' } : { fase: 'fuori', porta })
        })
        .catch((errore) => {
          console.error('Sessione non verificabile', errore)
          if (vivo) setStato({ fase: 'fuori', porta })
        })
    } catch (errore) {
      console.error('Accesso non disponibile', errore)
      setStato({ fase: 'errore' })
    }
    return () => {
      vivo = false
      smetti?.()
    }
  }, [])

  switch (stato.fase) {
    // Leggere i cookie è questione di un attimo: meglio niente che un lampo
    // della schermata d'accesso.
    case 'verifica':
      return null
    case 'errore':
      return <AccessoImpossibile />
    case 'fuori':
      return (
        <Accesso
          onEntra={async (passphrase) => {
            const esito = await stato.porta.entra(passphrase)
            if (esito === 'dentro') setStato({ fase: 'dentro' })
            return esito
          }}
        />
      )
    case 'dentro':
      return children
  }
}
