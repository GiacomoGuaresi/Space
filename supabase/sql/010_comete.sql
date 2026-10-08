-- Space · 010 · Comete (M4.3, doc/09-bilanciamento.md#comete-e-relitti).
--
-- Arrivando su una cometa si prende il suo bottino, una volta sola per
-- giocatore: Ghiaccio e, con la coda lunga, Idrogeno, fin dove entra nella
-- stiva. `assesta` sistema gli eventi dell'arrivo (oggi la cometa, poi gli
-- insediamenti): la chiamano `stato` e `viaggia`, prima di tutto il resto.
-- Da applicare dopo bilanciamento.sql con `cometa`. Rilanciabile.

-- La coda della cometa (settore.ts, `dettagli`): il primo numero dei dettagli, ai centesimi.
create or replace function space.coda_cometa(x int, y int, z int) returns double precision
language plpgsql immutable parallel safe set search_path = '' as $$
declare
  n double precision;
begin
  select m.numero into n from space.mulberry(space.derivato(space.seed_settore(x, y, z), 3)) m;
  return floor((0.4::double precision + n * (1::double precision - 0.4::double precision)) * 100 + 0.5) / 100;
end
$$;

-- Il bottino della cometa in (x, y, z) (risorse.ts, `bottinoCometa`), o null se lì non c'è una cometa.
create or replace function space.bottino_cometa(x int, y int, z int) returns jsonb
language plpgsql immutable parallel safe set search_path = '' as $$
declare
  ricchezza double precision := space.ricchezza(x, y, z);
begin
  if space.tipo_settore(x, y, z) is distinct from 'cometa' then
    return null;
  end if;
  return jsonb_build_object('ghiaccio', space.valore('{cometa,ghiaccio}') * ricchezza)
    || case when space.coda_cometa(x, y, z) >= space.valore('{cometa,codaLunga}')
      then jsonb_build_object('idrogeno', space.valore('{cometa,idrogeno}') * ricchezza)
      else '{}' end;
end
$$;

-- I settori a raccolta una tantum già presi da questo giocatore, con quello che è entrato nella stiva.
create table if not exists space.raccolto (
  giocatore uuid not null references auth.users (id) on delete cascade,
  x int not null,
  y int not null,
  z int not null,
  istante timestamptz not null,
  bottino jsonb not null,
  primary key (giocatore, x, y, z)
);

alter table space.raccolto enable row level security;
drop policy if exists raccolti_propri on space.raccolto;
create policy raccolti_propri on space.raccolto for select to authenticated
  using (giocatore = auth.uid() and istante <= now());
revoke all on space.raccolto from public, anon, authenticated;
grant select on space.raccolto to authenticated;

-- Gli eventi dell'arrivo, se la nave è arrivata e non sono ancora stati sistemati.
create or replace function space.assesta(io uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  n space.nave;
  bottino jsonb;
  capacita double precision;
  preso jsonb := '{}';
  voce record;
  q double precision;
begin
  select * into n from space.nave where giocatore = io for update;
  if n.giocatore is null or n.dal > now() then
    return;
  end if;
  bottino := space.bottino_cometa(n.x, n.y, n.z);
  if bottino is not null and not exists (
    select 1 from space.raccolto r where r.giocatore = io and (r.x, r.y, r.z) = (n.x, n.y, n.z)
  ) then
    perform space.stiva_di(io);
    capacita := space.capacita_stiva(n.stiva);
    for voce in select * from jsonb_each_text(bottino) loop
      select s.quantita into q from space.stiva s where s.giocatore = io and s.risorsa = voce.key;
      q := greatest(0, least(voce.value::double precision, capacita - q));
      preso := preso || jsonb_build_object(voce.key, q);
      update space.stiva s set quantita = s.quantita + q where s.giocatore = io and s.risorsa = voce.key;
    end loop;
    insert into space.raccolto (giocatore, x, y, z, istante, bottino) values (io, n.x, n.y, n.z, n.dal, preso);
  end if;
end
$$;

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
  perform space.assesta(io);
  select * into n from space.nave where giocatore = io;
  -- In viaggio no: la scansione dell'arrivo l'ha già scritta `viaggia`.
  if n.dal <= now() then
    perform space.scansiona(io, n.x, n.y, n.z, n.scanner, n.dal);
  end if;
  select * into v from space.viaggio where giocatore = io order by arrivo desc limit 1;
  return jsonb_build_object(
    'ora', now(),
    'nave', to_jsonb(n) - 'giocatore',
    'viaggio', case when v.id is not null and v.arrivo > now() then to_jsonb(v) - 'giocatore' end,
    'stiva', space.stiva_di(io)
  );
end
$$;

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

  perform space.assesta(io);
  perform space.aggiorna_stiva(io, n);

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

revoke all on all functions in schema space from public, anon;
grant execute on all functions in schema space to authenticated;
revoke execute on function space.scansiona(uuid, int, int, int, int, timestamptz) from authenticated;
revoke execute on function space.stiva_di(uuid) from authenticated;
revoke execute on function space.aggiorna_stiva(uuid, space.nave) from authenticated;
revoke execute on function space.assesta(uuid) from authenticated;
