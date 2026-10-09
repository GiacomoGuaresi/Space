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
  risorse_insufficienti: "Tra stiva e magazzino non c'è abbastanza.",
  nave_occupata: 'La nave è ferma nel cantiere finché il potenziamento non finisce.',
  non_in_base: 'Serve essere attraccati a una tua base.',
  serve_cantiere: 'Questa base non ha un cantiere.',
  tetto_cantiere: 'Il cantiere non basta: la nave non supera il doppio del suo livello.',
  non_disponibile: 'Qui non si può: arriva con le ricerche.',
  serve_deposito: 'Questa base non ha un deposito carburante.',
  gia_pieno: 'Il serbatoio è già pieno.',
  ricerca_sconosciuta: 'Questa ricerca non esiste.',
  gia_ricercata: 'Questa ricerca è già fatta, o in corso.',
  ricerca_in_corso: 'Una ricerca alla volta: aspetta che finisca quella in corso.',
  prerequisiti: 'Mancano le ricerche che vengono prima.',
  serve_laboratorio: 'Serve un laboratorio di livello pari almeno al gradino.',
  non_estraibile: 'Qui non si può fondare un estrattore.',
  limite_estrattori: 'Hai già tutti gli estrattori che puoi fondare.',
}
