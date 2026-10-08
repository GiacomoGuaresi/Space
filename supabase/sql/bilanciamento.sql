-- Space · Bilanciamento (doc/09-bilanciamento.md).
--
-- GENERATO da src/dominio/bilanciamento.ts con `npm run bilanciamento`: non
-- modificarlo a mano. Si applica dopo gli script numerati, ogni volta che i
-- valori cambiano. Rilanciabile.

create or replace function space.bilanciamento() returns jsonb
language sql immutable parallel safe set search_path = '' as $$
  select '{
  "universo": {
    "pienezza": 0.1,
    "distanzaLontana": 500,
    "pesiVicini": {
      "asteroidi": 30,
      "nebulosa": 25,
      "stella": 25,
      "sistema": 12,
      "gigante": 4,
      "cometa": 4,
      "pulsar": 0,
      "buconero": 0,
      "relitto": 0,
      "wormhole": 0
    },
    "pesiLontani": {
      "asteroidi": 22,
      "nebulosa": 18,
      "stella": 18,
      "sistema": 14,
      "gigante": 7,
      "cometa": 6,
      "pulsar": 5,
      "buconero": 4,
      "relitto": 4,
      "wormhole": 2
    },
    "soglie": {
      "pulsar": 25,
      "buconero": 80,
      "relitto": 80,
      "wormhole": 150
    }
  },
  "nave": {
    "velocita": 0.25,
    "serbatoio": 4,
    "ricarica": 0.4
  },
  "carburante": {
    "tettoFuori": 0.5,
    "ricaricaStella": 2
  },
  "fionda": {
    "velocita": 1.5,
    "gratis": 0.2
  },
  "scanner": {
    "raggio": 4,
    "crescita": 1.2,
    "livelli": [
      "sistema",
      "raggio",
      "asteroidi",
      "raggio",
      "nebulosa",
      "raggio",
      "stella",
      "raggio",
      "gigante",
      "raggio",
      "cometa",
      "raggio",
      "pulsar",
      "raggio",
      "raggio",
      "buconero",
      "raggio",
      "relitto",
      "raggio",
      "raggio",
      "wormhole"
    ],
    "nebulosa": 0.5,
    "pulsar": 2
  }
}'::jsonb
$$;

revoke all on function space.bilanciamento() from public, anon;
grant execute on function space.bilanciamento() to authenticated;
