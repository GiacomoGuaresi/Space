// Accesso con passphrase, come nelle altre app di casa: lo stesso account
// condiviso, la passphrase ne è la password. Il resto dell'app conosce solo
// questa interfaccia; sotto c'è la sessione di Supabase, che le policy pretendono.

import type { SupabaseClient } from '@supabase/supabase-js'

export type EsitoAccesso = 'dentro' | 'passphrase-sbagliata' | 'errore'

export interface Accesso {
  /** Vero se su questo dispositivo si è già entrati (anche da un'altra app di casa). */
  haSessione(): Promise<boolean>
  entra(passphrase: string): Promise<EsitoAccesso>
  /** `avvisa` scatta quando la sessione finisce (revocata, scaduta). Restituisce come smettere. */
  quandoEsce(avvisa: () => void): () => void
}

export class AccessoSupabase implements Accesso {
  constructor(
    private readonly client: SupabaseClient,
    /** L'email dell'unico account: chi entra scrive solo la passphrase. */
    private readonly email: string,
  ) {}

  async haSessione(): Promise<boolean> {
    const { data } = await this.client.auth.getSession()
    return data.session !== null
  }

  async entra(passphrase: string): Promise<EsitoAccesso> {
    const { error } = await this.client.auth.signInWithPassword({
      email: this.email,
      password: passphrase,
    })
    if (!error) return 'dentro'
    if (error.code === 'invalid_credentials') return 'passphrase-sbagliata'
    console.error('Accesso non riuscito', error)
    return 'errore'
  }

  quandoEsce(avvisa: () => void): () => void {
    const { data } = this.client.auth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_OUT') avvisa()
    })
    return () => data.subscription.unsubscribe()
  }
}
