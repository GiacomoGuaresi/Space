import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchPaziente } from './orologio'

const nelFuturo = () =>
  new Response(JSON.stringify({ code: 'PGRST303', message: 'JWT issued at future' }), { status: 401 })
const scaduto = () =>
  new Response(JSON.stringify({ code: 'PGRST303', message: 'JWT expired' }), { status: 401 })
const ok = () => new Response('[]', { status: 200 })

describe('fetchPaziente', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('riprova finché il token non smette di essere "nel futuro"', async () => {
    const base = vi.fn<typeof fetch>().mockResolvedValueOnce(nelFuturo()).mockResolvedValueOnce(ok())
    const risposta = fetchPaziente(base)('https://x/rest/v1/t')
    await vi.runAllTimersAsync()
    expect((await risposta).status).toBe(200)
    expect(base).toHaveBeenCalledTimes(2)
  })

  it('non riprova gli altri errori, come il token scaduto', async () => {
    const base = vi.fn<typeof fetch>().mockResolvedValue(scaduto())
    expect((await fetchPaziente(base)('https://x/rest/v1/t')).status).toBe(401)
    expect(base).toHaveBeenCalledTimes(1)
  })

  it('dopo qualche tentativo si arrende e restituisce l’errore', async () => {
    const base = vi.fn<typeof fetch>().mockImplementation(async () => nelFuturo())
    const risposta = fetchPaziente(base)('https://x/rest/v1/t')
    await vi.runAllTimersAsync()
    expect((await risposta).status).toBe(401)
    expect(base).toHaveBeenCalledTimes(5)
  })
})
