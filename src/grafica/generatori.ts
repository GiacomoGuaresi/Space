// Il registro dei generatori: uno per ogni corpo del catalogo, più il vuoto.

import type { TipoCorpo } from '../dominio/catalogo'
import type { Generatore } from './comune'
import { asteroidi } from './corpi/asteroidi'
import { buconero } from './corpi/buconero'
import { cometa } from './corpi/cometa'
import { gigante } from './corpi/gigante'
import { nebulosa } from './corpi/nebulosa'
import { pulsar } from './corpi/pulsar'
import { relitto } from './corpi/relitto'
import { sistema } from './corpi/sistema'
import { stella } from './corpi/stella'
import { vuoto } from './corpi/vuoto'
import { wormhole } from './corpi/wormhole'

export const GENERATORI: Readonly<Record<TipoCorpo | 'vuoto', Generatore>> = {
  vuoto,
  asteroidi,
  nebulosa,
  stella,
  sistema,
  gigante,
  cometa,
  pulsar,
  buconero,
  relitto,
  wormhole,
}
