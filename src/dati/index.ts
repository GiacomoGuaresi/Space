// Punto d'ingresso dei dati: un solo client Supabase, sullo schema `space`
// del progetto di produzione di Grocery (doc/04-architettura.md).

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AccessoSupabase, type Accesso } from './accesso'
import { NaveSupabase } from './nave'
import { fetchPaziente } from './orologio'

export type { Accesso, EsitoAccesso } from './accesso'
export { ViaggioRifiutato, type MotivoRifiuto, type NaveSupabase, type Scoperta, type StatoRemoto } from './nave'

let connessione: { accesso: Accesso; nave: NaveSupabase } | null = null

/**
 * Il client è uno solo: accesso e query condividono la sessione.
 *
 * La sessione sta nei cookie con percorso `/`: le altre app di casa stanno sulla
 * stessa origine e sullo stesso progetto Supabase, quindi con lo stesso percorso
 * condividono la sessione.
 */
function connetti() {
  if (connessione) return connessione
  const url = import.meta.env.VITE_SUPABASE_URL
  const chiave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  const email = import.meta.env.VITE_SUPABASE_EMAIL
  if (!url || !chiave || !email) {
    throw new Error(
      'Mancano VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY o VITE_SUPABASE_EMAIL: vedi .env.example',
    )
  }
  const client = createBrowserClient(url, chiave, {
    cookieOptions: { path: '/' },
    global: { fetch: fetchPaziente() },
    db: { schema: 'space' },
  }) as unknown as SupabaseClient
  connessione = { accesso: new AccessoSupabase(client, email), nave: new NaveSupabase(client) }
  return connessione
}

/** Chi può entrare: serve la sessione aperta dalla passphrase. */
export function accesso(): Accesso {
  return connetti().accesso
}

/** La nave, i viaggi e le scoperte. */
export function nave(): NaveSupabase {
  return connetti().nave
}
