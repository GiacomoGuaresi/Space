-- Space · 002 · Navigazione (M2, doc/02-meccaniche.md, doc/05-modello-dati.md).
--
-- Nave, viaggi in tempo reale e scoperte. Il browser fa l'anteprima, ma chi
-- decide è il database: per questo le funzioni dell'universo sono riscritte qui
-- IDENTICHE a src/dominio/casuale.ts, settore.ts e navigazione.ts. Se cambia
-- una, cambia l'altra; la verifica è in doc/08-deploy.md.
--
-- Interi a 32 bit senza segno tenuti in bigint, con la maschera 4294967295.
-- Rilanciabile.

-- Universo --------------------------------------------------------------------

-- Math.imul: il prodotto modulo 2^32, spezzato in due perché a·b non sta in un bigint.
create or replace function space.imul(a bigint, b bigint) returns bigint
language sql immutable parallel safe set search_path = '' as $$
  select ((a * (b & 65535)) + (((a * (b >> 16)) & 65535) << 16)) & 4294967295
$$;

-- Il finalizzatore di MurmurHash3 (casuale.ts, `mescola`).
create or replace function space.mescola(h bigint) returns bigint
language plpgsql immutable parallel safe set search_path = '' as $$
begin
  h := h # (h >> 16);
  h := space.imul(h, 2246822507);   -- 0x85ebca6b
  h := h # (h >> 13);
  h := space.imul(h, 3266489909);   -- 0xc2b2ae35
  h := h # (h >> 16);
  return h;
end
$$;

-- Il seed di un settore (casuale.ts, `seedSettore`), con SEED_UNIVERSO = 0x5eace01.
create or replace function space.seed_settore(x int, y int, z int) returns bigint
language plpgsql immutable parallel safe set search_path = '' as $$
declare
  h bigint := space.mescola(99274241);
begin
  h := space.mescola(h # (x::bigint & 4294967295));
  h := space.mescola(h # (y::bigint & 4294967295));
  h := space.mescola(h # (z::bigint & 4294967295));
  return h;
end
$$;

-- casuale.ts, `derivato`: 0x9e3779b9 = 2654435769.
create or replace function space.derivato(seed bigint, parte int) returns bigint
language sql immutable parallel safe set search_path = '' as $$
  select space.mescola(seed # space.imul(parte + 1, 2654435769))
$$;

-- Un passo di Mulberry32 (casuale.ts, `numero`): il nuovo stato e il numero in [0, 1).
create or replace function space.mulberry(stato bigint, out nuovo bigint, out numero double precision)
language plpgsql immutable parallel safe set search_path = '' as $$
declare
  t bigint;
begin
  nuovo := (stato + 1831565813) & 4294967295;   -- 0x6d2b79f5
  t := nuovo;
  t := space.imul(t # (t >> 15), t | 1);
  t := t # ((t + space.imul(t # (t >> 7), t | 61)) & 4294967295);
  numero := (t # (t >> 14))::double precision / 4294967296.0;
end
$$;

-- Il tipo di corpo di un settore, o null se è vuoto (settore.ts, `tipoSettore`;
-- pesi e soglie da catalogo.ts: PIENEZZA, DISTANZA_LONTANA, PESI_VICINI, PESI_LONTANI).
create or replace function space.tipo_settore(x int, y int, z int) returns text
language plpgsql immutable parallel safe set search_path = '' as $$
declare
  tipi constant text[] := array['asteroidi', 'nebulosa', 'stella', 'sistema', 'gigante', 'cometa', 'pulsar', 'buconero', 'relitto', 'wormhole'];
  vicini constant double precision[] := array[30, 25, 25, 12, 4, 4, 0.5, 0, 0, 0];
  lontani constant double precision[] := array[22, 18, 18, 14, 7, 6, 5, 4, 4, 2];
  stato bigint;
  n double precision;
  d double precision;
  t double precision;
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
  if not (n < 0.1) then
    return null;
  end if;
  select m.nuovo, m.numero into stato, n from space.mulberry(stato) m;

  d := sqrt(x::double precision * x + y::double precision * y + z::double precision * z);
  t := least(1, greatest(0, d / 500));
  for i in 1..10 loop
    pesi := pesi || (vicini[i] + (lontani[i] - vicini[i]) * t);
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

create or replace function space.distanza(ax int, ay int, az int, bx int, by_ int, bz int) returns double precision
language sql immutable parallel safe set search_path = '' as $$
  select sqrt((ax - bx)::double precision * (ax - bx) + (ay - by_)::double precision * (ay - by_) + (az - bz)::double precision * (az - bz))
$$;

-- La rotta con il carburante dato (navigazione.ts, `rotta`): dove si arriva e quanto si consuma.
create or replace function space.rotta(
  dx int, dy int, dz int, mx int, my int, mz int, carburante double precision,
  out ax int, out ay int, out az int, out consumo double precision
)
language plpgsql immutable parallel safe set search_path = '' as $$
declare
  totale double precision := space.distanza(dx, dy, dz, mx, my, mz);
  t double precision;
  percorsa double precision;
begin
  if carburante >= totale then
    ax := mx; ay := my; az := mz; consumo := totale;
    return;
  end if;
  t := carburante / totale;
  while t > 0 loop
    ax := floor(dx + (mx - dx) * t + 0.5);
    ay := floor(dy + (my - dy) * t + 0.5);
    az := floor(dz + (mz - dz) * t + 0.5);
    percorsa := space.distanza(dx, dy, dz, ax, ay, az);
    if percorsa <= carburante then
      consumo := percorsa;
      return;
    end if;
    t := t - 0.5 / totale;
  end loop;
  ax := dx; ay := dy; az := dz; consumo := 0;
end
$$;

-- Tabelle ---------------------------------------------------------------------

-- Una nave per giocatore. (x, y, z) è dove si trova, o dove arriverà se è in
-- viaggio: ci arriva a `dal`, e da lì il carburante si ricarica.
create table if not exists space.nave (
  giocatore uuid primary key references auth.users (id) on delete cascade,
  x int not null default 0,
  y int not null default 0,
  z int not null default 0,
  dal timestamptz not null default now(),
  carburante double precision not null,
  -- Valori provvisori: gli stessi di NAVE_INIZIALE in navigazione.ts.
  velocita double precision not null default 12,
  serbatoio double precision not null default 20,
  ricarica double precision not null default 2.5,
  check (carburante >= 0 and carburante <= serbatoio)
);

create table if not exists space.viaggio (
  id bigint generated always as identity primary key,
  giocatore uuid not null references auth.users (id) on delete cascade,
  da_x int not null, da_y int not null, da_z int not null,
  meta_x int not null, meta_y int not null, meta_z int not null,
  a_x int not null, a_y int not null, a_z int not null,
  partenza timestamptz not null,
  arrivo timestamptz not null,
  consumo double precision not null,
  fionda boolean not null default false
);
create index if not exists viaggio_giocatore_arrivo on space.viaggio (giocatore, arrivo desc);

-- La scoperta si registra alla partenza, con l'istante d'arrivo: finché non
-- arriva, la policy la nasconde.
create table if not exists space.scoperta (
  giocatore uuid not null references auth.users (id) on delete cascade,
  x int not null,
  y int not null,
  z int not null,
  tipo text not null,
  scoperta timestamptz not null,
  primary key (giocatore, x, y, z)
);

alter table space.nave enable row level security;
alter table space.viaggio enable row level security;
alter table space.scoperta enable row level security;

drop policy if exists nave_propria on space.nave;
create policy nave_propria on space.nave for select to authenticated using (giocatore = auth.uid());
drop policy if exists viaggi_propri on space.viaggio;
create policy viaggi_propri on space.viaggio for select to authenticated using (giocatore = auth.uid());
drop policy if exists scoperte_proprie on space.scoperta;
create policy scoperte_proprie on space.scoperta for select to authenticated
  using (giocatore = auth.uid() and scoperta <= now());

-- Si legge e basta: si scrive solo dalle funzioni qui sotto.
revoke all on space.nave, space.viaggio, space.scoperta from public, anon, authenticated;
grant select on space.nave, space.viaggio, space.scoperta to authenticated;

-- Funzioni per il browser -------------------------------------------------------

-- Il carburante adesso (navigazione.ts, `carburanteOra`).
create or replace function space.carburante_ora(n space.nave) returns double precision
language sql stable set search_path = '' as $$
  select case
    when now() < n.dal then n.carburante
    else least(
      n.serbatoio,
      n.carburante
        + n.ricarica * (case when space.tipo_settore(n.x, n.y, n.z) = 'stella' then 3 else 1 end)
        * extract(epoch from now() - n.dal) / 3600
    )
  end
$$;

-- Lo stato della nave, creata alla base col serbatoio pieno la prima volta.
-- `ora` è l'orologio del database: il browser lo usa per correggere il suo.
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
  insert into space.nave (giocatore, carburante) values (io, 20) on conflict (giocatore) do nothing;
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
  select * into r from space.rotta(n.x, n.y, n.z, x, y, z, carburante);
  if r.consumo = 0 then
    raise exception 'carburante_insufficiente';
  end if;
  -- navigazione.ts: FIONDA = 2.
  arrivo := now() + make_interval(secs => r.consumo / (n.velocita * (case when fionda then 2 else 1 end)) * 3600);

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

-- Tutte chiamabili solo con la sessione. Dall'API servono `stato` e `viaggia`;
-- le altre sono calcoli puri, usati dalle policy e dalle funzioni.
revoke all on all functions in schema space from public, anon;
grant execute on all functions in schema space to authenticated;
