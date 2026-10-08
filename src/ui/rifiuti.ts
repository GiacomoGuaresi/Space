// I rifiuti delle funzioni del database (doc/05-modello-dati.md), a parole.

import type { MotivoRifiuto } from '../dati'

export const RIFIUTI: Readonly<Record<MotivoRifiuto, string>> = {
  in_viaggio: 'La nave è già in viaggio.',
  stesso_settore: 'La nave è già qui.',
  carburante_insufficiente: 'Il carburante non basta nemmeno per un settore: aspetta che si ricarichi.',
  non_fondabile: 'Qui non si può fondare una base: serve un sistema planetario.',
  pianeta_mancante: "Quel pianeta non c'è.",
  gia_fondato: "Qui c'è già un tuo insediamento.",
  limite_basi: 'Hai già tutte le basi che puoi fondare.',
  risorse_insufficienti: "Nella stiva non c'è abbastanza.",
}
