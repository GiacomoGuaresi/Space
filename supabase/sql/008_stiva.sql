-- Space · 008 · Stiva per risorsa (M4.1, doc/05-modello-dati.md).
--
-- La nave ha un livello di stiva (capacità per risorsa) e una riga di stiva
-- per ogni risorsa, con la quantità valida da `dal`: la raccolta a mano (M4.2)
-- si calcola alla lettura, come il carburante. Si scrive solo con le funzioni.
-- Rilanciabile.

alter table space.nave add column if not exists stiva int not null default 1;

-- La capacità per risorsa al livello `livello` (risorse.ts, `capacitaStiva`):
-- moltiplicazioni ripetute, come in TypeScript.
create or replace function space.capacita_stiva(livello int) returns double precision
language plpgsql immutable parallel safe set search_path = '' as $$
declare
  valore double precision := space.valore('{stiva,capacita}');
begin
  for i in 2..livello loop
    valore := valore * space.valore('{stiva,crescita}');
  end loop;
  return valore;
end
$$;

create table if not exists space.stiva (
  giocatore uuid not null references auth.users (id) on delete cascade,
  risorsa text not null check (risorsa in ('metallo', 'silicio', 'ghiaccio', 'idrogeno', 'terreRare', 'materiaOscura')),
  quantita double precision not null default 0 check (quantita >= 0),
  dal timestamptz not null default now(),
  primary key (giocatore, risorsa)
);

alter table space.stiva enable row level security;
drop policy if exists stiva_propria on space.stiva;
create policy stiva_propria on space.stiva for select to authenticated using (giocatore = auth.uid());
revoke all on space.stiva from public, anon, authenticated;
grant select on space.stiva to authenticated;

-- La stiva del giocatore come oggetto { risorsa: { quantita, dal } }, creata vuota la prima volta.
create or replace function space.stiva_di(io uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  insert into space.stiva (giocatore, risorsa)
  select io, r from unnest(array['metallo', 'silicio', 'ghiaccio', 'idrogeno', 'terreRare', 'materiaOscura']) as r
  on conflict do nothing;
  return (
    select jsonb_object_agg(s.risorsa, jsonb_build_object('quantita', s.quantita, 'dal', s.dal))
    from space.stiva s where s.giocatore = io
  );
end
$$;

-- Lo stato (007) con in più la stiva.
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
    'viaggio', case when v.id is not null and v.arrivo > now() then to_jsonb(v) - 'giocatore' end,
    'stiva', space.stiva_di(io)
  );
end
$$;

revoke all on all functions in schema space from public, anon;
grant execute on all functions in schema space to authenticated;
revoke execute on function space.scansiona(uuid, int, int, int, int, timestamptz) from authenticated;
revoke execute on function space.stiva_di(uuid) from authenticated;
