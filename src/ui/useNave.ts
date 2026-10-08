import { useCallback, useEffect, useState } from 'react'
import { nave as datiNave, type Scoperta } from '../dati'
import type { Nave, Viaggio } from '../dominio/navigazione'
import type { Coordinate } from '../dominio/settore'
import { eventi, segnaVisita, ultimaVisita, type Evento } from './riepilogo'

export type StatoNave =
  | { fase: 'carico' }
  | { fase: 'errore'; messaggio: string }
  | { fase: 'pronta'; nave: Nave; viaggio: Viaggio | null }

/**
 * L'ora del database vista dal dispositivo: l'orologio del telefono può essere
 * indietro o avanti di qualche secondo, e il conto alla rovescia deve finire
 * quando il database considera la nave arrivata. Si aggiorna ogni secondo.
 */
export function useOra(scarto: number): Date {
  const [ora, setOra] = useState(() => new Date(Date.now() + scarto))
  useEffect(() => {
    setOra(new Date(Date.now() + scarto))
    const id = window.setInterval(() => setOra(new Date(Date.now() + scarto)), 1000)
    return () => window.clearInterval(id)
  }, [scarto])
  return ora
}

/**
 * Lo stato della nave dal database, le scoperte e il riepilogo dall'ultima
 * visita. Quando la nave arriva si rilegge tutto, da solo.
 */
export function useNave() {
  const [stato, setStato] = useState<StatoNave>({ fase: 'carico' })
  const [scarto, setScarto] = useState(0)
  const [scoperte, setScoperte] = useState<Scoperta[]>([])
  const [riepilogo, setRiepilogo] = useState<Evento[]>([])

  const ricarica = useCallback(async () => {
    try {
      const prima = Date.now()
      const [remoto, elenco] = await Promise.all([datiNave().stato(), datiNave().scoperte()])
      // Lo scarto si misura a metà della richiesta: la risposta ha viaggiato.
      const scartoNuovo = remoto.ora.getTime() - (prima + Date.now()) / 2
      setScarto(scartoNuovo)
      setStato({ fase: 'pronta', nave: remoto.nave, viaggio: remoto.viaggio })
      setScoperte(elenco)

      // Gli arrivi dall'ultima rilettura: all'apertura e al ritorno sull'app
      // (che sul telefono può restare aperta in sottofondo per ore). Quelli
      // visti dal vivo non ci sono: all'arrivo l'app rilegge e segna la visita.
      const ultima = ultimaVisita()
      segnaVisita(remoto.ora)
      if (ultima) {
        const nuovi = eventi(await datiNave().arriviDal(ultima))
        if (nuovi.length) setRiepilogo((prima) => [...prima, ...nuovi])
      }
    } catch (errore) {
      console.error('Nave non letta', errore)
      setStato({ fase: 'errore', messaggio: 'Non riesco a leggere lo stato della nave: controlla la connessione.' })
    }
  }, [])

  useEffect(() => {
    void ricarica()
  }, [ricarica])

  // All'arrivo si rilegge: la posizione è già giusta, ma la scoperta compare solo ora.
  const dal = stato.fase === 'pronta' ? stato.nave.dal.getTime() : null
  useEffect(() => {
    if (dal === null) return
    const attesa = dal - (Date.now() + scarto)
    if (attesa <= 0) return
    // I timer del browser non reggono attese oltre i 24 giorni circa.
    const id = window.setTimeout(
      () => {
        // Arrivo visto dal vivo: non va anche nel riepilogo. Se l'app è in
        // sottofondo invece no, e al ritorno lo si racconta.
        if (document.visibilityState === 'visible') segnaVisita(new Date(dal))
        void ricarica()
      },
      Math.min(attesa + 500, 2 ** 31 - 1),
    )
    return () => window.clearTimeout(id)
  }, [dal, scarto, ricarica])

  // Tornando sull'app dopo un po' (telefono in tasca) si rilegge.
  useEffect(() => {
    const visibile = () => {
      if (document.visibilityState === 'visible') void ricarica()
    }
    document.addEventListener('visibilitychange', visibile)
    return () => document.removeEventListener('visibilitychange', visibile)
  }, [ricarica])

  const parti = useCallback(
    async (meta: Coordinate) => {
      await datiNave().viaggia(meta)
      await ricarica()
    },
    [ricarica],
  )

  return { stato, scarto, scoperte, riepilogo, chiudiRiepilogo: () => setRiepilogo([]), parti, ricarica }
}
