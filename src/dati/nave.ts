// La nave nel database (supabase/sql/): si legge lo stato e si parte solo con
// le funzioni `stato` e `viaggia`; viaggi, scoperte e scansioni si leggono
// dalle tabelle, in sola lettura.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { TipoCorpo } from '../dominio/catalogo'
import type { Nave, Viaggio } from '../dominio/navigazione'
import type { Coordinate } from '../dominio/settore'
import { fallita } from './errore'

export interface StatoRemoto {
  /** L'orologio del database, per correggere quello del dispositivo. */
  ora: Date
  nave: Nave
  /** Il viaggio in corso, se c'è. */
  viaggio: Viaggio | null
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

/** I rifiuti di `viaggia`, con il loro codice. */
export type MotivoRifiuto = 'in_viaggio' | 'stesso_settore' | 'carburante_insufficiente'

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

const MOTIVI: readonly MotivoRifiuto[] = ['in_viaggio', 'stesso_settore', 'carburante_insufficiente']

export class NaveSupabase {
  constructor(private readonly client: SupabaseClient) {}

  async stato(): Promise<StatoRemoto> {
    const { data, error } = await this.client.rpc('stato')
    if (error) throw fallita('Stato della nave non letto', error)
    const d = data as { ora: string; nave: RigaNave; viaggio: RigaViaggio | null }
    return { ora: new Date(d.ora), nave: nave(d.nave), viaggio: d.viaggio ? viaggio(d.viaggio) : null }
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
