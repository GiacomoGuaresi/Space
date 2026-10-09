-- Space · 025 · Abbandono (M7.4, doc/02-meccaniche.md#insediamenti).
--
-- Il fondatore può abbandonare una base o un estrattore, da dove vuole (non la
-- base madre): strutture, coda e scorte spariscono e il corpo torna subito
-- libero. Non si abbandona la base dove la nave sta lavorando (potenziamento o
-- ricerca). Con *Riciclo* (I6, M7.5) torna nella stiva il 25 % di quanto vi si
-- è speso: la fondazione, che d'ora in poi resta in `insediamento.costo`, e i
-- lavori della sua coda. Rilanciabile.

alter table space.insediamento add column if not exists costo jsonb not null default '{}';

-- Fonda una base sul sistema dove la nave è ferma, col pianeta `pianeta` (dalla stella, da 0):
-- la prima gratis, le altre pagate dalla stiva, fino al limite (019). Il costo resta nella base, per *Riciclo*.
create or replace function space.fonda(pianeta int) returns jsonb
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_variable
declare
  io uuid := auth.uid();
  n space.nave;
  pianeti text[];
  i space.insediamento;
  fondate int;
  costo double precision;
  r text;
  q double precision;
  spesa jsonb;
begin
  if io is null then
    raise exception 'serve la sessione' using errcode = '42501';
  end if;
  perform space.assesta(io);
  select * into n from space.nave where giocatore = io for update;
  if n.giocatore is null then
    raise exception 'nave_mancante';
  end if;
  if now() < n.dal then
    raise exception 'in_viaggio';
  end if;
  pianeti := space.pianeti(n.x, n.y, n.z);
  if pianeti is null then
    raise exception 'non_fondabile';
  end if;
  if pianeta is null or pianeta < 0 or pianeta >= array_length(pianeti, 1) then
    raise exception 'pianeta_mancante';
  end if;
  if exists (select 1 from space.insediamento s where s.giocatore = io and (s.x, s.y, s.z) = (n.x, n.y, n.z)) then
    raise exception 'gia_fondato';
  end if;
  select count(*) into fondate from space.insediamento s where s.giocatore = io and s.tipo = 'base';
  if fondate >= space.basi_fondabili(io) then
    raise exception 'limite_basi';
  end if;
  -- La prima è gratis; le altre si pagano dalla stiva, raccolta a mano compresa (insediamenti.ts, `costoFondazione`).
  if fondate > 0 then
    perform space.aggiorna_stiva(io, n);
    costo := space.a_livello(space.valore('{fondazione,costo}'), space.valore('{fondazione,crescita}'), fondate)
      / jsonb_array_length(space.bilanciamento() -> 'fondazione' -> 'risorse');
    for r in select jsonb_array_elements_text(space.bilanciamento() -> 'fondazione' -> 'risorse') loop
      select s.quantita into q from space.stiva s where s.giocatore = io and s.risorsa = r;
      if q < costo then
        raise exception 'risorse_insufficienti';
      end if;
    end loop;
    update space.stiva s set quantita = s.quantita - costo
    where s.giocatore = io and s.risorsa in (select jsonb_array_elements_text(space.bilanciamento() -> 'fondazione' -> 'risorse'));
    select jsonb_object_agg(k, costo) into spesa from jsonb_array_elements_text(space.bilanciamento() -> 'fondazione' -> 'risorse') k;
  end if;
  insert into space.insediamento (giocatore, x, y, z, tipo, pianeta, costo)
  values (io, n.x, n.y, n.z, 'base', pianeta, coalesce(spesa, '{}'))
  returning * into i;
  return to_jsonb(i) - 'giocatore';
end
$$;

-- Fonda un estrattore sul corpo dove la nave è ferma, pagato dalla stiva (022). Il costo resta nell'estrattore.
create or replace function space.fonda_estrattore() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  io uuid := auth.uid();
  n space.nave;
  corpo text;
  ricerca text;
  risorse constant jsonb := space.bilanciamento() -> 'fondazione' -> 'estrattore' -> 'risorse';
  fondati int;
  costo double precision;
  r text;
  q double precision;
  i space.insediamento;
begin
  if io is null then
    raise exception 'serve la sessione' using errcode = '42501';
  end if;
  perform space.assesta(io);
  select * into n from space.nave where giocatore = io for update;
  if n.giocatore is null then
    raise exception 'nave_mancante';
  end if;
  if now() < n.dal then
    raise exception 'in_viaggio';
  end if;
  corpo := space.tipo_settore(n.x, n.y, n.z);
  ricerca := space.bilanciamento() -> 'fondazione' -> 'estrattore' -> 'tipi' ->> corpo;
  if ricerca is null then
    raise exception 'non_estraibile';
  end if;
  if not space.ricercata(io, ricerca) then
    raise exception 'non_disponibile';
  end if;
  if exists (select 1 from space.insediamento s where s.giocatore = io and (s.x, s.y, s.z) = (n.x, n.y, n.z)) then
    raise exception 'gia_fondato';
  end if;
  select count(*) into fondati from space.insediamento s where s.giocatore = io and s.tipo = 'estrattore';
  if fondati >= space.estrattori_fondabili(io) then
    raise exception 'limite_estrattori';
  end if;
  -- Dalla stiva, raccolta a mano compresa (insediamenti.ts, `costoEstrattore`).
  perform space.aggiorna_stiva(io, n);
  costo := space.a_livello(
    space.valore('{fondazione,estrattore,costo}'), space.valore('{fondazione,estrattore,crescita}'), fondati + 1
  ) / jsonb_array_length(risorse);
  for r in select jsonb_array_elements_text(risorse) loop
    select s.quantita into q from space.stiva s where s.giocatore = io and s.risorsa = r;
    if q < costo then
      raise exception 'risorse_insufficienti';
    end if;
  end loop;
  update space.stiva s set quantita = s.quantita - costo
  where s.giocatore = io and s.risorsa in (select jsonb_array_elements_text(risorse));
  insert into space.insediamento (giocatore, x, y, z, tipo, costo)
  values (io, n.x, n.y, n.z, 'estrattore', (select jsonb_object_agg(k, costo) from jsonb_array_elements_text(risorse) k))
  returning * into i;
  return to_jsonb(i) - 'giocatore';
end
$$;

-- Abbandona l'insediamento `id`: torna quanto dice *Riciclo* (0 senza), fin dove entra nella stiva.
create or replace function space.abbandona(id bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_variable
declare
  io uuid := auth.uid();
  n space.nave;
  i space.insediamento;
  quota double precision := 0;
  spesa jsonb;
  voce record;
  capacita double precision;
  q double precision;
  reso jsonb := '{}';
begin
  if io is null then
    raise exception 'serve la sessione' using errcode = '42501';
  end if;
  perform space.assesta(io);
  select * into n from space.nave where giocatore = io for update;
  select * into i from space.insediamento s where s.id = id and s.giocatore = io for update;
  if i.id is null then
    raise exception 'insediamento_sconosciuto';
  end if;
  if i.tipo = 'madre' then
    raise exception 'non_abbandonabile';
  end if;
  -- La nave che lavora lì (un potenziamento nel suo cantiere, una ricerca nel suo laboratorio) resta.
  if exists (select 1 from space.costruzione c where c.insediamento = i.id and c.coda = 'nave' and c.fine > now())
    or exists (select 1 from space.ricerca r where r.insediamento = i.id and r.fine > now()) then
    raise exception 'nave_occupata';
  end if;

  if space.ricercata(io, 'I6') then
    quota := space.valore('{ricerche,effetti,I6}');
  end if;
  if quota > 0 then
    -- La spesa: la fondazione più i lavori della sua coda, finiti o no.
    spesa := i.costo;
    for voce in select e.key, sum(e.value::double precision) as valore
      from space.costruzione c, jsonb_each_text(c.costo) e
      where c.insediamento = i.id and c.coda = 'base' group by e.key
    loop
      spesa := spesa || jsonb_build_object(voce.key, coalesce((spesa ->> voce.key)::double precision, 0) + voce.valore);
    end loop;
    perform space.aggiorna_stiva(io, n);
    capacita := space.capacita_di(io, n.stiva);
    for voce in select * from jsonb_each_text(spesa) loop
      select s.quantita into q from space.stiva s where s.giocatore = io and s.risorsa = voce.key;
      q := greatest(0, least(voce.value::double precision * quota, capacita - q));
      if q > 0 then
        update space.stiva s set quantita = s.quantita + q where s.giocatore = io and s.risorsa = voce.key;
        reso := reso || jsonb_build_object(voce.key, q);
      end if;
    end loop;
  end if;

  delete from space.insediamento s where s.id = i.id;
  return jsonb_build_object('reso', reso);
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
