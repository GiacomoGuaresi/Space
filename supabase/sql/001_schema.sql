-- Space · 001 · Schema vuoto (doc/04-architettura.md).
--
-- Gira sul progetto Supabase di produzione di Grocery, in uno schema dedicato:
-- nessuna tabella delle altre app viene toccata.
-- Si applica a mano, non con `supabase db push`, che andrebbe in conflitto con
-- lo storico migrazioni di Grocery (doc/08-deploy.md).
--
-- Dopo averlo eseguito: aggiungere `space` agli Exposed schemas della Data API.
--
-- Le tabelle arrivano con i macro step che le usano, ognuna con RLS e grant suoi.
-- Rilanciabile.

create schema if not exists space;

-- Permessi ----------------------------------------------------------------------
-- Solo la sessione aperta con la passphrase (ruolo authenticated) usa lo schema.

revoke all on schema space from public, anon;
grant usage on schema space to authenticated;
