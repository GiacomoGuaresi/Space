-- Space · 035 · Traguardi (M10.1, doc/09-bilanciamento.md#traguardi).
--
-- Medaglie con data, senza ricompense, in quattro famiglie: distanza,
-- catalogo, infrastruttura, imprese. `controlla_traguardi`, chiamata da
-- `stato`, scrive quelle raggiunte e non ancora scritte, con l'istante in cui
-- sono state raggiunte quando si ricava dai dati (se no adesso). Una medaglia
-- resta anche se poi si abbandona una base. Le soglie stanno in
-- `bilanciamento.traguardi`, i nomi in traguardi.ts. Da applicare dopo
-- bilanciamento.sql. Rilanciabile.

create table if not exists space.traguardo (
  giocatore uuid not null references auth.users (id) on delete cascade,
  codice text not null,
  istante timestamptz not null,
  primary key (giocatore, codice)
);

alter table space.traguardo enable row level security;
drop policy if exists traguardi_propri on space.traguardo;
create policy traguardi_propri on space.traguardo for select to authenticated using (giocatore = auth.uid() and istante <= now());
revoke all on space.traguardo from public, anon, authenticated;
grant select on space.traguardo to authenticated;

-- Il sottotipo del catalogo (sottotipi.ts, `sottotipo`): per tutti i tipi che ne hanno, dal primo numero dei
-- dettagli; null per gli altri.
create or replace function space.sottotipo_catalogo(x int, y int, z int) returns text
language plpgsql immutable parallel safe set search_path = '' as $$
declare
  tipo text := space.tipo_settore(x, y, z);
  stato bigint := space.derivato(space.seed_settore(x, y, z), 3);
  p record;
begin
  if tipo in ('asteroidi', 'gigante') then
    return space.sottotipo(x, y, z);
  elsif tipo = 'nebulosa' then
    select * into p from space.pesato(stato, array['emissione', 'riflessione', 'planetaria', 'oscura'], array[4, 3, 2, 1]::double precision[]);
  elsif tipo in ('stella', 'sistema') then
    select * into p from space.pesato(stato, array['M', 'K', 'G', 'F', 'B'], array[45, 25, 15, 10, 5]::double precision[]);
  elsif tipo = 'relitto' then
    select * into p from space.pesato(stato, array['nave', 'stazione', 'sonda'], array[5, 2, 3]::double precision[]);
  else
    return null;
  end if;
  return p.scelta;
end
$$;

-- Scrive i traguardi raggiunti dal giocatore e non ancora scritti.
create or replace function space.controlla_traguardi(io uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  t constant jsonb := space.bilanciamento() -> 'traguardi';
begin
  insert into space.traguardo (giocatore, codice, istante)
  with
    soglia as (
      select f.key as famiglia, a.value::double precision as n
      from jsonb_each(t) f, jsonb_array_elements_text(case when jsonb_typeof(f.value) = 'array' then f.value else '[]' end) a
    ),
    viaggi as (select * from space.viaggio v where v.giocatore = io and v.arrivo <= now()),
    scoperte as (
      select s.tipo, s.scoperta, space.sottotipo_catalogo(s.x, s.y, s.z) as sotto
      from space.scoperta s where s.giocatore = io and s.scoperta <= now()
    ),
    basi as (select * from space.insediamento i where i.giocatore = io and i.fondazione <= now()),
    primi as (select 'primo-' || s.tipo as codice, min(s.scoperta) as istante from scoperte s group by s.tipo),
    sottotipi as (
      select 'sottotipi-' || g.tipo as codice, max(g.primo) as istante
      from (select s.tipo, s.sotto, min(s.scoperta) as primo from scoperte s where s.sotto is not null group by s.tipo, s.sotto) g
      group by g.tipo
      having count(*) >= (t -> 'sottotipi' ->> g.tipo)::int
    ),
    percorsi as (
      select v.arrivo, sum(space.distanza(v.da_x, v.da_y, v.da_z, v.a_x, v.a_y, v.a_z)) over (order by v.arrivo, v.id) as totale
      from viaggi v where not v.wormhole
    ),
    candidati(codice, istante) as (
      -- Distanza: il primo arrivo abbastanza lontano dalla base madre.
      select 'distanza-' || k.n::bigint, (select min(v.arrivo) from viaggi v where space.distanza(v.a_x, v.a_y, v.a_z, 0, 0, 0) >= k.n)
      from soglia k where k.famiglia = 'distanza'
      -- Catalogo.
      union all select * from primi
      union all
      select 'corpi-' || k.n::bigint, (select s.scoperta from scoperte s order by s.scoperta offset k.n::int - 1 limit 1)
      from soglia k where k.famiglia = 'corpi'
      union all select * from sottotipi
      union all
      select 'catalogo-completo', max(c.istante) from (select * from primi union all select * from sottotipi) c
      having count(*) = (select count(*) from jsonb_object_keys(space.bilanciamento() -> 'universo' -> 'pesiLontani'))
        + (select count(*) from jsonb_object_keys(t -> 'sottotipi'))
      -- Infrastruttura.
      union all select 'prima-base', min(b.fondazione) from basi b where b.tipo = 'base'
      union all
      select 'basi-' || k.n::bigint, (select b.fondazione from basi b where b.tipo = 'base' order by b.fondazione offset k.n::int - 1 limit 1)
      from soglia k where k.famiglia = 'basi'
      union all
      select 'estrattore-' || space.tipo_settore(b.x, b.y, b.z), min(b.fondazione) from basi b where b.tipo = 'estrattore'
      group by space.tipo_settore(b.x, b.y, b.z)
      union all
      select 'primo-ponte', coalesce(
        (select min(c.fine) from space.costruzione c where c.giocatore = io and c.lavoro = 'ponte' and c.applicata), now()
      ) where exists (select 1 from basi b where b.ponte > 0)
      union all
      select 'ponti-' || k.n::bigint, now() from soglia k where k.famiglia = 'ponti' and (
        select max(space.distanza(a.x, a.y, a.z, b.x, b.y, b.z)) from basi a, basi b where a.ponte > 0 and b.ponte > 0
      ) >= k.n
      -- Imprese.
      union all
      select 'viaggio-' || k.n::bigint, (
        select min(v.arrivo) from viaggi v where not v.wormhole and space.distanza(v.da_x, v.da_y, v.da_z, v.a_x, v.a_y, v.a_z) >= k.n
      ) from soglia k where k.famiglia = 'viaggio'
      union all select 'salto-wormhole', min(v.arrivo) from viaggi v where v.wormhole
      union all
      select 'percorsi-' || k.n::bigint, (select min(p.arrivo) from percorsi p where p.totale >= k.n)
      from soglia k where k.famiglia = 'percorsi'
      union all
      select 'statistica-' || k.n::bigint, coalesce((
        select min(c.fine) from space.costruzione c
        where c.giocatore = io and c.applicata and c.coda = 'nave' and c.livello >= k.n
      ), now())
      from soglia k, space.nave n
      where k.famiglia = 'statistica' and n.giocatore = io and greatest(n.liv_motore, n.liv_serbatoio, n.liv_ricarica, n.scanner, n.stiva) >= k.n
      union all
      select 'tutte-le-ricerche', max(r.fine) from space.ricerca r where r.giocatore = io and r.fine <= now()
      having count(distinct r.nodo) >= (select count(*) from jsonb_object_keys(space.bilanciamento() -> 'ricerche' -> 'nodi'))
    )
  select io, c.codice, c.istante from candidati c where c.istante is not null
  on conflict do nothing;
end
$$;

-- Lo stato (015), e i traguardi raggiunti da scrivere.
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
  insert into space.insediamento (giocatore, x, y, z, tipo, cantiere, deposito, laboratorio)
  values (io, 0, 0, 0, 'madre', 1, 1, 1)
  on conflict do nothing;
  perform space.assesta(io);
  perform space.controlla_traguardi(io);
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

revoke all on all functions in schema space from public, anon;
grant execute on all functions in schema space to authenticated;
revoke execute on function space.scansiona(uuid, int, int, int, int, timestamptz) from authenticated;
revoke execute on function space.stiva_di(uuid) from authenticated;
revoke execute on function space.aggiorna_stiva(uuid, space.nave) from authenticated;
revoke execute on function space.assesta(uuid) from authenticated;
revoke execute on function space.preleva(uuid, space.insediamento, timestamptz) from authenticated;
revoke execute on function space.applica_costruzioni(uuid) from authenticated;
revoke execute on function space.controlla_traguardi(uuid) from authenticated;
