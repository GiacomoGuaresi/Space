-- Space · 019 · Colonizzazione 1-4 (M6.3, doc/10-ricerche.md#colonizzazione).
--
-- Astrofisica I (+2 basi), Estrattori minerari e Raccoglitori di gas (si
-- usano con gli estrattori, M7) e Magazzini modulari (tetto +20 %) diventano
-- ricercabili. Da applicare dopo bilanciamento.sql. Rilanciabile.

-- Quante basi può fondare il giocatore (insediamenti.ts, `basiFondabili`).
create or replace function space.basi_fondabili(io uuid) returns int
language sql stable set search_path = '' as $$
  select space.valore('{fondazione,basi}')::int
    + case when space.ricercata(io, 'C1') then space.valore('{ricerche,effetti,C1}')::int else 0 end
$$;

-- Il tetto del magazzino per risorsa (insediamenti.ts, `tettoMagazzino`), con le ricerche del giocatore (019).
create or replace function space.tetto_magazzino(i space.insediamento) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  voce record;
  tetti jsonb := '{}';
  -- *Magazzini modulari* (C4) alzano il tetto del 20 %.
  modulari double precision := case when space.ricercata(i.giocatore, 'C4') then 1 + space.valore('{ricerche,effetti,C4}') else 1 end;
begin
  for voce in select * from jsonb_each_text(space.ritmo_insediamento(i, 1)) loop
    tetti := tetti || jsonb_build_object(voce.key, space.a_livello(
      voce.value::double precision * space.valore('{magazzino,ore}'), space.valore('{magazzino,crescita}'), i.magazzino
    ) * modulari);
  end loop;
  return tetti;
end
$$;

-- Fonda una base sul sistema dove la nave è ferma, col pianeta `pianeta` (dalla stella, da 0):
-- la prima gratis, le altre pagate dalla stiva, fino al limite.
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
  end if;
  insert into space.insediamento (giocatore, x, y, z, tipo, pianeta)
  values (io, n.x, n.y, n.z, 'base', pianeta)
  returning * into i;
  return to_jsonb(i) - 'giocatore';
end
$$;

-- Il magazzino dipende ora dalle ricerche del giocatore: non è più immutabile.
alter function space.magazzino_a(space.insediamento, timestamptz) stable;

revoke all on all functions in schema space from public, anon;
grant execute on all functions in schema space to authenticated;
revoke execute on function space.scansiona(uuid, int, int, int, int, timestamptz) from authenticated;
revoke execute on function space.stiva_di(uuid) from authenticated;
revoke execute on function space.aggiorna_stiva(uuid, space.nave) from authenticated;
revoke execute on function space.assesta(uuid) from authenticated;
revoke execute on function space.preleva(uuid, space.insediamento, timestamptz) from authenticated;
revoke execute on function space.applica_costruzioni(uuid) from authenticated;
