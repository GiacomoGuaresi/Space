-- Space · 011 · Insediamenti (M4.4, doc/02-meccaniche.md#insediamenti).
--
-- La base madre, le basi e gli estrattori producono nel loro magazzino fino al
-- tetto. Le scorte valgono dall'istante `ultima`: il magazzino si calcola alla
-- lettura (insediamenti.ts). Si scrive solo con le funzioni. Da applicare dopo
-- bilanciamento.sql con `produzione.madre`, `produzione.crescita` e `magazzino`.
-- Rilanciabile.

create table if not exists space.insediamento (
  id bigint generated always as identity primary key,
  giocatore uuid not null references auth.users (id) on delete cascade,
  x int not null,
  y int not null,
  z int not null,
  tipo text not null check (tipo in ('madre', 'base', 'estrattore')),
  -- Il pianeta della colonia, nell'ordine delle orbite (solo le basi).
  pianeta int,
  fondazione timestamptz not null default now(),
  ultima timestamptz not null default now(),
  scorte jsonb not null default '{}',
  produzione int not null default 1,
  magazzino int not null default 1,
  unique (giocatore, x, y, z)
);

alter table space.insediamento enable row level security;
drop policy if exists insediamenti_propri on space.insediamento;
create policy insediamenti_propri on space.insediamento for select to authenticated
  using (giocatore = auth.uid() and fondazione <= now());
revoke all on space.insediamento from public, anon, authenticated;
grant select on space.insediamento to authenticated;

-- `base × crescita^(livello − 1)` con moltiplicazioni ripetute (insediamenti.ts, `aLivello`).
create or replace function space.a_livello(base double precision, crescita double precision, livello int) returns double precision
language plpgsql immutable parallel safe set search_path = '' as $$
declare
  valore double precision := base;
begin
  for i in 2..livello loop
    valore := valore * crescita;
  end loop;
  return valore;
end
$$;

-- Quanto produce all'ora per risorsa (insediamenti.ts, `ritmoInsediamento`).
create or replace function space.ritmo_insediamento(i space.insediamento, livello int) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare
  ritmo double precision;
begin
  if i.tipo = 'madre' then
    ritmo := space.a_livello(space.valore('{produzione,madre}') / 4, space.valore('{produzione,crescita}'), livello);
    return jsonb_build_object('metallo', ritmo, 'silicio', ritmo, 'ghiaccio', ritmo, 'idrogeno', ritmo);
  end if;
  return '{}';
end
$$;

-- Il tetto del magazzino per risorsa (insediamenti.ts, `tettoMagazzino`).
create or replace function space.tetto_magazzino(i space.insediamento) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare
  voce record;
  tetti jsonb := '{}';
begin
  for voce in select * from jsonb_each_text(space.ritmo_insediamento(i, 1)) loop
    tetti := tetti || jsonb_build_object(voce.key, space.a_livello(
      voce.value::double precision * space.valore('{magazzino,ore}'), space.valore('{magazzino,crescita}'), i.magazzino
    ));
  end loop;
  return tetti;
end
$$;

-- Il magazzino a `istante` (insediamenti.ts, `magazzinoOra`): le scorte più la produzione, fino al tetto.
create or replace function space.magazzino_a(i space.insediamento, istante timestamptz) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare
  ritmi jsonb := space.ritmo_insediamento(i, i.produzione);
  tetti jsonb := space.tetto_magazzino(i);
  ore double precision := greatest(0, extract(epoch from istante - i.ultima)) / 3600;
  risultato jsonb := i.scorte;
  voce record;
  scorta double precision;
begin
  for voce in select * from jsonb_each_text(ritmi) loop
    scorta := coalesce((i.scorte ->> voce.key)::double precision, 0);
    if scorta < (tetti ->> voce.key)::double precision then
      risultato := risultato || jsonb_build_object(
        voce.key, least((tetti ->> voce.key)::double precision, scorta + voce.value::double precision * ore)
      );
    end if;
  end loop;
  return risultato;
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
  insert into space.insediamento (giocatore, x, y, z, tipo) values (io, 0, 0, 0, 'madre')
  on conflict do nothing;
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

revoke all on all functions in schema space from public, anon;
grant execute on all functions in schema space to authenticated;
revoke execute on function space.scansiona(uuid, int, int, int, int, timestamptz) from authenticated;
revoke execute on function space.stiva_di(uuid) from authenticated;
revoke execute on function space.aggiorna_stiva(uuid, space.nave) from authenticated;
revoke execute on function space.assesta(uuid) from authenticated;
