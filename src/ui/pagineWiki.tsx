// Le pagine della wiki (doc/11-interfaccia.md#wiki): il manuale, separato dal
// catalogo. Ci sono solo le pagine di ciò che esiste già nel gioco; le altre
// arrivano con le loro meccaniche. Ogni pagina finisce con i Numeri, calcolati
// con i valori attuali della nave.

import type { ReactNode } from 'react'
import { BILANCIAMENTO } from '../dominio/bilanciamento'
import { CATALOGO, NOMI_COLONIE, NOMI_RISORSE, PIENEZZA, pesi, ricchezzaMedia, TIPI, type TipoCorpo } from '../dominio/catalogo'
import { raggioScanner, tipiRilevabili, type Nave } from '../dominio/navigazione'
import { BASE, distanza } from '../dominio/settore'
import { capacitaStiva, SIGLE_RISORSE, type Risorsa } from '../dominio/risorse'
import { numero } from './formato'

export type SezioneWiki = 'guida' | 'meccaniche' | 'corpi'

export const NOMI_SEZIONI: Readonly<Record<SezioneWiki, string>> = {
  guida: 'Guida',
  meccaniche: 'Meccaniche',
  corpi: 'Corpi celesti',
}

export interface StatoWiki {
  nave: Nave
  /** I tipi rilevati almeno una volta dallo scanner, o scoperti. */
  rilevati: ReadonlySet<TipoCorpo>
  /** Per ogni tipo, le chiavi dei sottotipi trovati (visitati). */
  trovati: ReadonlyMap<TipoCorpo, ReadonlySet<string>>
  /** Vero se la nave è partita almeno una volta da un buco nero. */
  fionda: boolean
}

export interface PaginaWiki {
  id: string
  sezione: SezioneWiki
  titolo: string
  sbloccata: (s: StatoWiki) => boolean
  /** Cosa fare per aprirla, mostrato quando è chiusa. */
  suggerimento: string
  testo: (s: StatoWiki) => ReactNode
  /** Le formule con i valori di adesso. */
  numeri: (s: StatoWiki) => [string, string][]
}

const sempre = () => true
const { carburante, fionda, scanner } = BILANCIAMENTO

/** Il livello dello scanner che rileva un tipo. */
export function livelloRilevamento(tipo: TipoCorpo): number {
  return (scanner.livelli as readonly string[]).indexOf(tipo) + 1
}

const soglie: Partial<Record<TipoCorpo, number>> = BILANCIAMENTO.universo.soglie

const P = ({ children }: { children: ReactNode }) => <p className="m-0 text-[13px] leading-relaxed">{children}</p>

const GUIDA: PaginaWiki[] = [
  {
    id: 'come-si-gioca',
    sezione: 'guida',
    titolo: 'Come si gioca',
    sbloccata: sempre,
    suggerimento: '',
    testo: () => (
      <>
        <P>
          Hai una nave e un universo infinito di settori, ognuno con le sue coordinate. Si parte dalla base madre, in 0 · 0 · 0. Ogni
          viaggio dura ore vere: si sceglie una meta, si parte e si torna più tardi.
        </P>
        <P>
          Un settore su dieci contiene un corpo celeste. Arrivandoci lo scopri e finisce nel catalogo. Più lontano vai, più i corpi sono
          ricchi e rari.
        </P>
        <P>Niente notifiche: quando riapri il gioco, il diario di bordo racconta cosa è successo.</P>
      </>
    ),
    numeri: () => [
      ['Settori non vuoti', `${numero(PIENEZZA * 100)} %`],
      ['Base madre', '0 · 0 · 0'],
    ],
  },
  {
    id: 'nave',
    sezione: 'guida',
    titolo: 'La nave',
    sbloccata: sempre,
    suggerimento: '',
    testo: () => (
      <>
        <P>Una sola, per sempre. Ha un motore (la velocità), un serbatoio, una ricarica, uno scanner e una stiva.</P>
        <P>
          La stiva ha un posto per ognuna delle sei risorse, tutte con la stessa capacità. Non si scarica mai: le risorse si spendono da lì,
          insieme al magazzino della base dove si costruisce.
        </P>
        <P>Potenziarla è il cuore della progressione: si fa nel cantiere di una base (vedi Cantiere e potenziamenti).</P>
        <P>
          Nelle colonie magazzino e laboratorio si costruiscono subito; il cantiere arriva con Cantiere orbitale, il deposito carburante
          con la ricerca Deposito.
        </P>
      </>
    ),
    numeri: ({ nave }) => [
      ['Motore', `${numero(nave.velocita, 2)} settori/h`],
      ['Serbatoio', `${numero(nave.serbatoio, 1)} unità`],
      ['Ricarica', `${numero(nave.ricarica, 2)} unità/h, da ferma`],
      ['Scanner', `livello ${nave.scanner}`],
      ['Stiva', `25 × 1,5^(livello − 1) per risorsa = ${numero(capacitaStiva(nave.stiva), 0)} al livello ${nave.stiva}`],
    ],
  },
  {
    id: 'risorse',
    sezione: 'guida',
    titolo: 'Risorse e raccolta',
    sbloccata: sempre,
    suggerimento: '',
    testo: () => (
      <>
        <P>
          Sei risorse: Metallo, Silicio, Ghiaccio, Idrogeno, Terre rare e Materia oscura. Le prime quattro sono comuni, le ultime due stanno
          vicino a pulsar e buchi neri.
        </P>
        <P>
          Ferma su un campo di asteroidi, una nebulosa, un gigante gassoso o un sistema planetario, la nave raccoglie da sola, lentamente,
          finché la stiva di quella risorsa non è piena. Quanto e cosa dipende dal sottotipo del corpo e dalla sua ricchezza, che cresce
          allontanandosi dalla base. Un sistema planetario dà la media dei suoi pianeti.
        </P>
        <P>Ripartendo, quello che hai raccolto resta a bordo.</P>
        <P>Le comete si raccolgono arrivando, una volta sola: quello che non entra nella stiva si perde.</P>
      </>
    ),
    numeri: () => {
      const { mano, ritmo } = BILANCIAMENTO.produzione
      const mix = (m: Partial<Record<Risorsa, number>>) =>
        (Object.entries(m) as [Risorsa, number][]).map(([r, p]) => `${SIGLE_RISORSE[r]} ${Math.round(p * 100)}`).join(' ')
      const { asteroidi, gigante, pianeti } = BILANCIAMENTO.mix
      return [
        ['Raccolta a mano', `${mano} × ${ritmo.comune}/h × ricchezza × parte del mix`],
        ['Asteroidi', `metallici ${mix(asteroidi.metallica)} · silicei ${mix(asteroidi.silicea)} · misti ${mix(asteroidi.mista)}`],
        ['Nebulosa', 'H 100'],
        ['Gigante gassoso', `senza anelli ${mix(gigante.senza)} · con anelli ${mix(gigante.anelli)}`],
        [
          'Pianeti',
          `rocciosi ${mix(pianeti.roccioso)} · oceanici ${mix(pianeti.oceanico)} · ghiacciati ${mix(pianeti.ghiacciato)} · gassosi ${mix(pianeti.gassoso)}`,
        ],
        [
          'Cometa',
          `${BILANCIAMENTO.cometa.ghiaccio} × ricchezza di Ghiaccio, più ${BILANCIAMENTO.cometa.idrogeno} × ricchezza di Idrogeno se la coda è almeno ${Math.round(BILANCIAMENTO.cometa.codaLunga * 100)} %`,
        ],
      ]
    },
  },
  {
    id: 'insediamenti',
    sezione: 'guida',
    titolo: 'Insediamenti',
    sbloccata: sempre,
    suggerimento: '',
    testo: () => (
      <>
        <P>
          La base madre, in 0 · 0 · 0, produce da sola un po' delle quattro risorse comuni. Quello che produce va nel suo magazzino, finché
          non arriva al tetto: lì si ferma, e la produzione persa non torna.
        </P>
        <P>Il tetto vale una settimana di produzione: passando a raccogliere almeno una volta a settimana non si perde nulla.</P>
        <P>
          Si raccoglie solo di persona: arrivando in un insediamento il magazzino passa da solo nella stiva, fin dove c'è posto, e il resto
          resta lì. Ripartendo si carica anche quello che ha prodotto durante la sosta. La Rete mostra tutti gli insediamenti, con il tasto
          VAI per impostare la rotta.
        </P>
        <P>
          Su un sistema planetario si fonda una base scegliendo il pianeta: produce col suo mix. La prima è gratis, le altre si pagano dalla
          stiva.
        </P>
        <P>
          Con le ricerche di Colonizzazione si fondano gli estrattori: sugli asteroidi con Estrattori minerari, su nebulose e giganti gassosi
          con Raccoglitori di gas. Producono col mix del corpo e hanno solo produzione e magazzino: niente strutture, niente ricarica
          piena. Hanno un loro limite, separato da quello delle basi.
        </P>
        <P>
          Dalla Rete si può abbandonare una base o un estrattore, tranne la base madre: strutture, coda e scorte spariscono e il corpo torna
          libero, e si libera un posto nel limite. Con la ricerca Riciclo torna nella stiva una parte di quanto ci avevi speso.
        </P>
      </>
    ),
    numeri: () => {
      const { madre, crescita } = BILANCIAMENTO.produzione
      const { ore, crescita: crescitaMagazzino } = BILANCIAMENTO.magazzino
      return [
        ['Base madre', `${madre}/h in tutto, ${numero(madre / 4, 1)}/h di Metallo, Silicio, Ghiaccio e Idrogeno`],
        ['Livello di produzione', `ritmo × ${crescita}^(livello − 1)`],
        ['Tetto del magazzino', `${ore} h della produzione di livello 1 × ${crescitaMagazzino}^(livello − 1)`],
        ['Colonia', `${BILANCIAMENTO.produzione.ritmo.comune}/h × ricchezza, col mix del pianeta scelto`],
        [
          'Fondazione',
          `la prima gratis, poi ${BILANCIAMENTO.fondazione.costo} × ${BILANCIAMENTO.fondazione.crescita}^(basi fondate − 1) in parti uguali di Metallo, Silicio e Ghiaccio; al massimo ${BILANCIAMENTO.fondazione.basi} basi`,
        ],
        [
          'Estrattore',
          `${BILANCIAMENTO.fondazione.estrattore.costo} × ${BILANCIAMENTO.fondazione.estrattore.crescita}^(estrattori fondati) in parti uguali di Metallo e Silicio; ${BILANCIAMENTO.produzione.ritmo.comune}/h × ricchezza col mix del corpo`,
        ],
        [
          'Limite degli estrattori',
          Object.entries(BILANCIAMENTO.fondazione.estrattore.limite)
            .map(([r, n]) => `${r} +${n}`)
            .join(' · '),
        ],
      ]
    },
  },
  {
    id: 'cantiere',
    sezione: 'guida',
    titolo: 'Cantiere e potenziamenti',
    sbloccata: sempre,
    suggerimento: '',
    testo: () => (
      <>
        <P>
          La nave si potenzia nel cantiere di una base, attraccata: la base madre ne ha uno dall'inizio. Un livello si paga subito, prima
          dal magazzino della base e poi dalla stiva, e per tutta la costruzione la nave resta ferma lì.
        </P>
        <P>
          I lavori si mettono in coda: ognuno comincia quando finisce il precedente. Le ricette cambiano a gradini: salendo servono risorse
          sempre più rare. La nave non supera il doppio del livello del cantiere.
        </P>
      </>
    ),
    numeri: () => {
      const { cantiere, nave } = BILANCIAMENTO
      return [
        ['Costo', `base × ${cantiere.crescita}^(livello − 1); base ${cantiere.base.motore} per motore, serbatoio, ricarica e scanner`],
        ['Tempo', `${cantiere.ore} h × ${cantiere.crescitaTempo}^(livello − 2) / (1 + ${cantiere.riduzione} × (cantiere − 1))`],
        ['Statistiche', `valore di partenza × ${nave.crescita}^(livello − 1)`],
        ['Tetto', `livello della nave ≤ ${cantiere.tetto} × livello del cantiere (la stiva no)`],
        ['Stiva', `${Math.round(cantiere.stiva.quota * 100)} % della stiva attuale, M 60 S 40, sempre ${cantiere.stiva.ore} h`],
        ['Ricette', 'liv. 1-3 M 60 S 40 · 4-6 M 50 S 30 G 20 · 7-9 + Idrogeno · 10-14 + Terre rare · 15+ + Materia oscura'],
      ]
    },
  },
  {
    id: 'viaggio',
    sezione: 'guida',
    titolo: 'Viaggio e carburante',
    sbloccata: sempre,
    suggerimento: '',
    testo: () => (
      <>
        <P>
          La rotta è una linea retta. Il viaggio non si annulla: durante il volo la nave non fa altro. Ogni settore percorso costa un'unità
          di carburante.
        </P>
        <P>
          Se il carburante non basta, la nave si ferma nel settore più vicino al punto in cui si svuota e aspetta. Da ferma si ricarica:
          fuori dalle basi solo fino a metà serbatoio, mentre in una base (la madre o una colonia, non un estrattore) o accanto a una
          stella si riempie del tutto, e accanto a una stella anche più in fretta.
        </P>
      </>
    ),
    numeri: ({ nave }) => [
      ['Durata', `distanza / ${numero(nave.velocita, 2)} settori/h`],
      ['Consumo', '1 unità per settore'],
      ['Ricarica', `${numero(nave.ricarica, 2)}/h · ×${carburante.ricaricaStella} accanto a una stella`],
      ['Tetto fuori', `${numero(carburante.tettoFuori * 100)} % = ${numero(nave.serbatoio * carburante.tettoFuori, 1)} unità`],
      ['Tetto in base', `100 % = ${numero(nave.serbatoio, 1)} unità`],
      [
        'Deposito',
        `pieno subito in una base col deposito: ${BILANCIAMENTO.deposito.idrogeno} Idrogeno per unità × ${BILANCIAMENTO.deposito.crescita}^(livello − 1)`,
      ],
    ],
  },
  {
    id: 'scanner',
    sezione: 'guida',
    titolo: 'Scanner',
    sbloccata: sempre,
    suggerimento: '',
    testo: () => (
      <>
        <P>
          Lo scanner mostra i corpi attorno alla nave. Vede solo i tipi del suo livello: gli altri sono invisibili, e il settore sembra
          vuoto finché non ci arrivi. Il nome di un corpo lo scopri solo arrivando.
        </P>
        <P>Ogni sosta resta sulla mappa. Dentro una nebulosa il raggio si dimezza; in sosta presso una pulsar raddoppia.</P>
        <P>
          Con la ricerca Radar ogni base può costruire un radar: uno scanner fisso attorno alla base, che vede gli stessi tipi dello scanner
          della nave. Il suo raggio cresce coi livelli, e quello che rileva resta sulla mappa.
        </P>
      </>
    ),
    numeri: ({ nave }) => {
      const prossimo = scanner.livelli[nave.scanner]
      return [
        [
          'Raggio',
          `${numero(scanner.raggio, 1)} × ${numero(scanner.crescita, 1)}ⁿ = ${numero(raggioScanner(nave.scanner, null), 2)} settori`,
        ],
        ['Rileva', [...tipiRilevabili(nave.scanner)].map((t) => CATALOGO[t].nome.toLowerCase()).join(', ')],
        ['Prossimo livello', prossimo === undefined || prossimo === 'raggio' ? 'più raggio' : CATALOGO[prossimo].nome.toLowerCase()],
        ['Nebulosa · pulsar', `×${numero(scanner.nebulosa, 1)} · ×${numero(scanner.pulsar, 1)}`],
        ['Radar', `${BILANCIAMENTO.radar.raggio} × ${BILANCIAMENTO.radar.crescita}^(livello − 1) settori`],
      ]
    },
  },
  {
    id: 'catalogo',
    sezione: 'guida',
    titolo: 'Catalogo e traguardi',
    sbloccata: sempre,
    suggerimento: '',
    testo: () => (
      <>
        <P>
          La prima volta che arrivi in un settore con un corpo, lo scopri: entra nel catalogo con nome, coordinate e data. Il catalogo è
          l'album delle tue scoperte; questa wiki invece spiega come funzionano.
        </P>
        <P>I traguardi, medaglie con data, arriveranno più avanti.</P>
      </>
    ),
    numeri: () => [['Tipi di corpo', `${TIPI.length}`]],
  },
]

const MECCANICHE: PaginaWiki[] = [
  {
    id: 'fionda',
    sezione: 'meccaniche',
    titolo: 'Fionda gravitazionale',
    sbloccata: (s) => s.fionda,
    suggerimento: 'Parti da un buco nero.',
    testo: () => (
      <P>
        Partendo da un buco nero la nave va più veloce, e una parte dei settori percorsi non consuma carburante. Conta la rotta percorsa: se
        il carburante non basta, il tratto gratis non cresce allungando la meta.
      </P>
    ),
    numeri: () => [
      ['Velocità', `×${numero(fionda.velocita, 1)}`],
      ['Gratis', `${numero(fionda.gratis * 100)} % dei settori percorsi`],
    ],
  },
]

const DESCRIZIONI: Readonly<Record<TipoCorpo, string>> = {
  asteroidi: 'Un campo di rocce che girano piano: metallo e silicio a portata di mano.',
  nebulosa: 'Una nube di gas illuminata dalle stelle vicine. Dentro, lo scanner vede la metà.',
  stella: 'Una stella senza pianeti. In sosta accanto a lei il serbatoio si riempie fino in fondo, e più in fretta.',
  sistema: "Una stella con i suoi pianeti: l'unico posto dove si potrà fondare una base.",
  gigante: 'Un pianeta gassoso senza stella, alla deriva tra i settori.',
  cometa: 'Un nucleo di ghiaccio con la sua coda. Si raccoglierà una volta sola.',
  pulsar: 'Il cuore spento di una stella, che gira e lampeggia. In sosta qui lo scanner vede il doppio.',
  buconero: 'Niente esce da qui, tranne chi parte con la fionda.',
  relitto: 'I resti di qualcuno arrivato prima. Si saccheggerà una volta sola.',
  wormhole: 'Un varco a senso unico verso un settore lontano.',
}

const CORPI: PaginaWiki[] = TIPI.map((tipo) => {
  const voce = CATALOGO[tipo]
  const livello = livelloRilevamento(tipo)
  const soglia = soglie[tipo]
  return {
    id: tipo,
    sezione: 'corpi',
    titolo: voce.nome,
    sbloccata: (s) => s.rilevati.has(tipo),
    suggerimento: `Rilevalo: scanner di livello ${livello}${soglia ? `, oltre ${soglia} settori dalla base madre` : ''}.`,
    testo: () => (
      <>
        <P>{DESCRIZIONI[tipo]}</P>
        <dl className="m-0 grid grid-cols-2 gap-x-3.5 gap-y-2 text-[13px]">
          {(
            [
              ['Rarità', voce.rarita],
              ['Distanza minima', soglia ? `${soglia} sett.` : 'nessuna'],
              ['Risorse', voce.risorse.map((r) => NOMI_RISORSE[r]).join(', ') || '—'],
              ['Insediamento', voce.colonia ? NOMI_COLONIE[voce.colonia] : '—'],
              ['Effetto', voce.effetto ?? '—'],
            ] as const
          ).map(([nome, valore]) => (
            <div key={nome} className="flex flex-col gap-0.5">
              <dt className="etichetta">{nome}</dt>
              <dd className="m-0">{valore}</dd>
            </div>
          ))}
        </dl>
      </>
    ),
    numeri: ({ nave }) => {
      const d = distanza(nave.posizione, BASE)
      const quiPesi = pesi(d)
      const totale = Object.values(quiPesi).reduce((a, b) => a + b, 0)
      return [
        ['Ricchezza media', `1 + √(${numero(d, 1)} / 100) = ×${numero(ricchezzaMedia(d), 2)}, ±40 % per corpo`],
        [
          'Probabilità qui',
          `${numero(PIENEZZA * 100)} % × ${numero(quiPesi[tipo], 1)} / ${numero(totale, 1)} = ${numero(((PIENEZZA * quiPesi[tipo]) / totale) * 100, 2)} % dei settori`,
        ],
        ['Rilevato da', `scanner livello ${livello}`],
      ]
    },
  }
})

export const PAGINE_WIKI: readonly PaginaWiki[] = [...GUIDA, ...MECCANICHE, ...CORPI]

/** Le pagine che si sbloccano facendo (non la Guida): quelle che accendono il pallino. */
export function sbloccate(s: StatoWiki): string[] {
  return PAGINE_WIKI.filter((p) => p.sezione !== 'guida' && p.sbloccata(s)).map((p) => p.id)
}
