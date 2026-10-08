// Per gli script in Node: il codice di src/ importa senza estensione, come
// vuole Vite. Qui si aggiunge `.ts` agli import relativi che non la hanno.
import { registerHooks } from 'node:module'

registerHooks({
  resolve(specificatore, contesto, prossimo) {
    if (/^\.\.?\//.test(specificatore) && !/\.[cm]?[jt]sx?$|\.json$/.test(specificatore)) {
      return prossimo(`${specificatore}.ts`, contesto)
    }
    return prossimo(specificatore, contesto)
  },
})
