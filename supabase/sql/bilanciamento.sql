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
    "gratis": 0.2,
    "gravitazionale": {
      "velocita": 2,
      "gratis": 0.3
    }
  },
  "ponte": {
    "fattore": 3,
    "livello": 8
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
    ],
    "estrattore": {
      "costo": 60,
      "crescita": 1.4,
      "risorse": [
        "metallo",
        "silicio"
      ],
      "tipi": {
        "asteroidi": "C2",
        "nebulosa": "C3",
        "gigante": "C3",
        "pulsar": "C5",
        "buconero": "C7"
      },
      "limite": {
        "C2": 3,
        "C3": 2,
        "C5": 2,
        "C7": 2
      }
    }
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
      "radar": 40,
      "ponte": 40,
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
  "ricerche": {
    "base": 60,
    "costo": 2,
    "minuti": 6,
    "oreMassime": 1,
    "nodi": {
      "P1": {
        "gradino": 1,
        "richiede": []
      },
      "P2": {
        "gradino": 2,
        "richiede": [
          "P1"
        ]
      },
      "P3": {
        "gradino": 3,
        "richiede": [
          "P2",
          "I3"
        ]
      },
      "P4": {
        "gradino": 4,
        "richiede": [
          "P3"
        ]
      },
      "P5": {
        "gradino": 5,
        "richiede": [
          "P4"
        ]
      },
      "P6": {
        "gradino": 6,
        "richiede": [
          "P5"
        ]
      },
      "P7": {
        "gradino": 7,
        "richiede": [
          "P6"
        ]
      },
      "P8": {
        "gradino": 8,
        "richiede": [
          "P7"
        ]
      },
      "P9": {
        "gradino": 9,
        "richiede": [
          "P8",
          "S7"
        ]
      },
      "P10": {
        "gradino": 10,
        "richiede": [
          "P9"
        ]
      },
      "C1": {
        "gradino": 1,
        "richiede": []
      },
      "C2": {
        "gradino": 2,
        "richiede": [
          "C1"
        ]
      },
      "C3": {
        "gradino": 3,
        "richiede": [
          "C2"
        ]
      },
      "C4": {
        "gradino": 4,
        "richiede": [
          "C3"
        ]
      },
      "C5": {
        "gradino": 5,
        "richiede": [
          "C4"
        ]
      },
      "C6": {
        "gradino": 6,
        "richiede": [
          "C5"
        ]
      },
      "C7": {
        "gradino": 7,
        "richiede": [
          "C6",
          "P6"
        ]
      },
      "C8": {
        "gradino": 8,
        "richiede": [
          "C7"
        ]
      },
      "C9": {
        "gradino": 9,
        "richiede": [
          "C8"
        ]
      },
      "C10": {
        "gradino": 10,
        "richiede": [
          "C9"
        ]
      },
      "S1": {
        "gradino": 1,
        "richiede": []
      },
      "S2": {
        "gradino": 2,
        "richiede": [
          "S1"
        ]
      },
      "S3": {
        "gradino": 3,
        "richiede": [
          "S2"
        ]
      },
      "S4": {
        "gradino": 4,
        "richiede": [
          "S3"
        ]
      },
      "S5": {
        "gradino": 5,
        "richiede": [
          "S4"
        ]
      },
      "S6": {
        "gradino": 6,
        "richiede": [
          "S5"
        ]
      },
      "S7": {
        "gradino": 7,
        "richiede": [
          "S6"
        ]
      },
      "S8": {
        "gradino": 8,
        "richiede": [
          "S7",
          "S3"
        ]
      },
      "S9": {
        "gradino": 9,
        "richiede": [
          "S8"
        ]
      },
      "S10": {
        "gradino": 10,
        "richiede": [
          "S9"
        ]
      },
      "I1": {
        "gradino": 1,
        "richiede": []
      },
      "I2": {
        "gradino": 2,
        "richiede": [
          "I1"
        ]
      },
      "I3": {
        "gradino": 3,
        "richiede": [
          "I2"
        ]
      },
      "I4": {
        "gradino": 4,
        "richiede": [
          "I3"
        ]
      },
      "I5": {
        "gradino": 5,
        "richiede": [
          "I4"
        ]
      },
      "I6": {
        "gradino": 6,
        "richiede": [
          "I5"
        ]
      },
      "I7": {
        "gradino": 7,
        "richiede": [
          "I6"
        ]
      },
      "I8": {
        "gradino": 8,
        "richiede": [
          "I7"
        ]
      },
      "I9": {
        "gradino": 9,
        "richiede": [
          "I8"
        ]
      },
      "I10": {
        "gradino": 10,
        "richiede": [
          "I9"
        ]
      },
      "P∞": {
        "gradino": 10,
        "richiede": [
          "P10"
        ]
      },
      "C∞": {
        "gradino": 10,
        "richiede": [
          "C10"
        ]
      }
    },
    "infiniti": {
      "livello": 20,
      "basiOgni": 2,
      "estrattori": 1
    },
    "attive": [
      "I1",
      "I2",
      "I3",
      "I4",
      "I5",
      "I6",
      "C1",
      "C2",
      "C3",
      "C4",
      "C5",
      "C6",
      "S1",
      "S2",
      "S3",
      "S4",
      "S5",
      "S6",
      "P1",
      "P2",
      "P3",
      "P4",
      "P5",
      "P6",
      "P7",
      "P8",
      "C7",
      "C8",
      "S7",
      "S8",
      "I7",
      "I8",
      "P9",
      "S9",
      "P10",
      "C9",
      "C10",
      "S10",
      "I9",
      "I10",
      "P∞",
      "C∞"
    ],
    "effetti": {
      "I1": 0.1,
      "I2": 0.15,
      "I4": 0.1,
      "C1": 2,
      "C4": 0.2,
      "P1": 1,
      "P2": 0.1,
      "P4": 1,
      "P5": 3,
      "C6": 2,
      "P7": 1,
      "P8": 4,
      "S7": 3,
      "S8": 2,
      "I7": 0.15,
      "I8": 0.15,
      "C8": 0.15,
      "C9": 2,
      "P10": 1,
      "C10": 2,
      "S10": 2,
      "I10": 0.15,
      "P∞": 1.04,
      "C∞": 1.03,
      "I6": 0.25
    }
  },
  "varco": {
    "materiaOscura": 50
  },
  "accelera": {
    "base": 2,
    "esponente": 1.5
  },
  "deposito": {
    "idrogeno": 5,
    "crescita": 0.9
  },
  "radar": {
    "raggio": 4,
    "crescita": 1.2
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
  "traguardi": {
    "distanza": [
      10,
      25,
      50,
      100,
      250,
      500,
      1000,
      2500,
      5000,
      10000
    ],
    "corpi": [
      10,
      100,
      1000
    ],
    "basi": [
      3,
      5,
      10
    ],
    "ponti": [
      100,
      500
    ],
    "viaggio": [
      10,
      50,
      200
    ],
    "percorsi": [
      1000,
      10000,
      100000
    ],
    "statistica": [
      10,
      20,
      30
    ],
    "sottotipi": {
      "asteroidi": 3,
      "nebulosa": 4,
      "stella": 5,
      "sistema": 5,
      "gigante": 2,
      "relitto": 3
    }
  },
  "relitto": {
    "materiaOscura": 30,
    "carico": 0.5,
    "progetto": 0.3,
    "progettoRecupero": 0.5,
    "sconto": 0.5
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
    "pulsar": {
      "terreRare": 1
    },
    "buconero": {
      "materiaOscura": 1
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
