// Le icone della plancia: Phosphor (phosphor-icons.com), a tratto sottile come
// un HUD. Qui stanno tutte, con il nome del gioco: per cambiarne una basta
// cambiare la riga.

import * as P from '@phosphor-icons/react'
import type { Icon, IconProps } from '@phosphor-icons/react'
import type { Lavoro } from '../dominio/cantiere'
import type { Risorsa } from '../dominio/risorse'
import type { IdFinestra } from './finestre'

/** Un'icona Phosphor col peso della plancia; si colora col testo (currentColor). */
function plancia(Icona: Icon) {
  const Leggera = (props: IconProps) => <Icona weight="light" aria-hidden={props['aria-label'] ? undefined : true} {...props} />
  Leggera.displayName = Icona.displayName
  return Leggera
}

// Le sezioni e le finestre.
export const IconaPonte = plancia(P.Crosshair)
export const IconaMappa = plancia(P.Globe)
export const IconaScanner = plancia(P.Broadcast)
export const IconaRotta = plancia(P.NavigationArrow)
export const IconaNave = plancia(P.RocketLaunch)
export const IconaRete = plancia(P.Graph)
export const IconaBase = plancia(P.Hexagon)
export const IconaRicerche = plancia(P.Flask)
export const IconaDiario = plancia(P.Notebook)
export const IconaWiki = plancia(P.BookOpenText)
export const IconaCatalogo = plancia(P.Cards)
export const IconaTraguardi = plancia(P.Medal)
export const IconaImpostazioni = plancia(P.GearSix)
export const IconaAltro = plancia(P.DotsNine)

// I comandi.
export const IconaRiordina = plancia(P.ArrowsCounterClockwise)
export const IconaScorciatoie = plancia(P.Keyboard)
export const IconaRiduci = plancia(P.Minus)
export const IconaChiudi = plancia(P.X)
export const IconaSu = plancia(P.CaretUp)
export const IconaGiu = plancia(P.CaretDown)
export const IconaCerca = plancia(P.MagnifyingGlass)
export const IconaCasa = plancia(P.House)
export const IconaMira = plancia(P.Crosshair)
export const IconaFatto = plancia(P.Check)
export const IconaBloccato = plancia(P.LockSimple)

// Le azioni e gli stati.
export const IconaFerma = plancia(P.Target)
export const IconaInVolo = plancia(P.NavigationArrow)
export const IconaVarco = plancia(P.Spiral)
export const IconaPianeta = plancia(P.Planet)
export const IconaCantiere = plancia(P.Wrench)
export const IconaAccelera = plancia(P.Lightning)
export const IconaPieno = plancia(P.GasPump)
export const IconaParti = plancia(P.RocketLaunch)
export const IconaFonda = plancia(P.Flag)
export const IconaEstrattore = plancia(P.Hammer)

// I sistemi della nave.
export const IconaMotore = plancia(P.Engine)
export const IconaSerbatoio = plancia(P.GasCan)
export const IconaRicarica = plancia(P.BatteryCharging)
export const IconaStiva = plancia(P.Package)
export const IconaProgetti = plancia(P.Blueprint)
export const IconaSistemi = plancia(P.Cpu)

// Le risorse.
/** L'icona di ogni risorsa: nella stiva, nei magazzini e accanto ai costi. */
export const ICONE_RISORSE: Readonly<Record<Risorsa, (props: IconProps) => React.JSX.Element>> = {
  metallo: plancia(P.Cube),
  silicio: plancia(P.Diamond),
  ghiaccio: plancia(P.Snowflake),
  idrogeno: plancia(P.Drop),
  terreRare: plancia(P.Sparkle),
  materiaOscura: plancia(P.CircleHalfTilt),
}

/** L'icona di una risorsa, col suo nome per chi non la vede (se non c'è già scritto accanto). */
export function IconaRisorsa({ risorsa, className = 'size-3.5', ...resto }: IconProps & { risorsa: Risorsa }) {
  const Icona = ICONE_RISORSE[risorsa]
  return <Icona className={`inline shrink-0 align-[-0.15em] ${className}`} {...resto} />
}

/** L'icona di ogni lavoro del cantiere (i moduli della scheda Nave). */
export const ICONE_LAVORI: Readonly<Record<Lavoro, (props: IconProps) => React.JSX.Element>> = {
  motore: IconaMotore,
  serbatoio: IconaSerbatoio,
  ricarica: IconaRicarica,
  scanner: IconaScanner,
  stiva: IconaStiva,
  produzione: IconaEstrattore,
  magazzino: plancia(P.Warehouse),
  cantiere: IconaCantiere,
  deposito: IconaPieno,
  laboratorio: IconaRicerche,
  radar: plancia(P.CellTower),
  ponte: IconaVarco,
}

/** L'icona di ogni finestra della plancia: nel dock e nel titolo della finestra. */
export const ICONE_FINESTRE: Readonly<Record<IdFinestra, (props: IconProps) => React.JSX.Element>> = {
  scanner: IconaScanner,
  rotta: IconaRotta,
  nave: IconaNave,
  rete: IconaRete,
  base: IconaBase,
  fonda: IconaFonda,
  ricerche: IconaRicerche,
  diario: IconaDiario,
  wiki: IconaWiki,
  catalogo: IconaCatalogo,
  traguardi: IconaTraguardi,
  impostazioni: IconaImpostazioni,
}
