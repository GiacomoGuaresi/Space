// Il token appena rinnovato porta l'ora del server Auth; se l'orologio di
// PostgREST è un poco indietro lo rifiuta con "JWT issued at future" (PGRST303),
// finché i due orologi non si raggiungono. Si aspetta e si riprova, invece di
// mostrare l'errore e costringere a ricaricare la pagina.

const ATTESE_MS = [500, 1000, 2000, 4000]

/** Una `fetch` che ripete le richieste rifiutate per un token emesso "nel futuro". */
export function fetchPaziente(base: typeof fetch = (...a) => fetch(...a)): typeof fetch {
  return async (input, init) => {
    let risposta = await base(input, init)
    for (const attesa of ATTESE_MS) {
      if (!(await emessoNelFuturo(risposta))) break
      await new Promise((fatto) => setTimeout(fatto, attesa))
      risposta = await base(input, init)
    }
    return risposta
  }
}

async function emessoNelFuturo(risposta: Response): Promise<boolean> {
  if (risposta.status !== 401) return false
  try {
    const corpo = (await risposta.clone().json()) as { code?: string; message?: string }
    // PGRST303 copre anche il token scaduto, che riprovare non aggiusta.
    return corpo.code === 'PGRST303' && /future/i.test(corpo.message ?? '')
  } catch {
    return false
  }
}
