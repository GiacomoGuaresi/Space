-- Space · 007 · Mappa dei settori scansionati (M3.7, doc/05-modello-dati.md).
--
-- Ogni sosta registra centro, raggio e livello dello scanner: il browser ne
-- ricava la mappa ricalcolando i corpi rilevati. Come la scoperta, la
-- scansione si scrive alla partenza con l'istante d'arrivo e resta nascosta
-- finché la nave non arriva. Rilanciabile.

-- Il raggio dello scanner (navigazione.ts, `raggioScanner`), fermi nel settore di tipo `tipo`.
create or replace function space.raggio_scanner(livello int, tipo text) returns double precision
language plpgsql immutable parallel safe set search_path = '' as $$
declare
  scanner constant jsonb := space.bilanciamento() -> 'scanner';
  livelli constant int := jsonb_array_length(scanner -> 'livelli');
  aumenti int := greatest(0, livello - livelli);
  raggio double precision := (scanner ->> 'raggio')::double precision;
begin
  for i in 0..least(livello, livelli) - 1 loop
    if scanner -> 'livelli' ->> i = 'raggio' then
      aumenti := aumenti + 1;
    end if;
  end loop;
  for i in 1..aumenti loop
    raggio := raggio * (scanner ->> 'crescita')::double precision;
  end loop;
  if tipo = 'nebulosa' then
    return raggio * (scanner ->> 'nebulosa')::double precision;
  elsif tipo = 'pulsar' then
    return raggio * (scanner ->> 'pulsar')::double precision;
  end if;
  return raggio;
end
$$;

-- Una per settore: tornando con uno scanner migliore si aggiorna.
create table if not exists space.scansione (
  giocatore uuid not null references auth.users (id) on delete cascade,
  x int not null,
  y int not null,
  z int not null,
  raggio double precision not null,
  livello int not null,
  istante timestamptz not null,
  primary key (giocatore, x, y, z)
);

alter table space.scansione enable row level security;
drop policy if exists scansioni_proprie on space.scansione;
create policy scansioni_proprie on space.scansione for select to authenticated
  using (giocatore = auth.uid() and istante <= now());
revoke all on space.scansione from public, anon, authenticated;
grant select on space.scansione to authenticated;

-- Registra la scansione della sosta in (x, y, z), che inizia a `istante`.
create or replace function space.scansiona(io uuid, x int, y int, z int, livello int, istante timestamptz) returns void
language sql security definer set search_path = '' as $$
  insert into space.scansione as s (giocatore, x, y, z, raggio, livello, istante)
  values (io, x, y, z, space.raggio_scanner(livello, space.tipo_settore(x, y, z)), livello, istante)
  on conflict (giocatore, x, y, z) do update
  set raggio = excluded.raggio, livello = excluded.livello, istante = excluded.istante
  where excluded.raggio > s.raggio or excluded.livello > s.livello
$$;

-- Lo stato della nave, creata alla base col serbatoio pieno la prima volta.
-- La sosta in corso ha sempre la sua scansione (anche per le navi di prima).
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
  -- In viaggio no: la scansione dell'arrivo l'ha già scritta `viaggia`.
  if n.dal <= now() then
    perform space.scansiona(io, n.x, n.y, n.z, n.scanner, n.dal);
  end if;
  select * into v from space.viaggio where giocatore = io order by arrivo desc limit 1;
  return jsonb_build_object(
    'ora', now(),
    'nave', to_jsonb(n) - 'giocatore',
    'viaggio', case when v.id is not null and v.arrivo > now() then to_jsonb(v) - 'giocatore' end
  );
end
$$;

-- Parte verso (x, y, z) (003), e in più registra la scansione all'arrivo.
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
  perform space.scansiona(io, r.ax, r.ay, r.az, n.scanner, arrivo);

  return to_jsonb(v) - 'giocatore';
end
$$;

-- `scansiona` scrive per conto di chiunque: la chiamano solo le funzioni qui sopra.
revoke all on all functions in schema space from public, anon;
grant execute on all functions in schema space to authenticated;
revoke execute on function space.scansiona(uuid, int, int, int, int, timestamptz) from authenticated;
