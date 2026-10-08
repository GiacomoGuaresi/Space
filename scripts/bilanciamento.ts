// Scrive supabase/sql/bilanciamento.sql da src/dominio/bilanciamento.ts: i
// valori del gioco si cambiano solo in TypeScript.
//
//   npm run bilanciamento
//
// Poi lo script SQL si applica al database e `npm run verifica-sql` controlla
// che i due coincidano (doc/08-deploy.md).

import { writeFileSync } from 'node:fs'
import { BILANCIAMENTO } from '../src/dominio/bilanciamento.ts'

const json = JSON.stringify(BILANCIAMENTO, null, 2).replaceAll("'", "''")

writeFileSync(
  new URL('../supabase/sql/bilanciamento.sql', import.meta.url),
  `-- Space · Bilanciamento (doc/09-bilanciamento.md).
--
-- GENERATO da src/dominio/bilanciamento.ts con \`npm run bilanciamento\`: non
-- modificarlo a mano. Si applica dopo gli script numerati, ogni volta che i
-- valori cambiano. Rilanciabile.

create or replace function space.bilanciamento() returns jsonb
language sql immutable parallel safe set search_path = '' as $$
  select '${json}'::jsonb
$$;

revoke all on function space.bilanciamento() from public, anon;
grant execute on function space.bilanciamento() to authenticated;
`,
)
console.log('supabase/sql/bilanciamento.sql scritto')
