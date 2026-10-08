import { Suspense, lazy, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CATALOGO, TIPI, type TipoCorpo } from '../dominio/catalogo'
import { corpiNoti } from '../dominio/mappa'
import { inViaggio, type Nave } from '../dominio/navigazione'
import { capacitaNave, caricoOra } from '../dominio/risorse'
import { pienoIl, ritmoInsediamento } from '../dominio/insediamenti'
import { BASE, settore as calcolaSettore } from '../dominio/settore'
import { sottotipo } from '../dominio/sottotipi'
import { AlberoRicerche, ricercheFatte } from './AlberoRicerche'
import { Altro } from './Altro'
import { AzioniNave } from './azioni'
import { Pallini } from './Barra'
import { Catalogo, ContenutoCatalogo } from './Catalogo'
import { Cornice } from './Cornice'
import { Diario } from './Diario'
import { apri, mostra, useDisposizione, type IdFinestra } from './finestre'
import { novita, segnaLetto, UltimaVoce, useLetto, vociDiario } from './diario'
import { Impostazioni } from './Impostazioni'
import { useImpostazioni, type Movimento } from './impostazioni'
import { apriDiario, chiudiDiario, indirizzo, usePagina, type Pagina } from './indirizzo'
import { Mappa } from './Mappa'
import { Osservatorio } from './Osservatorio'
import { PAGINE_WIKI, sbloccate, type StatoWiki } from './pagineWiki'
import { segnaPonteVisto, segnaReteVista, segnaWikiSbloccate, useVisti } from './pallini'
import { Pannello } from './plancia'
import { Ponte } from './Ponte'
import { Rete } from './Rete'
import { Scheda } from './Scheda'
import { CaricoAttuale, SchedaNave } from './SchedaNave'
import { usePC } from './schermo'
import { useNave, useOra } from './useNave'
import { Wiki } from './Wiki'

const NOMI_MOVIMENTO: Readonly<Record<Movimento, string>> = {
  sistema: 'animazioni come il sistema',
  ridotto: 'movimento ridotto',
  pieno: 'tutto animato',
}

// three.js pesa: si carica a parte, così i comandi compaiono subito.
const Scena = lazy(async () => ({ default: (await import('../grafica/Scena')).Scena }))

/** Le pagine dell'app (ui/indirizzo.ts): ponte, mappa, altro, diario, catalogo e l'osservatorio in sviluppo. */
export function App() {
  const pagina = usePagina()
  const {
    stato,
    scarto,
    scoperte,
    scansioni,
    viaggi,
    raccolti,
    insediamenti,
    prelievi,
    aperturaDiario,
    parti,
    fonda,
    potenzia,
    costruzioni,
    pieno,
    avviaRicerca,
    ricerche,
    ricarica,
  } = useNave()
  const ora = useOra(scarto)

  // Il diario si ricalcola al minuto: le voci nuove (un arrivo, una ricarica) compaiono da sole.
  const minuto = Math.floor(ora.getTime() / 60_000)
  // Le ricerche completate, che cambiano alcuni numeri: si ricalcolano al minuto.
  const chiaveFatte = ricerche
    .filter((r) => r.fine.getTime() <= minuto * 60_000)
    .map((r) => r.nodo)
    .join(',')
  const fatte = useMemo(() => new Set(chiaveFatte ? chiaveFatte.split(',') : []), [chiaveFatte])
  const nave = stato.fase === 'pronta' ? stato.nave : null
  const voci = useMemo(
    () =>
      nave
        ? vociDiario({
            viaggi,
            scoperte,
            scansioni,
            raccolti,
            prelievi,
            insediamenti,
            costruzioni,
            ricerche,
            fatte,
            nave,
            ora: new Date(minuto * 60_000),
          })
        : [],
    [viaggi, scoperte, scansioni, raccolti, prelievi, insediamenti, costruzioni, ricerche, fatte, nave, minuto],
  )
  // Su PC (doc/11-interfaccia.md#pc--plancia-a-finestre) le pagine sono finestre.
  const pc = usePC()
  const disposizione = useDisposizione()
  const diarioAperto = pc ? disposizione.finestre.diario.stato === 'aperta' : pagina.pagina === 'diario'
  const lettoOra = useLetto()
  // Mentre il diario è aperto vale la lettura di quando si è aperto: le novità restano evidenziate.
  const [lettoCongelato, setLettoCongelato] = useState<Date | null>(null)
  useEffect(() => {
    setLettoCongelato(diarioAperto ? lettoOra : null)
    // Solo all'apertura e alla chiusura: in mezzo la lettura può cambiare senza toccare ciò che si vede.
  }, [diarioAperto])
  const lettoAperto = diarioAperto ? (lettoCongelato ?? lettoOra) : lettoOra
  // Su PC il diario si chiude con la sua ×, o riducendolo: allora è letto.
  const eraAperto = useRef(false)
  useEffect(() => {
    if (pc && eraAperto.current && !diarioAperto) segnaLetto(new Date(Date.now() + scarto))
    eraAperto.current = diarioAperto
  }, [pc, diarioAperto, scarto])
  const daLeggere = voci.filter((v) => novita(v, lettoAperto)).length
  const carico = stato.fase === 'pronta' ? stato.carico : null
  // Al secondo, come il carburante: la raccolta a mano si vede crescere.
  const secondo = Math.floor(ora.getTime() / 1000)
  const bordo = useMemo(
    () =>
      carico && nave
        ? {
            carico,
            quantita: caricoOra(carico, nave, new Date(secondo * 1000), fatte),
            capacita: capacitaNave(nave.stiva, fatte),
            raccolti,
            insediamenti,
            fatte,
          }
        : null,
    [carico, nave, secondo, raccolti, insediamenti, fatte],
  )
  const azioni = useMemo(
    () => ({ fonda, potenzia, pieno, avviaRicerca, ricerche, costruzioni }),
    [fonda, potenzia, pieno, avviaRicerca, ricerche, costruzioni],
  )
  const ultima = useMemo(() => ({ voce: voci[0] ?? null, nuove: daLeggere }), [voci, daLeggere])

  // Pallini: Ponte se la nave è arrivata da quando l'hai visto, Mappa se c'è un
  // raro rilevato mai visitato né aperto, Altro se il diario ha novità.
  const visti = useVisti()
  const impostazioni = useImpostazioni()
  const noti = useMemo(() => corpiNoti(scansioni, scoperte), [scansioni, scoperte])
  const volo = nave ? inViaggio(nave, ora) : true
  const arrivoNonVisto = nave !== null && !volo && (!visti.ponte || nave.dal > new Date(visti.ponte))
  const rariNuovi = noti.filter(
    (p) =>
      !p.scoperto &&
      ['rara', 'leggendaria'].includes(CATALOGO[p.tipo].rarita) &&
      !visti.rari.includes(`${p.coordinate.x},${p.coordinate.y},${p.coordinate.z}`),
  ).length
  // La wiki: tipi rilevati, sottotipi trovati, fionda usata. Ciò che si è
  // sbloccato una volta resta sbloccato, anche quando i dati escono dai 30 giorni.
  const statoWiki = useMemo<StatoWiki | null>(() => {
    if (!nave) return null
    const trovati = new Map<TipoCorpo, Set<string>>()
    for (const s of scoperte) {
      const corpo = calcolaSettore(s.coordinate).corpo
      const chiave = corpo && sottotipo(corpo.dettagli)
      if (!chiave) continue
      if (!trovati.has(s.tipo)) trovati.set(s.tipo, new Set())
      trovati.get(s.tipo)!.add(chiave)
    }
    return {
      nave,
      rilevati: new Set([...noti.map((p) => p.tipo), ...TIPI.filter((t) => visti.sbloccate.includes(t))]),
      trovati,
      fionda: viaggi.some((v) => v.fionda) || visti.sbloccate.includes('fionda'),
    }
  }, [nave, scoperte, noti, viaggi, visti.sbloccate])
  const wikiSbloccate = useMemo(() => (statoWiki ? sbloccate(statoWiki) : []), [statoWiki])
  useEffect(() => segnaWikiSbloccate(wikiSbloccate), [wikiSbloccate])
  const wikiNuove = wikiSbloccate.filter((id) => !visti.wiki.includes(id))

  // Rete: un magazzino arrivato al tetto da quando l'hai vista. Raccogliendolo si spegne da solo.
  const pieni = insediamenti.filter((i) => {
    const pieno = pienoIl(i, fatte)
    return Object.keys(ritmoInsediamento(i)).length > 0 && pieno <= ora && (!visti.rete || pieno > new Date(visti.rete))
  }).length
  const reteAperta = pc ? disposizione.finestre.rete.stato === 'aperta' : pagina.pagina === 'rete'
  useEffect(() => {
    if (reteAperta && pieni) segnaReteVista(new Date(Date.now() + scarto))
  }, [reteAperta, pieni, scarto])
  const pallini = useMemo(
    () => ({
      ponte: arrivoNonVisto ? 'la nave è arrivata' : undefined,
      mappa: rariNuovi ? `${rariNuovi} ${rariNuovi === 1 ? 'corpo raro rilevato' : 'corpi rari rilevati'}` : undefined,
      altro: daLeggere ? `${daLeggere} novità nel diario` : wikiNuove.length ? 'nuove pagine nella wiki' : undefined,
      diario: daLeggere ? `${daLeggere} novità` : undefined,
      wiki: wikiNuove.length ? 'nuove pagine' : undefined,
      rete: pieni ? `${pieni} ${pieni === 1 ? 'magazzino pieno' : 'magazzini pieni'}` : undefined,
    }),
    [arrivoNonVisto, rariNuovi, daLeggere, wikiNuove.length, pieni],
  )
  // Sul ponte, a nave ferma, l'arrivo è visto.
  useEffect(() => {
    const ponte = pc ? disposizione.finestre.qui.stato === 'aperta' : pagina.pagina === 'ponte'
    if (ponte && arrivoNonVisto && nave) segnaPonteVisto(nave.dal)
  }, [pc, disposizione.finestre.qui.stato, pagina.pagina, arrivoNonVisto, nave])

  // Su PC i link diretti (#/diario, #/wiki/pulsar, #/rotta/x,y,z…) aprono la
  // finestra, poi l'indirizzo si pulisce: la disposizione non sta nell'URL.
  const [wikiPC, setWikiPC] = useState<{ voce?: string; numeri?: boolean }>({})
  useEffect(() => {
    if (!pc || pagina.pagina === 'osservatorio') return
    if (pagina.pagina === 'ponte' && !pagina.meta) return
    if (pagina.pagina === 'mappa') mostra('mappa')
    const finestre: Partial<Record<Pagina['pagina'], IdFinestra>> = {
      diario: 'diario',
      wiki: 'wiki',
      catalogo: 'catalogo',
      impostazioni: 'impostazioni',
      nave: 'nave',
      rete: 'rete',
      ricerche: 'ricerche',
    }
    const id = finestre[pagina.pagina]
    if (id) apri(id)
    if (pagina.pagina === 'wiki') setWikiPC({ voce: pagina.voce, numeri: pagina.numeri })
    // La rotta l'ha già presa il ponte, che apre la sua finestra.
    window.location.replace(indirizzo({ pagina: 'ponte' }))
  }, [pc, pagina])

  // All'apertura dell'app (o al ritorno) con delle novità, il diario si apre da solo.
  useEffect(() => {
    if (aperturaDiario) apriDiario()
  }, [aperturaDiario])

  // Ogni pagina, con i pallini della barra a disposizione.
  const vista = (): ReactNode => {
    if (pagina.pagina === 'osservatorio' && import.meta.env.DEV) return <PaginaOsservatorio pagina={pagina} />

    if (stato.fase === 'carico') {
      return <main className="grid min-h-dvh place-items-center bg-black text-xs text-testo-tenue">Collegamento con la nave…</main>
    }
    if (stato.fase === 'errore') {
      return (
        <main className="grid min-h-dvh place-items-center bg-black p-4 text-center">
          <div className="flex flex-col items-center gap-3">
            <p className="m-0 text-sm text-pericolo" role="alert">
              {stato.messaggio}
            </p>
            <button
              type="button"
              className="rounded-plancia border border-linea px-4 py-2 text-sm hover:border-ambra"
              onClick={() => void ricarica(true)}
            >
              Riprova
            </button>
          </div>
        </main>
      )
    }
    const { viaggio } = stato
    if (pc) {
      return (
        <Ponte
          nave={stato.nave}
          viaggio={viaggio}
          scarto={scarto}
          scoperte={scoperte}
          scansioni={scansioni}
          meta={pagina.pagina === 'ponte' ? pagina.meta : undefined}
          onParti={parti}
          archivio={{
            diario: { contenuto: <Diario voci={voci} letto={lettoAperto} ora={ora} /> },
            wiki: statoWiki ? { contenuto: <Wiki stato={statoWiki} voce={wikiPC.voce} numeri={wikiPC.numeri} affiancata /> } : undefined,
            catalogo: { contenuto: <ContenutoCatalogo scoperte={scoperte} /> },
            ricerche: { contenuto: <AlberoRicerche nave={stato.nave} ora={ora} /> },
            rete: { contenuto: <Rete nave={stato.nave} insediamenti={insediamenti} ora={ora} /> },
            nave: { contenuto: <SchedaNave nave={stato.nave} quantita={bordo?.quantita ?? stato.carico.quantita} ora={ora} /> },
            impostazioni: { contenuto: <Impostazioni /> },
          }}
        />
      )
    }
    if (pagina.pagina === 'ricerche') {
      return (
        <Cornice
          pagina="ricerche"
          nave={stato.nave}
          viaggio={viaggio}
          scarto={scarto}
          fondo={<FondoNave nave={stato.nave} scarto={scarto} />}
        >
          <AlberoRicerche nave={stato.nave} ora={ora} />
        </Cornice>
      )
    }
    if (pagina.pagina === 'rete') {
      return (
        <Cornice pagina="rete" nave={stato.nave} viaggio={viaggio} scarto={scarto} fondo={<FondoNave nave={stato.nave} scarto={scarto} />}>
          <Rete nave={stato.nave} insediamenti={insediamenti} ora={ora} />
        </Cornice>
      )
    }
    if (pagina.pagina === 'nave') {
      return (
        <Cornice pagina="nave" nave={stato.nave} viaggio={viaggio} scarto={scarto} fondo={<FondoNave nave={stato.nave} scarto={scarto} />}>
          <SchedaNave nave={stato.nave} quantita={bordo?.quantita ?? stato.carico.quantita} ora={ora} />
        </Cornice>
      )
    }
    if (pagina.pagina === 'diario') {
      return (
        <Cornice
          pagina="diario"
          nave={stato.nave}
          viaggio={viaggio}
          scarto={scarto}
          fondo={<FondoNave nave={stato.nave} scarto={scarto} />}
        >
          <Diario
            voci={voci}
            letto={lettoAperto}
            ora={ora}
            onChiudi={() => {
              segnaLetto(ora)
              chiudiDiario()
            }}
          />
        </Cornice>
      )
    }
    if (pagina.pagina === 'catalogo') {
      return (
        <Catalogo
          nave={stato.nave}
          viaggio={viaggio}
          scarto={scarto}
          scoperte={scoperte}
          fondo={<FondoNave nave={stato.nave} scarto={scarto} />}
        />
      )
    }
    if (pagina.pagina === 'altro') {
      const tipi = new Set(scoperte.map((s) => s.tipo)).size
      return (
        <Cornice pagina="altro" nave={stato.nave} viaggio={viaggio} scarto={scarto} fondo={<FondoNave nave={stato.nave} scarto={scarto} />}>
          <Altro
            voci={[
              {
                titolo: 'Ricerche',
                sottotitolo: (() => {
                  const inCorso = ricerche.find((r) => r.fine > ora)
                  return inCorso ? `In corso: ${inCorso.nodo}` : `${ricercheFatte(ricerche, ora).size} fatte`
                })(),
                pagina: { pagina: 'ricerche' },
              },
              {
                titolo: 'Diario di bordo',
                sottotitolo: daLeggere ? `${daLeggere} novità` : 'Nessuna novità',
                pagina: { pagina: 'diario' },
                pallino: daLeggere > 0,
              },
              {
                titolo: 'Wiki',
                sottotitolo: wikiNuove.length
                  ? `Nuova pagina: ${wikiNuove.map((id) => PAGINE_WIKI.find((p) => p.id === id)?.titolo).join(', ')}`
                  : `${PAGINE_WIKI.filter((p) => statoWiki && p.sbloccata(statoWiki)).length} pagine aperte su ${PAGINE_WIKI.length}`,
                pagina: { pagina: 'wiki' },
                pallino: wikiNuove.length > 0,
              },
              {
                titolo: 'Catalogo',
                sottotitolo: `${scoperte.length} ${scoperte.length === 1 ? 'corpo' : 'corpi'} · ${tipi} tipi su ${TIPI.length}`,
                pagina: { pagina: 'catalogo' },
              },
              {
                titolo: 'Impostazioni',
                sottotitolo: `Suoni ${impostazioni.suoni ? 'accesi' : 'spenti'} · ${NOMI_MOVIMENTO[impostazioni.movimento]}`,
                pagina: { pagina: 'impostazioni' },
              },
              ...(import.meta.env.DEV
                ? [
                    {
                      titolo: 'Osservatorio',
                      sottotitolo: 'Solo in sviluppo: qualsiasi settore, senza nave',
                      pagina: { pagina: 'osservatorio', coordinate: BASE } as const,
                    },
                  ]
                : []),
            ]}
          />
        </Cornice>
      )
    }
    if (pagina.pagina === 'wiki' && statoWiki) {
      return (
        <Cornice pagina="wiki" nave={stato.nave} viaggio={viaggio} scarto={scarto} fondo={<FondoNave nave={stato.nave} scarto={scarto} />}>
          <Wiki stato={statoWiki} voce={pagina.voce} numeri={pagina.numeri} />
        </Cornice>
      )
    }
    if (pagina.pagina === 'impostazioni') {
      return (
        <Cornice
          pagina="impostazioni"
          nave={stato.nave}
          viaggio={viaggio}
          scarto={scarto}
          fondo={<FondoNave nave={stato.nave} scarto={scarto} />}
        >
          <Impostazioni />
        </Cornice>
      )
    }
    if (pagina.pagina === 'mappa') {
      return <Mappa nave={stato.nave} viaggio={viaggio} scarto={scarto} scoperte={scoperte} scansioni={scansioni} />
    }
    return (
      <Ponte
        nave={stato.nave}
        viaggio={stato.viaggio}
        scarto={scarto}
        scoperte={scoperte}
        scansioni={scansioni}
        meta={pagina.pagina === 'ponte' ? pagina.meta : undefined}
        onParti={parti}
      />
    )
  }
  return (
    <Pallini.Provider value={pallini}>
      <UltimaVoce.Provider value={ultima}>
        <CaricoAttuale.Provider value={bordo}>
          <AzioniNave.Provider value={azioni}>{vista()}</AzioniNave.Provider>
        </CaricoAttuale.Provider>
      </UltimaVoce.Provider>
    </Pallini.Provider>
  )
}

/**
 * L'osservatorio di M1: guarda qualsiasi settore, senza nave né viaggi. Resta
 * solo in sviluppo, per provare i corpi e le loro grafiche (doc/06-roadmap.md).
 */
function PaginaOsservatorio({ pagina }: { pagina: Extract<Pagina, { pagina: 'osservatorio' }> }) {
  const { x, y, z } = pagina.coordinate
  // Un oggetto nuovo solo quando cambiano le coordinate: la scena si rifà solo allora.
  const settore = useMemo(() => calcolaSettore({ x, y, z }), [x, y, z])
  return (
    <main className="relative h-dvh overflow-hidden bg-black">
      <Suspense fallback={null}>
        <Scena settore={settore} />
      </Suspense>
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between gap-3 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <header className="pointer-events-auto flex items-start justify-between gap-2">
          <div className="flex flex-col gap-2">
            <h1 className="m-0 text-xs font-semibold tracking-[0.3em] text-testo-tenue">SPACE · OSSERVATORIO</h1>
            <Osservatorio settore={settore} />
          </div>
          <a
            href={indirizzo({ pagina: 'altro' })}
            className="etichetta rounded-plancia border border-linea bg-pannello/85 px-3 py-2.5 no-underline"
          >
            Esci
          </a>
        </header>
        <Pannello className="pointer-events-auto w-full max-w-sm self-start p-3.5">
          <Scheda settore={settore} />
        </Pannello>
      </div>
    </main>
  )
}

/** La scena del settore dove sta la nave, di fondo alle pagine che non ne hanno una propria. */
function FondoNave({ nave, scarto }: { nave: Nave; scarto: number }) {
  const volo = inViaggio(nave, useOra(scarto))
  const { x, y, z } = nave.posizione
  const settore = useMemo(() => calcolaSettore({ x, y, z }), [x, y, z])
  return (
    <Suspense fallback={null}>
      <Scena settore={settore} inViaggio={volo} />
    </Suspense>
  )
}
