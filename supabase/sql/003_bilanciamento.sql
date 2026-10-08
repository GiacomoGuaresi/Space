-- Space · 003 · Bilanciamento (M3.1, doc/09-bilanciamento.md).
--
-- I numeri del gioco in un posto solo: `space.bilanciamento()` è la copia di
-- src/dominio/bilanciamento.ts, e `npm run verifica-sql` controlla che siano
-- uguali. Le funzioni di 002 si riscrivono per leggere da qui; la rotta impara
-- la quota di carburante per settore (la fionda ne fa pagare solo una parte).
-- Rilanciabile.

create or replace function space.bilanciamento() returns jsonb
language sql immutable parallel safe set search_path = '' as $$
  select '{
    "universo": {
      "pienezza": 0.1,
      "distanzaLontana": 500,
      "pesiVicini": {
        "asteroidi": 30, "nebulosa": 25, "stella": 25, "sistema": 12, "gigante": 4,
        "cometa": 4, "pulsar": 0.5, "buconero": 0, "relitto": 0, "wormhole": 0
      },
      "pesiLontani": {
        "asteroidi": 22, "nebulosa": 18, "stella": 18, "sistema": 14, "gigante": 7,
        "cometa": 6, "pulsar": 5, "buconero": 4, "relitto": 4, "wormhole": 2
      }
    },
    "nave": { "velocita": 12, "serbatoio": 20, "ricarica": 2.5 },
    "carburante": { "tettoFuori": 1, "ricaricaStella": 3 },
    "fionda": { "velocita": 2, "gratis": 0 },
    "scanner": { "raggio": 3 }
  }'::jsonb
$$;

-- Un valore numerico del bilanciamento, per percorso: space.valore('{nave,velocita}').
create or replace function space.valore(percorso text[]) returns double precision
language sql immutable parallel safe set search_path = '' as $$
  select (space.bilanciamento() #>> percorso)::double precision
$$;

-- Universo --------------------------------------------------------------------

-- Il tipo di corpo di un settore, o null se è vuoto (settore.ts, `tipoSettore`;
-- pesi da catalogo.ts, `pesi`).
create or replace function space.tipo_settore(x int, y int, z int) returns text
language plpgsql immutable parallel safe set search_path = '' as $$
declare
  -- Lo stesso ordine di CATALOGO in catalogo.ts: decide l'estrazione.
  tipi constant text[] := array['asteroidi', 'nebulosa', 'stella', 'sistema', 'gigante', 'cometa', 'pulsar', 'buconero', 'relitto', 'wormhole'];
  universo constant jsonb := space.bilanciamento() -> 'universo';
  stato bigint;
  n double precision;
  d double precision;
  t double precision;
  vicino double precision;
  lontano double precision;
  pesi double precision[] := array[]::double precision[];
  totale double precision := 0;
  estratto double precision;
  ultimo int;
begin
  if x = 0 and y = 0 and z = 0 then
    return null;
  end if;
  stato := space.derivato(space.seed_settore(x, y, z), 0);
  select m.nuovo, m.numero into stato, n from space.mulberry(stato) m;
  if not (n < (universo ->> 'pienezza')::double precision) then
    return null;
  end if;
  select m.nuovo, m.numero into stato, n from space.mulberry(stato) m;

  d := sqrt(x::double precision * x + y::double precision * y + z::double precision * z);
  t := least(1, greatest(0, d / (universo ->> 'distanzaLontana')::double precision));
  for i in 1..10 loop
    vicino := (universo -> 'pesiVicini' ->> tipi[i])::double precision;
    lontano := (universo -> 'pesiLontani' ->> tipi[i])::double precision;
    pesi := pesi || (vicino + (lontano - vicino) * t);
    totale := totale + pesi[i];
  end loop;

  estratto := n * totale;
  for i in 1..10 loop
    if pesi[i] > 0 then
      if estratto < pesi[i] then
        return tipi[i];
      end if;
      estratto := estratto - pesi[i];
      ultimo := i;
    end if;
  end loop;
  return tipi[ultimo];
end
$$;

-- Navigazione -----------------------------------------------------------------

-- La rotta con il carburante dato, se ogni settore costa `quota` unità
-- (navigazione.ts, `rotta`): dove si arriva, quanto si percorre, quanto si consuma.
drop function if exists space.rotta(int, int, int, int, int, int, double precision);
create or replace function space.rotta(
  dx int, dy int, dz int, mx int, my int, mz int, carburante double precision, quota double precision default 1,
  out ax int, out ay int, out az int, out percorsa double precision, out consumo double precision
)
language plpgsql immutable parallel safe set search_path = '' as $$
declare
  totale double precision := space.distanza(dx, dy, dz, mx, my, mz);
  t double precision;
begin
  if carburante >= totale * quota then
    ax := mx; ay := my; az := mz; percorsa := totale; consumo := totale * quota;
    return;
  end if;
  t := carburante / quota / totale;
  while t > 0 loop
    ax := floor(dx + (mx - dx) * t + 0.5);
    ay := floor(dy + (my - dy) * t + 0.5);
    az := floor(dz + (mz - dz) * t + 0.5);
    percorsa := space.distanza(dx, dy, dz, ax, ay, az);
    if percorsa * quota <= carburante then
      consumo := percorsa * quota;
      return;
    end if;
    t := t - 0.5 / totale;
  end loop;
  ax := dx; ay := dy; az := dz; percorsa := 0; consumo := 0;
end
$$;

-- La nave nuova prende i valori del livello 1 da qui.
alter table space.nave alter column velocita set default space.valore('{nave,velocita}');
alter table space.nave alter column serbatoio set default space.valore('{nave,serbatoio}');
alter table space.nave alter column ricarica set default space.valore('{nave,ricarica}');

-- Fin dove si ricarica il serbatoio da fermi in (x, y, z) (navigazione.ts, `tettoQui`).
create or replace function space.tetto(n space.nave, x int, y int, z int) returns double precision
language sql immutable set search_path = '' as $$
  select n.serbatoio * case
    when (x = 0 and y = 0 and z = 0) or space.tipo_settore(x, y, z) = 'stella' then 1
    else space.valore('{carburante,tettoFuori}')
  end
$$;

-- Il carburante adesso (navigazione.ts, `carburanteOra`): sale fino al tetto, e
-- se è già oltre non cala.
create or replace function space.carburante_ora(n space.nave) returns double precision
language plpgsql stable set search_path = '' as $$
declare
  tetto double precision;
begin
  if now() < n.dal then
    return n.carburante;
  end if;
  tetto := space.tetto(n, n.x, n.y, n.z);
  if n.carburante >= tetto then
    return n.carburante;
  end if;
  return least(
    tetto,
    n.carburante
      + n.ricarica
        * (case when space.tipo_settore(n.x, n.y, n.z) = 'stella' then space.valore('{carburante,ricaricaStella}') else 1 end)
        * extract(epoch from now() - n.dal) / 3600
  );
end
$$;

-- Lo stato della nave, creata alla base col serbatoio pieno la prima volta.
create or replace function space.stato() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  io uuid := auth.uid();
  n space.nave;
  v space.viaggio;
begin
  if io is null then
    raise exception 'serve la sessione' using errcode = '42501';
  end if;
  insert into space.nave (giocatore, carburante) values (io, space.valore('{nave,serbatoio}'))
  on conflict (giocatore) do nothing;
  select * into n from space.nave where giocatore = io;
  select * into v from space.viaggio where giocatore = io order by arrivo desc limit 1;
  return jsonb_build_object(
    'ora', now(),
    'nave', to_jsonb(n) - 'giocatore',
    'viaggio', case when v.id is not null and v.arrivo > now() then to_jsonb(v) - 'giocatore' end
  );
end
$$;

-- Parte verso (x, y, z). Rifiuta se la nave è in viaggio, se la meta è il
-- settore dove si trova o se il carburante non basta per un settore.
create or replace function space.viaggia(x int, y int, z int) returns jsonb
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_variable
declare
  io uuid := auth.uid();
  n space.nave;
  carburante double precision;
  fionda boolean;
  r record;
  arrivo timestamptz;
  v space.viaggio;
  tipo_arrivo text;
begin
  if io is null then
    raise exception 'serve la sessione' using errcode = '42501';
  end if;
  select * into n from space.nave where giocatore = io for update;
  if n.giocatore is null then
    raise exception 'nave_mancante';
  end if;
  if now() < n.dal then
    raise exception 'in_viaggio';
  end if;
  if n.x = x and n.y = y and n.z = z then
    raise exception 'stesso_settore';
  end if;

  carburante := space.carburante_ora(n);
  -- Nel vuoto il tipo è null: senza coalesce anche la fionda lo sarebbe.
  fionda := coalesce(space.tipo_settore(n.x, n.y, n.z) = 'buconero', false);
  select * into r from space.rotta(
    n.x, n.y, n.z, x, y, z, carburante,
    case when fionda then 1 - space.valore('{fionda,gratis}') else 1 end
  );
  if r.percorsa = 0 then
    raise exception 'carburante_insufficiente';
  end if;
  arrivo := now() + make_interval(
    secs => r.percorsa / (n.velocita * (case when fionda then space.valore('{fionda,velocita}') else 1 end)) * 3600
  );

  insert into space.viaggio (giocatore, da_x, da_y, da_z, meta_x, meta_y, meta_z, a_x, a_y, a_z, partenza, arrivo, consumo, fionda)
  values (io, n.x, n.y, n.z, x, y, z, r.ax, r.ay, r.az, now(), arrivo, r.consumo, fionda)
  returning * into v;

  update space.nave
  set x = r.ax, y = r.ay, z = r.az, dal = arrivo, carburante = greatest(0, carburante - r.consumo)
  where giocatore = io;

  tipo_arrivo := space.tipo_settore(r.ax, r.ay, r.az);
  if tipo_arrivo is not null then
    insert into space.scoperta (giocatore, x, y, z, tipo, scoperta)
    values (io, r.ax, r.ay, r.az, tipo_arrivo, arrivo)
    on conflict do nothing;
  end if;

  return to_jsonb(v) - 'giocatore';
end
$$;

-- Permessi ----------------------------------------------------------------------

revoke all on all functions in schema space from public, anon;
grant execute on all functions in schema space to authenticated;
