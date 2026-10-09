// La nave nel database (supabase/sql/): si legge lo stato e si parte solo con
// le funzioni `stato` e `viaggia`; viaggi, scoperte e scansioni si leggono
// dalle tabelle, in sola lettura.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { TipoCorpo } from '../dominio/catalogo'
import type { Nave, Viaggio } from '../dominio/navigazione'
import { nessuna, RISORSE, type Carico, type Risorsa } from '../dominio/risorse'
import type { Coordinate } from '../dominio/settore'
import type { Insediamento, TipoInsediamento } from '../dominio/insediamenti'
import type { Lavoro } from '../dominio/cantiere'
import { fallita } from './errore'

export interface StatoRemoto {
  /** L'orologio del database, per correggere quello del dispositivo. */
  ora: Date
  nave: Nave
  /** Il viaggio in corso, se c'è. */
  viaggio: Viaggio | null
  carico: Carico
}

export interface Scoperta {
  coordinate: Coordinate
  tipo: TipoCorpo
  scoperta: Date
}

/** Una sosta della nave vista dallo scanner: da qui si ricalcola la mappa. */
export interface Scansione {
  centro: Coordinate
  raggio: number
  livello: number
  /** Quando è iniziata la sosta. */
  istante: Date
}

/** Un corpo a raccolta una tantum già preso (una cometa), con quello che è entrato nella stiva. */
export interface Raccolto {
  coordinate: Coordinate
  istante: Date
  bottino: Partial<Record<Risorsa, number>>
}

/** Il magazzino di un insediamento passato nella stiva, arrivando o ripartendo. */
export interface Prelievo {
  insediamento: number
  istante: Date
  preso: Partial<Record<Risorsa, number>>
}

/** Un lavoro del cantiere: in coda, in corso o finito (doc/05-modello-dati.md). */
export interface Costruzione {
  id: number
  insediamento: number
  coda: 'nave' | 'base'
  lavoro: Lavoro
  livello: number
  inizio: Date
  fine: Date
  costo: Partial<Record<Risorsa, number>>
}

/** Una ricerca avviata: finita se `fine` è passata. */
export interface RicercaAvviata {
  nodo: string
  livello: number
  inizio: Date
  fine: Date
}

/** I rifiuti delle funzioni, con il loro codice. */
export type MotivoRifiuto =
  | 'in_viaggio'
  | 'stesso_settore'
  | 'carburante_insufficiente'
  | 'non_fondabile'
  | 'pianeta_mancante'
  | 'gia_fondato'
  | 'limite_basi'
  | 'risorse_insufficienti'
  | 'nave_occupata'
  | 'non_in_base'
  | 'serve_cantiere'
  | 'tetto_cantiere'
  | 'non_disponibile'
  | 'serve_deposito'
  | 'gia_pieno'
  | 'ricerca_sconosciuta'
  | 'gia_ricercata'
  | 'ricerca_in_corso'
  | 'prerequisiti'
  | 'serve_laboratorio'
  | 'non_estraibile'
  | 'limite_estrattori'

export class ViaggioRifiutato extends Error {
  constructor(readonly motivo: MotivoRifiuto) {
    super(motivo)
  }
}

interface RigaNave {
  x: number
  y: number
  z: number
  dal: string
  carburante: number
  velocita: number
  serbatoio: number
  ricarica: number
  scanner: number
  stiva: number
  liv_motore: number
  liv_serbatoio: number
  liv_ricarica: number
}

interface RigaViaggio {
  da_x: number
  da_y: number
  da_z: number
  meta_x: number
  meta_y: number
  meta_z: number
  a_x: number
  a_y: number
  a_z: number
  partenza: string
  arrivo: string
  consumo: number
  fionda: boolean
}

function nave(r: RigaNave): Nave {
  return {
    posizione: { x: r.x, y: r.y, z: r.z },
    dal: new Date(r.dal),
    carburante: r.carburante,
    velocita: r.velocita,
    serbatoio: r.serbatoio,
    ricarica: r.ricarica,
    scanner: r.scanner,
    stiva: r.stiva,
    livelli: { motore: r.liv_motore, serbatoio: r.liv_serbatoio, ricarica: r.liv_ricarica },
  }
}

function viaggio(r: RigaViaggio): Viaggio {
  return {
    da: { x: r.da_x, y: r.da_y, z: r.da_z },
    meta: { x: r.meta_x, y: r.meta_y, z: r.meta_z },
    a: { x: r.a_x, y: r.a_y, z: r.a_z },
    partenza: new Date(r.partenza),
    arrivo: new Date(r.arrivo),
    consumo: r.consumo,
    fionda: r.fionda,
  }
}

/** La stiva dal database: tutte le righe hanno lo stesso `dal`, scritte insieme. */
function carico(righe: Partial<Record<Risorsa, { quantita: number; dal: string }>> | null): Carico {
  const quantita = nessuna()
  let dal = new Date(0)
  for (const r of RISORSE) {
    const riga = righe?.[r]
    if (!riga) continue
    quantita[r] = riga.quantita
    if (new Date(riga.dal) > dal) dal = new Date(riga.dal)
  }
  return { quantita, dal }
}

const MOTIVI: readonly MotivoRifiuto[] = [
  'in_viaggio',
  'stesso_settore',
  'carburante_insufficiente',
  'non_fondabile',
  'pianeta_mancante',
  'gia_fondato',
  'limite_basi',
  'risorse_insufficienti',
  'nave_occupata',
  'non_in_base',
  'serve_cantiere',
  'tetto_cantiere',
  'non_disponibile',
  'serve_deposito',
  'gia_pieno',
  'ricerca_sconosciuta',
  'gia_ricercata',
  'ricerca_in_corso',
  'prerequisiti',
  'serve_laboratorio',
  'non_estraibile',
  'limite_estrattori',
]

export class NaveSupabase {
  constructor(private readonly client: SupabaseClient) {}

  async stato(): Promise<StatoRemoto> {
    const { data, error } = await this.client.rpc('stato')
    if (error) throw fallita('Stato della nave non letto', error)
    const d = data as {
      ora: string
      nave: RigaNave
      viaggio: RigaViaggio | null
      stiva: Partial<Record<Risorsa, { quantita: number; dal: string }>> | null
    }
    return { ora: new Date(d.ora), nave: nave(d.nave), viaggio: d.viaggio ? viaggio(d.viaggio) : null, carico: carico(d.stiva) }
  }

  async viaggia(meta: Coordinate): Promise<Viaggio> {
    const { data, error } = await this.client.rpc('viaggia', meta)
    if (error) {
      const motivo = MOTIVI.find((m) => m === error.message)
      if (motivo) throw new ViaggioRifiutato(motivo)
      throw fallita('Partenza non riuscita', error)
    }
    return viaggio(data as RigaViaggio)
  }

  /** Fonda una base sul sistema dove sta la nave, col pianeta `pianeta`. */
  async fonda(pianeta: number): Promise<void> {
    const { error } = await this.client.rpc('fonda', { pianeta })
    if (error) {
      const motivo = MOTIVI.find((m) => m === error.message)
      if (motivo) throw new ViaggioRifiutato(motivo)
      throw fallita('Fondazione non riuscita', error)
    }
  }

  /** Fonda un estrattore sul corpo dove sta la nave. */
  async fondaEstrattore(): Promise<void> {
    const { error } = await this.client.rpc('fonda_estrattore')
    if (error) {
      const motivo = MOTIVI.find((m) => m === error.message)
      if (motivo) throw new ViaggioRifiutato(motivo)
      throw fallita('Fondazione non riuscita', error)
    }
  }

  /** Avvia un lavoro nel cantiere della base dove sta la nave. */
  async potenzia(lavoro: Lavoro): Promise<void> {
    const { error } = await this.client.rpc('potenzia', { lavoro })
    if (error) {
      const motivo = MOTIVI.find((m) => m === error.message)
      if (motivo) throw new ViaggioRifiutato(motivo)
      throw fallita('Lavoro non avviato', error)
    }
  }

  /** Il pieno al deposito della base dove sta la nave, pagato in Idrogeno. */
  async pieno(): Promise<void> {
    const { error } = await this.client.rpc('pieno')
    if (error) {
      const motivo = MOTIVI.find((m) => m === error.message)
      if (motivo) throw new ViaggioRifiutato(motivo)
      throw fallita('Pieno non riuscito', error)
    }
  }

  /** Avvia la ricerca `nodo` nel laboratorio della base dove sta la nave. */
  async avviaRicerca(nodo: string): Promise<void> {
    const { error } = await this.client.rpc('ricerca', { nodo })
    if (error) {
      const motivo = MOTIVI.find((m) => m === error.message)
      if (motivo) throw new ViaggioRifiutato(motivo)
      throw fallita('Ricerca non avviata', error)
    }
  }

  /** Tutte le ricerche avviate, finite o in corso. */
  async ricerche(): Promise<RicercaAvviata[]> {
    const { data, error } = await this.client.from('ricerca').select('nodo, livello, inizio, fine').order('fine')
    if (error) throw fallita('Ricerche non lette', error)
    return (data as { nodo: string; livello: number; inizio: string; fine: string }[]).map((r) => ({
      ...r,
      inizio: new Date(r.inizio),
      fine: new Date(r.fine),
    }))
  }

  /** I lavori del cantiere finiti dopo `dal`, in corso o in coda. */
  async costruzioniDal(dal: Date): Promise<Costruzione[]> {
    const { data, error } = await this.client
      .from('costruzione')
      .select('id, insediamento, coda, lavoro, livello, inizio, fine, costo')
      .gte('fine', dal.toISOString())
      .order('fine')
    if (error) throw fallita('Cantiere non letto', error)
    return (
      data as {
        id: number
        insediamento: number
        coda: 'nave' | 'base'
        lavoro: Lavoro
        livello: number
        inizio: string
        fine: string
        costo: Partial<Record<Risorsa, number>>
      }[]
    ).map((r) => ({ ...r, inizio: new Date(r.inizio), fine: new Date(r.fine) }))
  }

  /** I viaggi arrivati (o in arrivo) dopo `dal`: servono al diario di bordo. */
  async viaggiDal(dal: Date): Promise<Viaggio[]> {
    const { data, error } = await this.client
      .from('viaggio')
      .select('da_x, da_y, da_z, meta_x, meta_y, meta_z, a_x, a_y, a_z, partenza, arrivo, consumo, fionda')
      .gte('arrivo', dal.toISOString())
      .order('arrivo')
    if (error) throw fallita('Viaggi non letti', error)
    return (data as RigaViaggio[]).map(viaggio)
  }

  /** Le scoperte già fatte: quelle dei viaggi in corso le nasconde il database. */
  async scoperte(): Promise<Scoperta[]> {
    const { data, error } = await this.client.from('scoperta').select('x, y, z, tipo, scoperta').order('scoperta', { ascending: false })
    if (error) throw fallita('Scoperte non lette', error)
    return (data as { x: number; y: number; z: number; tipo: TipoCorpo; scoperta: string }[]).map((r) => ({
      coordinate: { x: r.x, y: r.y, z: r.z },
      tipo: r.tipo,
      scoperta: new Date(r.scoperta),
    }))
  }

  /** Gli insediamenti del giocatore: la base madre per prima. */
  async insediamenti(): Promise<Insediamento[]> {
    const { data, error } = await this.client
      .from('insediamento')
      .select('id, x, y, z, tipo, pianeta, fondazione, ultima, scorte, produzione, magazzino, cantiere, deposito, laboratorio, radar')
      .order('id')
    if (error) throw fallita('Insediamenti non letti', error)
    return (
      data as {
        id: number
        x: number
        y: number
        z: number
        tipo: TipoInsediamento
        pianeta: number | null
        fondazione: string
        ultima: string
        scorte: Partial<Record<Risorsa, number>>
        produzione: number
        magazzino: number
        cantiere: number
        deposito: number
        laboratorio: number
        radar: number
      }[]
    ).map((r) => ({
      id: r.id,
      coordinate: { x: r.x, y: r.y, z: r.z },
      tipo: r.tipo,
      pianeta: r.pianeta,
      fondazione: new Date(r.fondazione),
      ultima: new Date(r.ultima),
      scorte: r.scorte,
      produzione: r.produzione,
      magazzino: r.magazzino,
      cantiere: r.cantiere,
      deposito: r.deposito,
      laboratorio: r.laboratorio,
      radar: r.radar,
    }))
  }

  /** I prelievi dai magazzini dopo `dal`: servono al diario di bordo. */
  async prelieviDal(dal: Date): Promise<Prelievo[]> {
    const { data, error } = await this.client.from('prelievo').select('insediamento, istante, preso').gte('istante', dal.toISOString())
    if (error) throw fallita('Prelievi non letti', error)
    return (data as { insediamento: number; istante: string; preso: Partial<Record<Risorsa, number>> }[]).map((r) => ({
      insediamento: r.insediamento,
      istante: new Date(r.istante),
      preso: r.preso,
    }))
  }

  /** I corpi a raccolta una tantum già presi. */
  async raccolti(): Promise<Raccolto[]> {
    const { data, error } = await this.client.from('raccolto').select('x, y, z, istante, bottino')
    if (error) throw fallita('Raccolti non letti', error)
    return (data as { x: number; y: number; z: number; istante: string; bottino: Partial<Record<Risorsa, number>> }[]).map((r) => ({
      coordinate: { x: r.x, y: r.y, z: r.z },
      istante: new Date(r.istante),
      bottino: r.bottino,
    }))
  }

  /** Le scansioni delle soste: quella dell'arrivo in corso la nasconde il database. */
  async scansioni(): Promise<Scansione[]> {
    const { data, error } = await this.client.from('scansione').select('x, y, z, raggio, livello, istante')
    if (error) throw fallita('Scansioni non lette', error)
    return (data as { x: number; y: number; z: number; raggio: number; livello: number; istante: string }[]).map((r) => ({
      centro: { x: r.x, y: r.y, z: r.z },
      raggio: r.raggio,
      livello: r.livello,
      istante: new Date(r.istante),
    }))
  }
}
