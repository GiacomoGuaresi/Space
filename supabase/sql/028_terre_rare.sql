-- Space · 028 · Terre rare (M8.2, doc/02-meccaniche.md#risorse).
--
-- In sosta presso una pulsar la nave raccoglie Terre rare a mano, al ritmo
-- delle Terre rare (3/h invece di 7/h) per la raccolta a mano (×3) e la
-- ricchezza. Con *Estrattori stellari* (C5) sulle pulsar si fonda un
-- estrattore (022 legge i tipi da `fondazione.estrattore.tipi`). Da applicare
-- dopo bilanciamento.sql con `mix.pulsar`. Rilanciabile.

-- Come si divide la produzione del corpo tra le risorse (risorse.ts, `mixCorpo`), o null: anche le pulsar (028).
create or replace function space.mix(x int, y int, z int) returns jsonb
language plpgsql immutable parallel safe set search_path = '' as $$
declare
  mix constant jsonb := space.bilanciamento() -> 'mix';
  tipo text := space.tipo_settore(x, y, z);
  pianeti text[];
  somme jsonb := '{}';
  voce record;
  risultato jsonb := '{}';
begin
  if tipo in ('asteroidi', 'gigante') then
    return mix -> tipo -> space.sottotipo(x, y, z);
  elsif tipo in ('nebulosa', 'pulsar') then
    return mix -> tipo;
  elsif tipo = 'sistema' then
    pianeti := space.pianeti(x, y, z);
    foreach tipo in array pianeti loop
      for voce in select * from jsonb_each_text(mix -> 'pianeti' -> tipo) loop
        somme := somme || jsonb_build_object(voce.key, coalesce((somme ->> voce.key)::double precision, 0) + voce.value::double precision);
      end loop;
    end loop;
    for voce in select * from jsonb_each_text(somme) loop
      risultato := risultato || jsonb_build_object(voce.key, voce.value::double precision / array_length(pianeti, 1));
    end loop;
    return risultato;
  end if;
  return null;
end
$$;

-- Quanto raccoglie la nave all'ora in sosta in (x, y, z) (risorse.ts, `ritmoMano`), o null: ogni risorsa al suo ritmo (028).
create or replace function space.ritmo_mano(x int, y int, z int) returns jsonb
language plpgsql immutable parallel safe set search_path = '' as $$
declare
  mix jsonb := space.mix(x, y, z);
  base double precision;
  voce record;
  risultato jsonb := '{}';
begin
  if mix is null then
    return null;
  end if;
  base := space.valore('{produzione,mano}');
  for voce in select * from jsonb_each_text(mix) loop
    risultato := risultato || jsonb_build_object(
      voce.key, base * space.ritmo_risorsa(voce.key) * space.ricchezza(x, y, z) * voce.value::double precision
    );
  end loop;
  return risultato;
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
