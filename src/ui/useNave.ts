import { useCallback, useEffect, useState } from 'react'
import {
  nave as datiNave,
  type Costruzione,
  type RicercaAvviata,
  type Prelievo,
  type Raccolto,
  type Scansione,
  type Scoperta,
} from '../dati'
import type { Nave, Viaggio } from '../dominio/navigazione'
import type { Carico } from '../dominio/risorse'
import type { Insediamento } from '../dominio/insediamenti'
import type { Lavoro } from '../dominio/cantiere'
import type { Coordinate } from '../dominio/settore'
import { tipoSettore } from '../dominio/settore'
import { suona } from './suoni'
import { GIORNI_DIARIO, letto, novita, segnaLetto, vociDiario } from './diario'

export type StatoNave =
  { fase: 'carico' } | { fase: 'errore'; messaggio: string } | { fase: 'pronta'; nave: Nave; viaggio: Viaggio | null; carico: Carico }

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
 * Lo stato della nave dal database, con viaggi, scoperte e scansioni per il
 * diario di bordo. Quando la nave arriva si rilegge tutto, da solo; quando si
 * apre l'app (o ci si torna) con delle novità, chiede di aprire il diario.
 */
export function useNave() {
  const [stato, setStato] = useState<StatoNave>({ fase: 'carico' })
  const [scarto, setScarto] = useState(0)
  const [scoperte, setScoperte] = useState<Scoperta[]>([])
  const [scansioni, setScansioni] = useState<Scansione[]>([])
  const [viaggi, setViaggi] = useState<Viaggio[]>([])
  const [raccolti, setRaccolti] = useState<Raccolto[]>([])
  const [insediamenti, setInsediamenti] = useState<Insediamento[]>([])
  const [prelievi, setPrelievi] = useState<Prelievo[]>([])
  const [costruzioni, setCostruzioni] = useState<Costruzione[]>([])
  const [ricerche, setRicerche] = useState<RicercaAvviata[]>([])
  /** Cresce ogni volta che il diario va aperto da solo: all'apertura con delle novità. */
  const [aperturaDiario, setAperturaDiario] = useState(0)

  const ricarica = useCallback(async (apriDiario = false) => {
    try {
      const prima = Date.now()
      // Prima lo stato: alla prima apertura scrive la scansione della base.
      const remoto = await datiNave().stato()
      const dopo = Date.now()
      const dal = new Date(remoto.ora.getTime() - GIORNI_DIARIO * 24 * 3_600_000)
      const [elenco, soste, recenti, presi, basi, prelevati, lavori, studi] = await Promise.all([
        datiNave().scoperte(),
        datiNave().scansioni(),
        datiNave().viaggiDal(dal),
        datiNave().raccolti(),
        datiNave().insediamenti(),
        datiNave().prelieviDal(dal),
        datiNave().costruzioniDal(dal),
        datiNave().ricerche(),
      ])
      // Lo scarto si misura a metà della richiesta: la risposta ha viaggiato.
      const scartoNuovo = remoto.ora.getTime() - (prima + dopo) / 2
      setScarto(scartoNuovo)
      setStato({ fase: 'pronta', nave: remoto.nave, viaggio: remoto.viaggio, carico: remoto.carico })
      setScoperte(elenco)
      setScansioni(soste)
      setViaggi(recenti)
      setRaccolti(presi)
      setInsediamenti(basi)
      setPrelievi(prelevati)
      setCostruzioni(lavori)
      setRicerche(studi)

      if (apriDiario) {
        const voci = vociDiario({
          viaggi: recenti,
          scoperte: elenco,
          scansioni: soste,
          raccolti: presi,
          prelievi: prelevati,
          insediamenti: basi,
          costruzioni: lavori,
          ricerche: studi,
          nave: remoto.nave,
          ora: remoto.ora,
        })
        const fino = letto()
        // Alla primissima apertura non c'è nulla da raccontare: si parte da qui.
        if (!fino) segnaLetto(remoto.ora)
        else if (voci.some((v) => novita(v, fino))) setAperturaDiario((n) => n + 1)
      }
    } catch (errore) {
      console.error('Nave non letta', errore)
      setStato({ fase: 'errore', messaggio: 'Non riesco a leggere lo stato della nave: controlla la connessione.' })
    }
  }, [])

  useEffect(() => {
    void ricarica(true)
  }, [ricarica])

  // All'arrivo si rilegge: la posizione è già giusta, ma la scoperta compare solo ora.
  const dal = stato.fase === 'pronta' ? stato.nave.dal.getTime() : null
  const arrivoSu = stato.fase === 'pronta' ? stato.nave.posizione : null
  useEffect(() => {
    if (dal === null) return
    const attesa = dal - (Date.now() + scarto)
    if (attesa <= 0) return
    // I timer del browser non reggono attese oltre i 24 giorni circa.
    const id = window.setTimeout(
      () => {
        // Arrivo visto dal vivo: nel diario c'è, ma non come novità. Se l'app
        // è in sottofondo invece sì, e al ritorno il diario si apre.
        if (document.visibilityState === 'visible') {
          segnaLetto(new Date(dal))
          suona(arrivoSu && tipoSettore(arrivoSu) ? 'scoperta' : 'arrivo')
        }
        void ricarica()
      },
      Math.min(attesa + 500, 2 ** 31 - 1),
    )
    return () => window.clearTimeout(id)
    // La posizione cambia insieme a `dal`: basta quello.
  }, [dal, scarto, ricarica])

  // Quando finisce un lavoro del cantiere si rilegge: il database lo applica alla lettura.
  const prossima =
    [...costruzioni, ...ricerche]
      .map((c) => c.fine.getTime())
      .filter((t) => t > Date.now() + scarto)
      .sort((a, b) => a - b)[0] ?? null
  useEffect(() => {
    if (prossima === null) return
    const id = window.setTimeout(
      () => {
        suona('arrivo')
        void ricarica()
      },
      Math.min(prossima - (Date.now() + scarto) + 500, 2 ** 31 - 1),
    )
    return () => window.clearTimeout(id)
  }, [prossima, scarto, ricarica])

  // Tornando sull'app dopo un po' (telefono in tasca) si rilegge.
  useEffect(() => {
    const visibile = () => {
      if (document.visibilityState === 'visible') void ricarica(true)
    }
    document.addEventListener('visibilitychange', visibile)
    return () => document.removeEventListener('visibilitychange', visibile)
  }, [ricarica])

  const parti = useCallback(
    async (meta: Coordinate) => {
      await datiNave().viaggia(meta)
      suona('partenza')
      await ricarica()
    },
    [ricarica],
  )

  const fonda = useCallback(
    async (pianeta: number) => {
      await datiNave().fonda(pianeta)
      suona('scoperta')
      await ricarica()
    },
    [ricarica],
  )

  const fondaEstrattore = useCallback(async () => {
    await datiNave().fondaEstrattore()
    suona('scoperta')
    await ricarica()
  }, [ricarica])

  const potenzia = useCallback(
    async (lavoro: Lavoro) => {
      await datiNave().potenzia(lavoro)
      suona('partenza')
      await ricarica()
    },
    [ricarica],
  )

  const avviaRicerca = useCallback(
    async (nodo: string) => {
      await datiNave().avviaRicerca(nodo)
      suona('partenza')
      await ricarica()
    },
    [ricarica],
  )

  const pieno = useCallback(async () => {
    await datiNave().pieno()
    suona('clic')
    await ricarica()
  }, [ricarica])

  return {
    avviaRicerca,
    ricerche,
    pieno,
    stato,
    scarto,
    scoperte,
    scansioni,
    viaggi,
    raccolti,
    insediamenti,
    prelievi,
    costruzioni,
    aperturaDiario,
    parti,
    fonda,
    fondaEstrattore,
    potenzia,
    ricarica,
  }
}
