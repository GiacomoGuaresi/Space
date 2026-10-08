-- Space · 013 · Prima colonia (M4.6, doc/02-meccaniche.md#insediamenti).
--
-- Su un sistema planetario si fonda una base scegliendo il pianeta: produce
-- `7 × ricchezza` all'ora col mix di quel pianeta. La prima è gratis; le altre
-- arrivano con 4.7. Rilanciabile.

-- Quanto produce all'ora per risorsa (insediamenti.ts, `ritmoInsediamento`): la base madre (011) e le colonie.
create or replace function space.ritmo_insediamento(i space.insediamento, livello int) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare
  ritmo double precision;
  pianeta text;
  base double precision;
  voce record;
  ritmi jsonb := '{}';
begin
  if i.tipo = 'madre' then
    ritmo := space.a_livello(space.valore('{produzione,madre}') / 4, space.valore('{produzione,crescita}'), livello);
    return jsonb_build_object('metallo', ritmo, 'silicio', ritmo, 'ghiaccio', ritmo, 'idrogeno', ritmo);
  elsif i.tipo = 'base' and i.pianeta is not null then
    pianeta := (space.pianeti(i.x, i.y, i.z))[i.pianeta + 1];
    if pianeta is null then
      return '{}';
    end if;
    base := space.valore('{produzione,ritmo,comune}') * space.ricchezza(i.x, i.y, i.z);
    for voce in select * from jsonb_each_text(space.bilanciamento() -> 'mix' -> 'pianeti' -> pianeta) loop
      ritmi := ritmi || jsonb_build_object(
        voce.key, space.a_livello(base * voce.value::double precision, space.valore('{produzione,crescita}'), livello)
      );
    end loop;
  end if;
  return ritmi;
end
$$;

-- Fonda una base sul sistema dove la nave è ferma, col pianeta `pianeta` (dalla stella, da 0).
create or replace function space.fonda(pianeta int) returns jsonb
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_variable
declare
  io uuid := auth.uid();
  n space.nave;
  pianeti text[];
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
  -- La prima colonia è gratis; le altre arrivano con 4.7.
  if exists (select 1 from space.insediamento s where s.giocatore = io and s.tipo = 'base') then
    raise exception 'limite_basi';
  end if;
  insert into space.insediamento (giocatore, x, y, z, tipo, pianeta)
  values (io, n.x, n.y, n.z, 'base', pianeta)
  returning * into i;
  return to_jsonb(i) - 'giocatore';
end
$$;

revoke all on all functions in schema space from public, anon;
grant execute on all functions in schema space to authenticated;
revoke execute on function space.scansiona(uuid, int, int, int, int, timestamptz) from authenticated;
revoke execute on function space.stiva_di(uuid) from authenticated;
revoke execute on function space.aggiorna_stiva(uuid, space.nave) from authenticated;
revoke execute on function space.assesta(uuid) from authenticated;
revoke execute on function space.preleva(uuid, space.insediamento, timestamptz) from authenticated;
