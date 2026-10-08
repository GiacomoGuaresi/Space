-- Space · 005 · Rari ad anelli (M3.5, doc/09-bilanciamento.md#distribuzione-dei-corpi).
--
-- Da applicare dopo bilanciamento.sql con le soglie. Il tipo di un settore
-- segue le soglie dei rari (catalogo.ts, `pesi`); le scoperte già salvate si
-- riallineano all'universo nuovo. Rilanciabile.

create or replace function space.tipo_settore(x int, y int, z int) returns text
language plpgsql immutable parallel safe set search_path = '' as $$
declare
  -- Lo stesso ordine di CATALOGO in catalogo.ts: decide l'estrazione.
  tipi constant text[] := array['asteroidi', 'nebulosa', 'stella', 'sistema', 'gigante', 'cometa', 'pulsar', 'buconero', 'relitto', 'wormhole'];
  universo constant jsonb := space.bilanciamento() -> 'universo';
  lontananza constant double precision := (universo ->> 'distanzaLontana')::double precision;
  stato bigint;
  n double precision;
  d double precision;
  t double precision;
  vicino double precision;
  lontano double precision;
  soglia double precision;
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
  if not (n < (universo ->> 'pienezza')::double precision) then
    return null;
  end if;
  select m.nuovo, m.numero into stato, n from space.mulberry(stato) m;

  d := sqrt(x::double precision * x + y::double precision * y + z::double precision * z);
  t := least(1, greatest(0, d / lontananza));
  for i in 1..10 loop
    vicino := (universo -> 'pesiVicini' ->> tipi[i])::double precision;
    lontano := (universo -> 'pesiLontani' ->> tipi[i])::double precision;
    soglia := (universo -> 'soglie' ->> tipi[i])::double precision;
    if soglia is null then
      pesi := pesi || (vicino + (lontano - vicino) * t);
    elsif d < soglia then
      pesi := pesi || 0::double precision;
    else
      pesi := pesi || (lontano * least(1, (d - soglia) / (lontananza - soglia)));
    end if;
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

-- Le scoperte seguono l'universo: un settore può aver cambiato tipo o essere vuoto.
delete from space.scoperta where space.tipo_settore(x, y, z) is null;
update space.scoperta set tipo = space.tipo_settore(x, y, z) where tipo is distinct from space.tipo_settore(x, y, z);

revoke all on all functions in schema space from public, anon;
grant execute on all functions in schema space to authenticated;
