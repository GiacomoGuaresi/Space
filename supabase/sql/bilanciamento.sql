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
    "ricarica": 0.4,
    "crescita": 1.12
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
  },
  "stiva": {
    "capacita": 25,
    "crescita": 1.5
  },
  "produzione": {
    "ritmo": {
      "comune": 7,
      "terreRare": 3,
      "materiaOscura": 1.2
    },
    "mano": 3,
    "madre": 6,
    "crescita": 1.13
  },
  "fondazione": {
    "basi": 2,
    "costo": 150,
    "crescita": 1.6,
    "risorse": [
      "metallo",
      "silicio",
      "ghiaccio"
    ]
  },
  "cantiere": {
    "crescita": 1.45,
    "base": {
      "motore": 60,
      "serbatoio": 60,
      "ricarica": 60,
      "scanner": 60,
      "produzione": 40,
      "magazzino": 40,
      "deposito": 40,
      "cantiere": 50
    },
    "ore": 3,
    "crescitaTempo": 1.31,
    "riduzione": 0.12,
    "tetto": 2,
    "ricette": [
      {
        "da": 1,
        "mix": {
          "metallo": 0.6,
          "silicio": 0.4
        }
      },
      {
        "da": 4,
        "mix": {
          "metallo": 0.5,
          "silicio": 0.3,
          "ghiaccio": 0.2
        }
      },
      {
        "da": 7,
        "mix": {
          "metallo": 0.45,
          "silicio": 0.25,
          "ghiaccio": 0.15,
          "idrogeno": 0.15
        }
      },
      {
        "da": 10,
        "mix": {
          "metallo": 0.4,
          "silicio": 0.25,
          "ghiaccio": 0.15,
          "idrogeno": 0.1,
          "terreRare": 0.1
        }
      },
      {
        "da": 15,
        "mix": {
          "metallo": 0.38,
          "silicio": 0.22,
          "ghiaccio": 0.12,
          "idrogeno": 0.08,
          "terreRare": 0.1,
          "materiaOscura": 0.1
        }
      }
    ],
    "stiva": {
      "quota": 0.4,
      "mix": {
        "metallo": 0.6,
        "silicio": 0.4
      },
      "ore": 1
    }
  },
  "deposito": {
    "idrogeno": 5,
    "crescita": 0.9
  },
  "magazzino": {
    "ore": 168,
    "crescita": 1.45
  },
  "cometa": {
    "ghiaccio": 200,
    "codaLunga": 0.8,
    "idrogeno": 50
  },
  "mix": {
    "asteroidi": {
      "metallica": {
        "metallo": 0.8,
        "silicio": 0.2
      },
      "silicea": {
        "metallo": 0.2,
        "silicio": 0.8
      },
      "mista": {
        "metallo": 0.5,
        "silicio": 0.5
      }
    },
    "nebulosa": {
      "idrogeno": 1
    },
    "gigante": {
      "senza": {
        "idrogeno": 0.7,
        "ghiaccio": 0.3
      },
      "anelli": {
        "idrogeno": 0.5,
        "ghiaccio": 0.5
      }
    },
    "pianeti": {
      "roccioso": {
        "metallo": 0.5,
        "silicio": 0.5
      },
      "oceanico": {
        "metallo": 0.2,
        "silicio": 0.2,
        "ghiaccio": 0.6
      },
      "ghiacciato": {
        "ghiaccio": 0.8,
        "silicio": 0.2
      },
      "gassoso": {
        "idrogeno": 0.7,
        "ghiaccio": 0.3
      }
    }
  }
}'::jsonb
$$;

revoke all on function space.bilanciamento() from public, anon;
grant execute on function space.bilanciamento() to authenticated;
