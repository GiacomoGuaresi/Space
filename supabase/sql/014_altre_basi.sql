-- Space · 014 · Altre basi (M4.7, doc/09-bilanciamento.md#insediamenti).
--
-- Dopo la prima, una base costa `150 × 1,6^(basi fondate − 1)` in parti uguali
-- di Metallo, Silicio e Ghiaccio, pagata dalla stiva, fino al limite di basi.
-- Da applicare dopo bilanciamento.sql con `fondazione`. Rilanciabile.

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
  if fondate >= space.valore('{fondazione,basi}') then
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

revoke all on all functions in schema space from public, anon;
grant execute on all functions in schema space to authenticated;
revoke execute on function space.scansiona(uuid, int, int, int, int, timestamptz) from authenticated;
revoke execute on function space.stiva_di(uuid) from authenticated;
revoke execute on function space.aggiorna_stiva(uuid, space.nave) from authenticated;
revoke execute on function space.assesta(uuid) from authenticated;
revoke execute on function space.preleva(uuid, space.insediamento, timestamptz) from authenticated;
