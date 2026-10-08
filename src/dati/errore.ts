/** Un errore di Supabase, con un messaggio che dice cosa non è riuscito. */
export function fallita(cosa: string, errore: { message: string; code?: string }): Error {
  console.error(cosa, errore)
  return new Error(`${cosa}: ${errore.message}`, { cause: errore })
}
