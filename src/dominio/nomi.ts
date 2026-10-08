// I nomi dei corpi (doc/03-universo.md): generati dal seed, con uno schema per
// tipo. Nomi "pronunciabili" per stelle, sistemi, nebulose e giganti; sigle di
// catalogo per pulsar e buchi neri; nomi evocativi per relitti e varchi.

import type { Casuale } from './casuale'
import type { TipoCorpo } from './catalogo'

// Consonanti semplici più spesso dei gruppi, vocali semplici più spesso dei
// dittonghi: i nomi restano corti e si leggono.
const CONSONANTI = ['b', 'c', 'd', 'f', 'g', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'z'] as const
const GRUPPI = ['br', 'cr', 'dr', 'gr', 'kr', 'pr', 'tr', 'th', 'sh', 'st', 'sp', 'qu', 'x', 'ph'] as const
const VOCALI = ['a', 'e', 'i', 'o', 'u'] as const
const DITTONGHI = ['ae', 'ia', 'io', 'ea', 'y'] as const
/** Dopo l'ultima vocale: niente vocali, per non farne tre di fila. */
const FINALI = ['', '', '', 'n', 's', 'r', 'x', 'l', 'th', 'ris', 'nis', 'ra', 'na', 'lia', 'ron', 'dor'] as const

function sillaba(c: Casuale): string {
  const attacco = c.prova(0.25) ? c.scegli(GRUPPI) : c.scegli(CONSONANTI)
  const vocale = c.prova(0.15) ? c.scegli(DITTONGHI) : c.scegli(VOCALI)
  return attacco + vocale
}

/** Un nome di due o tre sillabe, con l'iniziale maiuscola. */
export function nomeProprio(c: Casuale): string {
  const sillabe = c.prova(0.7) ? 2 : 3
  let nome = c.prova(0.2) ? c.scegli(VOCALI) : ''
  for (let i = 0; i < sillabe; i++) nome += sillaba(c)
  nome += sillabe === 2 ? c.scegli(FINALI) : c.scegli(FINALI.slice(0, 8))
  return nome[0].toUpperCase() + nome.slice(1)
}

const ROMANI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'] as const

/** Il nome del pianeta `indice` (da 0) di un sistema: "Kelaris III". */
export function nomePianeta(sistema: string, indice: number): string {
  return `${sistema} ${ROMANI[indice] ?? indice + 1}`
}

function cifre(c: Casuale, quante: number): string {
  let s = ''
  for (let i = 0; i < quante; i++) s += c.intero(0, 9)
  return s
}

const LETTERE = 'ABCDEFGHJKLMNPRSTVWXYZ'

const RELITTO_COSE = ['Eco', 'Voce', 'Ombra', 'Memoria', 'Sentinella', 'Arca', 'Promessa', 'Veglia', 'Lanterna', 'Spina'] as const
const RELITTO_QUALITA = [
  'Silente', 'Spezzata', 'Dimenticata', 'Errante', 'Antica', 'Cava', 'Vigile', 'Smarrita', 'Muta', 'Ultima',
] as const

const COMETA_PREFISSI = ['C', 'P'] as const

/** Il nome di un corpo del tipo dato. */
export function nomeCorpo(tipo: TipoCorpo, c: Casuale): string {
  switch (tipo) {
    case 'stella':
    case 'sistema':
    case 'gigante':
      return nomeProprio(c)
    case 'nebulosa':
      return `Nebulosa di ${nomeProprio(c)}`
    case 'asteroidi':
      return `Fascia di ${nomeProprio(c)}`
    case 'cometa':
      return `${c.scegli(COMETA_PREFISSI)}/${cifre(c, 4)} ${nomeProprio(c)}`
    case 'pulsar':
      return `PSR J${cifre(c, 4)}${c.prova(0.5) ? '+' : '−'}${cifre(c, 2)}`
    case 'buconero':
      return `${LETTERE[c.intero(0, LETTERE.length - 1)]}${LETTERE[c.intero(0, LETTERE.length - 1)]}-${cifre(c, 4)}`
    case 'relitto':
      return `Relitto «${c.scegli(RELITTO_COSE)} ${c.scegli(RELITTO_QUALITA)}»`
    case 'wormhole':
      return `Varco di ${nomeProprio(c)}`
  }
}
