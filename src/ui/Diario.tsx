import { useEffect, useMemo, useState } from 'react'
import { orario } from './formato'
import { NOMI_VOCI, novita, raggruppa, type Voce } from './voci'
import { BottonePrimario, Etichetta, Pannello } from './plancia'

interface Props {
  voci: readonly Voce[]
  /** Fin dove era stato letto quando il diario si è aperto. */
  letto: Date | null
  ora: Date
  /** Su PC, in una finestra, si chiude con la sua × e Chiudi non serve. */
  onChiudi?: () => void
}

/**
 * Il diario di bordo (doc/11-interfaccia.md#diario-di-bordo): dal più recente,
 * prima le novità evidenziate, poi "Già visti". Le voci consecutive dello
 * stesso tipo si raggruppano e si aprono con un tocco.
 */
export function Diario({ voci, letto, ora, onChiudi }: Props) {
  const nuove = useMemo(() => voci.filter((v) => novita(v, letto)).length, [voci, letto])
  // In alto ciò che è successo dopo l'ultima lettura (partenze comprese, ma non
  // evidenziate: le hai decise tu), sotto il resto.
  const sezioni = useMemo(() => {
    const confine = voci.findIndex((v) => letto !== null && v.quando <= letto)
    const fino = confine === -1 ? voci.length : confine
    return { nuove: raggruppa(voci.slice(0, fino)), viste: raggruppa(voci.slice(fino)) }
  }, [voci, letto])

  // Esc chiude, come il bottone.
  useEffect(() => {
    if (!onChiudi) return
    const tasto = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onChiudi()
    }
    document.addEventListener('keydown', tasto)
    return () => document.removeEventListener('keydown', tasto)
  }, [onChiudi])

  return (
    <Pannello className="flex min-h-0 flex-1 flex-col" etichetta="Diario di bordo">
      <header className="flex flex-col gap-1 border-b border-linea p-3.5">
        <h1 className="m-0 text-base font-semibold tracking-[0.2em] uppercase">Diario di bordo</h1>
        <Etichetta className={nuove ? 'text-ambra!' : ''}>
          {nuove ? `${nuove} novità` : 'Nessuna novità'}
          {letto ? ` dall'ultima lettura · ${orario(letto, ora)}` : ''}
        </Etichetta>
      </header>
      <ol className="m-0 min-h-0 flex-1 list-none overflow-y-auto p-0">
        {voci.length === 0 && <li className="p-3.5 text-[13px] text-testo-tenue">Ancora niente: il diario si riempie viaggiando.</li>}
        {sezioni.nuove.map((g) => (
          <Gruppo key={`n${g[0].quando.getTime()}${g[0].tipo}`} voci={g} nuova={(v) => novita(v, letto)} ora={ora} />
        ))}
        {sezioni.viste.length > 0 && sezioni.nuove.length > 0 && (
          <li className="border-b border-separatore px-3.5 py-2">
            <Etichetta>Già visti</Etichetta>
          </li>
        )}
        {sezioni.viste.map((g) => (
          <Gruppo key={`v${g[0].quando.getTime()}${g[0].tipo}`} voci={g} nuova={() => false} ora={ora} />
        ))}
      </ol>
      {onChiudi && (
        <div className="border-t border-linea p-3">
          <BottonePrimario className="w-full" autoFocus onClick={onChiudi}>
            Chiudi
          </BottonePrimario>
        </div>
      )}
    </Pannello>
  )
}

function Gruppo({ voci, nuova, ora }: { voci: Voce[]; nuova: (v: Voce) => boolean; ora: Date }) {
  const [aperto, setAperto] = useState(false)
  const [prima] = voci
  if (voci.length === 1 || aperto) {
    return (
      <>
        {voci.map((v, i) => (
          <Riga key={i} voce={v} nuova={nuova(v)} ora={ora} />
        ))}
      </>
    )
  }
  const nomi = [...new Set(voci.map((v) => v.breve))]
  return (
    <li className={`border-b border-separatore ${nuova(prima) ? 'bg-ambra/7' : ''}`}>
      <button
        type="button"
        aria-expanded={false}
        className="grid w-full grid-cols-[52px_1fr] gap-x-2.5 gap-y-0.5 px-3.5 py-2.5 text-left"
        onClick={() => setAperto(true)}
      >
        <span className="cifre row-span-2 text-xs text-testo-tenue">{orario(prima.quando, ora)}</span>
        <Etichetta className={nuova(prima) ? 'text-ambra!' : ''}>
          {NOMI_VOCI[prima.tipo].uno} ×{voci.length}
        </Etichetta>
        <span className="text-[13px] leading-snug">
          {voci.length} {NOMI_VOCI[prima.tipo].tanti}: {nomi.slice(0, 4).join(', ')}
          {nomi.length > 4 ? '…' : ''} <span className="text-ambra">▾</span>
        </span>
      </button>
    </li>
  )
}

function Riga({ voce, nuova, ora }: { voce: Voce; nuova: boolean; ora: Date }) {
  return (
    <li className={`grid grid-cols-[52px_1fr] gap-x-2.5 gap-y-0.5 border-b border-separatore px-3.5 py-2.5 ${nuova ? 'bg-ambra/7' : ''}`}>
      <span className="cifre row-span-2 text-xs text-testo-tenue">{orario(voce.quando, ora)}</span>
      <Etichetta className={nuova ? 'text-ambra!' : ''}>{NOMI_VOCI[voce.tipo].uno}</Etichetta>
      <span className="text-[13px] leading-snug">{voce.testo}</span>
    </li>
  )
}
