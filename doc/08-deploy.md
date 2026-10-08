# 08 · Deploy e manutenzione

## Repository

- Pubblico, `github.com/GiacomoGuaresi/Space`, licenza **MIT**
- Branch principale `main`

## Frontend → GitHub Pages

Workflow `.github/workflows/pubblica.yml`, come nelle altre app. A ogni push su `main`:
1. `npm ci`
2. controllo che le variabili siano presenti
3. `npm test`
4. `npm run build`
5. pubblicazione di `dist/` con `actions/upload-pages-artifact` + `actions/deploy-pages`

Variabili del repository (Settings → Secrets and variables → Actions → **Variables**, perché finiscono nel bundle pubblico): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_EMAIL`, con gli stessi valori di produzione delle altre app. Impostate il 2026-10-08 con `gh variable set`.

URL: `https://giacomoguaresi.github.io/Space/`. Vite ha `base: '/Space/'`. Pages è attivo con sorgente "GitHub Actions" dal 2026-10-08.

## Sviluppo locale

`.env.local` con le stesse tre variabili (vedi `.env.example`): `npm run dev` lavora sul progetto di produzione, nello schema `space`.

## Database → Supabase

| Aspetto | Decisione |
|---|---|
| Progetto | **produzione di Grocery** |
| Schema | `space`, esposto nell'API |
| Script SQL | `supabase/sql/NNN_*.sql`, applicati a mano |
| Keep-alive | non serve |

## Configurazioni una tantum

Fatte il 2026-10-08 con la Management API:
1. Script `001_schema.sql` applicato (`POST /v1/projects/{ref}/database/query`)
2. `space` aggiunto agli *Exposed schemas* (`PATCH /v1/projects/{ref}/postgrest`). La lista `db_schema` si manda sempre intera, con gli schemi delle altre app
3. `https://giacomoguaresi.github.io/Space/` aggiunto agli URL di redirect di Auth (`PATCH /v1/projects/{ref}/config/auth`, `uri_allow_list`). Anche questa lista si manda intera

Gli script successivi si applicano allo stesso modo, oppure dal SQL Editor. Applicati il 2026-10-08: `002_navigazione.sql`, `003_bilanciamento.sql`, `004_nave_v1.sql`, `005_soglie_rari.sql`, `006_scanner.sql`, `007_scansione.sql`, `008_stiva.sql`, `009_raccolta.sql`, `010_comete.sql`, `011_insediamenti.sql`, `012_raccolta_di_persona.sql`, `013_colonie.sql`, `014_altre_basi.sql`, `015_cantiere.sql`, `016_deposito.sql`, `017_ricerche.sql`, `018_ingegneria.sql`, `019_colonizzazione.sql`, `020_sensori.sql`, `021_propulsione.sql`, e `bilanciamento.sql` con i valori v1 (riapplicato dopo ogni modifica di `bilanciamento.ts`).

### Cambiare un valore del bilanciamento

I numeri si cambiano solo in `src/dominio/bilanciamento.ts`. Poi:
1. `npm run bilanciamento` riscrive `supabase/sql/bilanciamento.sql` (generato, non si modifica a mano);
2. si applica quello script al database;
3. `npm run verifica-sql` controlla che i due coincidano.

Se il cambiamento tocca dati già salvati (per esempio le statistiche della nave), serve anche uno script numerato che li aggiorni.

### Verifica dell'universo in SQL

I valori del bilanciamento e le funzioni dell'universo esistono due volte, in TypeScript (`src/dominio/bilanciamento.ts`, `settore.ts`, `navigazione.ts`) e in SQL (`space.bilanciamento()` e le funzioni che lo leggono), e devono dare risultati identici. Dopo ogni modifica a una delle due:

```sh
SUPABASE_ACCESS_TOKEN=sbp_... npm run verifica-sql
```

Lo script confronta i due bilanciamenti come JSON, i raggi dello scanner per livello, poi il campione fisso `src/dominio/campione.json` (seed, tipi, rotte), che `npm test` confronta già con TypeScript. Quando l'universo o le rotte cambiano di proposito, il campione si rigenera con `npm run campione` (gli script in Node leggono il codice di `src/` grazie a `scripts/estensioni.mjs`). Il token della Management API sta in `credenziali.local`, nella cartella sopra i repository, mai nel repo.

⚠️ Il progetto è quello di produzione di Grocery: ogni modifica alla configurazione va fatta senza toccare le impostazioni usate dalle altre app.
