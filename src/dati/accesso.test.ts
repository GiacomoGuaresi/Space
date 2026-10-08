import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AccessoSupabase } from './accesso'

type Evento = 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED'

/** Un client finto con la sola parte `auth` che l'accesso usa. */
function clientFinto({
  sessione = null as object | null,
  errore = null as { code?: string } | null,
} = {}) {
  let ascolta: ((evento: Evento) => void) | undefined
  const unsubscribe = vi.fn()
  const auth = {
    getSession: vi.fn(async () => ({ data: { session: sessione } })),
    signInWithPassword: vi.fn(async () => ({ error: errore })),
    onAuthStateChange: vi.fn((richiamo: (evento: Evento) => void) => {
      ascolta = richiamo
      return { data: { subscription: { unsubscribe } } }
    }),
  }
  const client = { auth } as unknown as SupabaseClient
  return { client, auth, unsubscribe, emetti: (evento: Evento) => ascolta?.(evento) }
}

describe('AccessoSupabase', () => {
  it("riconosce la sessione già aperta, anche da un'altra app di casa", async () => {
    expect(await new AccessoSupabase(clientFinto({ sessione: {} }).client, 'a@b.it').haSessione()).toBe(true)
    expect(await new AccessoSupabase(clientFinto().client, 'a@b.it').haSessione()).toBe(false)
  })

  it("entra con l'email fissata e la passphrase come password", async () => {
    const { client, auth } = clientFinto()
    expect(await new AccessoSupabase(client, 'casa@esempio.it').entra('segreta')).toBe('dentro')
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'casa@esempio.it',
      password: 'segreta',
    })
  })

  it('distingue la passphrase sbagliata dagli altri errori', async () => {
    const sbagliata = clientFinto({ errore: { code: 'invalid_credentials' } })
    expect(await new AccessoSupabase(sbagliata.client, 'a@b.it').entra('x')).toBe('passphrase-sbagliata')

    vi.spyOn(console, 'error').mockImplementation(() => {})
    const rete = clientFinto({ errore: {} })
    expect(await new AccessoSupabase(rete.client, 'a@b.it').entra('x')).toBe('errore')
  })

  it('avvisa solo quando la sessione finisce, finché non si smette', () => {
    const { client, emetti, unsubscribe } = clientFinto()
    const avvisa = vi.fn()
    const smetti = new AccessoSupabase(client, 'a@b.it').quandoEsce(avvisa)

    emetti('SIGNED_IN')
    emetti('TOKEN_REFRESHED')
    expect(avvisa).not.toHaveBeenCalled()
    emetti('SIGNED_OUT')
    expect(avvisa).toHaveBeenCalledOnce()

    smetti()
    expect(unsubscribe).toHaveBeenCalledOnce()
  })
})
