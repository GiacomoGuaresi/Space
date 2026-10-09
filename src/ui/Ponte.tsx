import { Suspense, lazy, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Scansione, Scoperta } from '../dati'
import { inViaggio, type Nave, type Viaggio } from '../dominio/navigazione'
import { settore as calcolaSettore, type Coordinate } from '../dominio/settore'
import { vaiA } from './indirizzo'
import { Cornice } from './Cornice'
import { Finestra } from './Finestra'
import { apri, chiudi, FINESTRE, inPrimoPiano, useDisposizione, type IdFinestra } from './finestre'
import { useSfondoMappa } from './Mappa'
import { DentroFinestra, Pannello } from './plancia'
import { Fonda, fondabile, FondabileQui, InvitoFonda } from './Fondazione'
import { CaricoAttuale } from './SchedaNave'
import { AcceleraRicarica, AcceleraViaggio } from './Accelera'
import { Varco } from './Varco'
import { MagazzinoQui } from './Magazzino'
import { Raccolta } from './Raccolta'
import { Rotta } from './Rotta'
import { InArrivo } from './InArrivo'
import { Scanner } from './Scanner'
import { Scheda } from './Scheda'
import { Attraccata, SchedaBase, useBaseQui } from './SchedaBase'
import { usePC } from './schermo'
import { Scorciatoie, useTastiera } from './tastiera'
import { useOra } from './useNave'

const Scena = lazy(async () => ({ default: (await import('../grafica/Scena')).Scena }))

type Linguetta = 'qui' | 'scanner' | 'rotta' | 'base' | 'fonda'

interface Props {
  nave: Nave
  viaggio: Viaggio | null
  scarto: number
  scoperte: Scoperta[]
  scansioni: Scansione[]
  /** Una meta scelta altrove (dalla mappa): apre la rotta. */
  meta?: Coordinate
  onParti: (meta: Coordinate) => Promise<void>
  /** Su PC: le altre finestre della plancia (diario, wiki…), con il loro contenuto. */
  archivio?: Partial<Record<IdFinestra, { contenuto: ReactNode; onChiudi?: () => void }>>
}

/**
 * Il ponte di comando (M2): la vista del settore dove sta la nave (o il
 * viaggio, se è in volo), lo stato della nave in alto e in basso il settore,
 * lo scanner e la rotta: sul telefono come schede di un pannello, su PC il
 * settore sempre sullo sfondo e scanner e rotta come finestre
 * (doc/11-interfaccia.md#finestre), insieme a quelle dell'archivio.
 */
export function Ponte({ nave, viaggio, scarto, scoperte, scansioni, meta: metaScelta, onParti, archivio = {} }: Props) {
  const ora = useOra(scarto)
  const volo = inViaggio(nave, ora)
  const { x, y, z } = nave.posizione
  const settore = useMemo(() => calcolaSettore({ x, y, z }), [x, y, z])
  const scoperti = useMemo(() => new Set(scoperte.map(({ coordinate: c }) => `${c.x},${c.y},${c.z}`)), [scoperte])
  const [scheda, setScheda] = useState<Linguetta>(metaScelta ? 'rotta' : 'qui')
  const [meta, setMeta] = useState<Coordinate | null>(metaScelta ?? null)
  const pc = usePC()
  const disposizione = useDisposizione()
  useTastiera(pc)
  const base = useBaseQui(nave, ora)
  // Fonda c'è solo dove si può fondare: altrove la finestra (o la linguetta) si chiude.
  const fondare = fondabile(nave, ora, useContext(CaricoAttuale))
  const fondaAperta = disposizione.finestre.fonda.stato !== 'chiusa'
  useEffect(() => {
    if (fondare === null && fondaAperta) chiudi('fonda')
  }, [fondare, fondaAperta])
  useEffect(() => {
    if (fondare === null) setScheda((s) => (s === 'fonda' ? 'qui' : s))
  }, [fondare])
  // Arrivando in una base, su PC la sua finestra si apre da sola.
  const arrivo = nave.dal.getTime()
  const idBase = base?.id
  useEffect(() => {
    if (pc && idBase !== undefined) apri('base')
  }, [pc, idBase, arrivo])

  const { x: mx, y: my, z: mz } = metaScelta ?? { x: null, y: null, z: null }
  useEffect(() => {
    if (mx === null || my === null || mz === null) return
    setMeta({ x: mx, y: my, z: mz })
    setScheda('rotta')
    apri('rotta')
  }, [mx, my, mz])

  // Scegliere una meta apre la rotta: la scheda sul telefono, la finestra su PC.
  const scegli = (c: Coordinate) => {
    setMeta(c)
    setScheda('rotta')
    apri('rotta')
  }

  const fondo = (
    <Suspense fallback={null}>
      <Scena settore={settore} inViaggio={volo} />
    </Suspense>
  )
  // Su PC dietro le finestre può esserci la mappa: un clic su un corpo apre la rotta.
  const mappa = useSfondoMappa({ nave: nave.posizione, scoperte, scansioni, meta, onScegli: scegli })
  const rotta = (
    <Rotta
      nave={nave}
      ora={ora}
      meta={meta}
      scoperti={scoperti}
      onMeta={setMeta}
      onParti={async (m) => {
        await onParti(m)
        setMeta(null)
        setScheda('qui')
        // La meta della mappa non serve più: l'indirizzo torna quello del ponte.
        if (metaScelta) vaiA({ pagina: 'ponte' })
      }}
    />
  )

  if (pc) {
    // Qui non è una finestra: sta sempre sullo sfondo, in basso a destra, sotto le finestre.
    const qui = (
      <section
        aria-label="Qui"
        className="pointer-events-auto absolute right-3 bottom-3 z-0 flex max-h-[calc(100%-1.5rem)] w-[340px] flex-col overflow-y-auto smussato border border-linea/60 bg-pannello/70 p-3 backdrop-blur-sm [--smusso-colore:color-mix(in_srgb,var(--color-linea)_60%,transparent)]"
      >
        <DentroFinestra.Provider value={true}>
          {volo && (
            <div className="mb-3 border-b border-separatore pb-3">
              <AcceleraViaggio nave={nave} ora={ora} />
            </div>
          )}
          <Scheda settore={settore} />
          {!volo && <AcceleraRicarica nave={nave} ora={ora} />}
          <Raccolta nave={nave} ora={ora} />
          <MagazzinoQui nave={nave} ora={ora} />
          {fondare && <InvitoFonda cosa={fondare} onApri={() => apri('fonda')} />}
          <Varco nave={nave} ora={ora} />
        </DentroFinestra.Provider>
      </section>
    )
    const contenuti: Partial<Record<IdFinestra, { contenuto: ReactNode; onChiudi?: () => void }>> = {
      scanner: {
        contenuto: volo ? (
          <InArrivo nave={nave} viaggio={viaggio} ora={ora} cosa="Lo scanner torna disponibile all'arrivo." />
        ) : (
          <Scanner centro={nave.posizione} livello={nave.scanner} scoperti={scoperti} onScegli={scegli} />
        ),
      },
      rotta: {
        contenuto: volo ? <InArrivo nave={nave} viaggio={viaggio} ora={ora} cosa="La prossima rotta si imposta all'arrivo." /> : rotta,
      },
      ...(base ? { base: { contenuto: <SchedaBase nave={nave} ora={ora} base={base} /> } } : {}),
      ...(fondare ? { fonda: { contenuto: <Fonda nave={nave} ora={ora} /> } } : {}),
      ...archivio,
    }
    const attiva = inPrimoPiano(disposizione)
    return (
      <Attraccata.Provider value={base !== undefined}>
        <FondabileQui.Provider value={fondare}>
          <Cornice
            pagina="ponte"
            nave={nave}
            viaggio={viaggio}
            scarto={scarto}
            fondo={disposizione.sfondo === 'mappa' ? mappa.fondo : fondo}
            barretta={disposizione.sfondo === 'mappa' ? mappa.barretta : undefined}
            finestre
          >
            {qui}
            {(Object.keys(FINESTRE) as IdFinestra[])
              .filter((id) => disposizione.finestre[id].stato === 'aperta' && contenuti[id])
              .map((id) => (
                <Finestra
                  key={id}
                  id={id}
                  finestra={disposizione.finestre[id]}
                  livello={disposizione.ordine.indexOf(id) + 1}
                  attiva={attiva === id}
                  onChiudi={contenuti[id]!.onChiudi}
                >
                  {contenuti[id]!.contenuto}
                </Finestra>
              ))}
            <Scorciatoie />
          </Cornice>
        </FondabileQui.Provider>
      </Attraccata.Provider>
    )
  }

  const linguetta = (valore: Linguetta, testo: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={scheda === valore}
      className="etichetta border-b-2 border-transparent py-3 text-center aria-selected:border-ambra aria-selected:text-ambra"
      onClick={() => setScheda(valore)}
    >
      {testo}
    </button>
  )

  return (
    <Cornice pagina="ponte" nave={nave} viaggio={viaggio} scarto={scarto} fondo={fondo}>
      {volo ? (
        <Pannello className="flex flex-col p-3">
          <InArrivo
            nave={nave}
            viaggio={viaggio}
            ora={ora}
            cosa="Lo scanner e la rotta tornano disponibili all'arrivo. Il nome di quello che c'è laggiù lo scoprirai arrivando."
          />
          <AcceleraViaggio nave={nave} ora={ora} />
        </Pannello>
      ) : (
        <Pannello className="flex max-h-[58dvh] flex-col">
          <div
            className="grid border-b border-linea"
            style={{
              gridTemplateColumns: `repeat(${3 + (base ? 1 : 0) + (fondare ? 1 : 0)}, minmax(0, 1fr))`,
            }}
            role="tablist"
          >
            {linguetta('qui', 'Qui')}
            {linguetta('scanner', 'Scanner')}
            {linguetta('rotta', 'Rotta')}
            {base && linguetta('base', 'Base')}
            {fondare && linguetta('fonda', 'Fonda')}
          </div>
          <div
            className={`min-h-0 ${scheda === 'scanner' ? 'flex flex-col' : 'overflow-y-auto'} ${(scheda === 'base' && base) || scheda === 'scanner' || scheda === 'fonda' ? '' : 'p-3.5'}`}
            role="tabpanel"
          >
            {scheda === 'base' && base ? (
              <DentroFinestra.Provider value={true}>
                <SchedaBase nave={nave} ora={ora} base={base} />
              </DentroFinestra.Provider>
            ) : scheda === 'fonda' && fondare ? (
              <Fonda nave={nave} ora={ora} />
            ) : scheda === 'qui' || scheda === 'base' || scheda === 'fonda' ? (
              <>
                <Scheda settore={settore} />
                <AcceleraRicarica nave={nave} ora={ora} />
                <Raccolta nave={nave} ora={ora} />
                <MagazzinoQui nave={nave} ora={ora} />
                {fondare && <InvitoFonda cosa={fondare} onApri={() => setScheda('fonda')} />}
                <Varco nave={nave} ora={ora} />
              </>
            ) : scheda === 'scanner' ? (
              <Scanner centro={nave.posizione} livello={nave.scanner} scoperti={scoperti} onScegli={scegli} />
            ) : (
              rotta
            )}
          </div>
        </Pannello>
      )}
    </Cornice>
  )
}
