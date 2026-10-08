import { Suspense, lazy, useEffect, useMemo, useState, type ReactNode } from 'react'
import { CATALOGO, TIPI } from '../dominio/catalogo'
import { corpiNoti } from '../dominio/mappa'
import { inViaggio, type Nave } from '../dominio/navigazione'
import { BASE, settore as calcolaSettore } from '../dominio/settore'
import { Altro } from './Altro'
import { Pallini } from './Barra'
import { Catalogo } from './Catalogo'
import { Cornice } from './Cornice'
import { Diario } from './Diario'
import { novita, segnaLetto, useLetto, vociDiario } from './diario'
import { Impostazioni } from './Impostazioni'
import { useImpostazioni, type Movimento } from './impostazioni'
import { apriDiario, chiudiDiario, indirizzo, usePagina, type Pagina } from './indirizzo'
import { Mappa } from './Mappa'
import { Osservatorio } from './Osservatorio'
import { segnaPonteVisto, useVisti } from './pallini'
import { Pannello } from './plancia'
import { Ponte } from './Ponte'
import { Scheda } from './Scheda'
import { useNave, useOra } from './useNave'

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
  const { stato, scarto, scoperte, scansioni, viaggi, aperturaDiario, parti, ricarica } = useNave()
  const ora = useOra(scarto)

  // Il diario si ricalcola al minuto: le voci nuove (un arrivo, una ricarica) compaiono da sole.
  const minuto = Math.floor(ora.getTime() / 60_000)
  const nave = stato.fase === 'pronta' ? stato.nave : null
  const voci = useMemo(
    () => (nave ? vociDiario({ viaggi, scoperte, scansioni, nave, ora: new Date(minuto * 60_000) }) : []),
    [viaggi, scoperte, scansioni, nave, minuto],
  )
  const diarioAperto = pagina.pagina === 'diario'
  const lettoOra = useLetto()
  // Mentre il diario è aperto vale la lettura di quando si è aperto: le novità restano evidenziate.
  const [lettoCongelato, setLettoCongelato] = useState<Date | null>(null)
  useEffect(() => {
    setLettoCongelato(diarioAperto ? lettoOra : null)
    // Solo all'apertura e alla chiusura: in mezzo la lettura può cambiare senza toccare ciò che si vede.
  }, [diarioAperto])
  const lettoAperto = diarioAperto ? (lettoCongelato ?? lettoOra) : lettoOra
  const daLeggere = voci.filter((v) => novita(v, lettoAperto)).length

  // Pallini: Ponte se la nave è arrivata da quando l'hai visto, Mappa se c'è un
  // raro rilevato mai visitato né aperto, Altro se il diario ha novità.
  const visti = useVisti()
  const impostazioni = useImpostazioni()
  const noti = useMemo(() => corpiNoti(scansioni, scoperte), [scansioni, scoperte])
  const volo = nave ? inViaggio(nave, ora) : true
  const arrivoNonVisto = nave !== null && !volo && (!visti.ponte || nave.dal > new Date(visti.ponte))
  const rariNuovi = noti.filter(
    (p) => !p.scoperto && ['rara', 'leggendaria'].includes(CATALOGO[p.tipo].rarita) && !visti.rari.includes(`${p.coordinate.x},${p.coordinate.y},${p.coordinate.z}`),
  ).length
  const pallini = useMemo(
    () => ({
      ponte: arrivoNonVisto ? 'la nave è arrivata' : undefined,
      mappa: rariNuovi ? `${rariNuovi} ${rariNuovi === 1 ? 'corpo raro rilevato' : 'corpi rari rilevati'}` : undefined,
      altro: daLeggere ? `${daLeggere} novità nel diario` : undefined,
    }),
    [arrivoNonVisto, rariNuovi, daLeggere],
  )
  // Sul ponte, a nave ferma, l'arrivo è visto.
  useEffect(() => {
    if (pagina.pagina === 'ponte' && arrivoNonVisto && nave) segnaPonteVisto(nave.dal)
  }, [pagina.pagina, arrivoNonVisto, nave])

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
            <button type="button" className="rounded-plancia border border-linea px-4 py-2 text-sm hover:border-ambra" onClick={() => void ricarica(true)}>
              Riprova
            </button>
          </div>
        </main>
      )
    }
    const { viaggio } = stato
    if (pagina.pagina === 'diario') {
      return (
        <Cornice pagina="diario" nave={stato.nave} viaggio={viaggio} scarto={scarto} fondo={<FondoNave nave={stato.nave} scarto={scarto} />}>
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
                titolo: 'Diario di bordo',
                sottotitolo: daLeggere ? `${daLeggere} novità` : 'Nessuna novità',
                pagina: { pagina: 'diario' },
                pallino: daLeggere > 0,
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
                ? [{ titolo: 'Osservatorio', sottotitolo: 'Solo in sviluppo: qualsiasi settore, senza nave', pagina: { pagina: 'osservatorio', coordinate: BASE } as const }]
                : []),
            ]}
          />
        </Cornice>
      )
    }
    if (pagina.pagina === 'impostazioni') {
      return (
        <Cornice pagina="impostazioni" nave={stato.nave} viaggio={viaggio} scarto={scarto} fondo={<FondoNave nave={stato.nave} scarto={scarto} />}>
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
        meta={pagina.pagina === 'ponte' ? pagina.meta : undefined}
        onParti={parti}
      />
    )
  }
  return <Pallini.Provider value={pallini}>{vista()}</Pallini.Provider>
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
          <a href={indirizzo({ pagina: 'altro' })} className="etichetta rounded-plancia border border-linea bg-pannello/85 px-3 py-2.5 no-underline">
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
