-- Space · 009 · Raccolta a mano (M4.2, doc/02-meccaniche.md#risorse).
--
-- In sosta su un corpo con risorse la nave raccoglie da sola, fino alla stiva
-- piena. Servono ricchezza, sottotipo e pianeti del settore, identici a
-- settore.ts (verificati da `npm run verifica-sql`). La quantità si calcola
-- alla lettura; si scrive nella stiva alla partenza. Da applicare dopo
-- bilanciamento.sql con `produzione` e `mix`. Rilanciabile.

-- Una chiave scelta in proporzione al suo peso (casuale.ts, `pesato`): i pesi zero non escono mai.
create or replace function space.pesato(stato bigint, chiavi text[], pesi double precision[], out nuovo bigint, out scelta text)
language plpgsql immutable parallel safe set search_path = '' as $$
declare
  n double precision;
  totale double precision := 0;
  estratto double precision;
begin
  select m.nuovo, m.numero into nuovo, n from space.mulberry(stato) m;
  for i in 1..array_length(pesi, 1) loop
    totale := totale + pesi[i];
  end loop;
  estratto := n * totale;
  for i in 1..array_length(pesi, 1) loop
    if pesi[i] > 0 then
      scelta := chiavi[i];
      if estratto < pesi[i] then
        return;
      end if;
      estratto := estratto - pesi[i];
    end if;
  end loop;
end
$$;

-- La ricchezza del corpo (settore.ts): la media alla sua distanza per un numero tra 0,6 e 1,4, ai centesimi.
create or replace function space.ricchezza(x int, y int, z int) returns double precision
language plpgsql immutable parallel safe set search_path = '' as $$
declare
  n double precision;
  d double precision := sqrt(x::double precision * x + y::double precision * y + z::double precision * z);
  v double precision;
begin
  select m.numero into n from space.mulberry(space.derivato(space.seed_settore(x, y, z), 2)) m;
  v := (1 + sqrt(greatest(0, d) / 100)) * (0.6::double precision + n * (1.4::double precision - 0.6::double precision)) * 100;
  -- Math.round di JavaScript: le metà verso l'alto.
  return floor(v + 0.5) / 100;
end
$$;

-- Il sottotipo che decide il mix: composizione degli asteroidi, anelli dei giganti; null per gli altri.
create or replace function space.sottotipo(x int, y int, z int) returns text
language plpgsql immutable parallel safe set search_path = '' as $$
declare
  tipo text := space.tipo_settore(x, y, z);
  stato bigint := space.derivato(space.seed_settore(x, y, z), 3);
  n double precision;
  p record;
begin
  if tipo = 'asteroidi' then
    select * into p from space.pesato(stato, array['metallica', 'silicea', 'mista'], array[3, 3, 4]::double precision[]);
    return p.scelta;
  elsif tipo = 'gigante' then
    select m.numero into n from space.mulberry(stato) m;
    return case when n < 0.5 then 'anelli' else 'senza' end;
  end if;
  return null;
end
$$;

-- I tipi dei pianeti di un sistema, dalla stella verso fuori (settore.ts, `stella` e `pianeti`):
-- si consumano gli stessi numeri, anche quelli che qui non servono.
create or replace function space.pianeti(x int, y int, z int) returns text[]
language plpgsql immutable parallel safe set search_path = '' as $$
declare
  stato bigint := space.derivato(space.seed_settore(x, y, z), 3);
  n double precision;
  p record;
  quanti int;
  orbita double precision;
  pesi double precision[];
  tipi text[] := array[]::text[];
begin
  if space.tipo_settore(x, y, z) is distinct from 'sistema' then
    return null;
  end if;
  -- La stella: classe, temperatura, raggio.
  select * into p from space.pesato(stato, array['M', 'K', 'G', 'F', 'B'], array[45, 25, 15, 10, 5]::double precision[]);
  stato := p.nuovo;
  for i in 1..2 loop
    select m.nuovo into stato from space.mulberry(stato) m;
  end loop;
  -- I pianeti.
  select m.nuovo, m.numero into stato, n from space.mulberry(stato) m;
  quanti := 1 + floor(n * 7)::int;
  select m.nuovo, m.numero into stato, n from space.mulberry(stato) m;
  orbita := 0.3::double precision + n * (0.6::double precision - 0.3::double precision);
  for i in 1..quanti loop
    pesi := case
      when orbita < 1.5 then array[6, 3, 0, 1]
      when orbita < 4 then array[2, 2, 2, 4]
      else array[1, 0, 4, 5]
    end;
    select * into p from space.pesato(stato, array['roccioso', 'oceanico', 'ghiacciato', 'gassoso'], pesi);
    stato := p.nuovo;
    tipi := tipi || p.scelta;
    -- Raggio, fase, anelli.
    for j in 1..3 loop
      select m.nuovo into stato from space.mulberry(stato) m;
    end loop;
    select m.nuovo, m.numero into stato, n from space.mulberry(stato) m;
    orbita := orbita * (1.4::double precision + n * (2.1::double precision - 1.4::double precision));
  end loop;
  return tipi;
end
$$;

-- Come si divide la produzione del corpo tra le risorse (risorse.ts, `mixCorpo`), o null.
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
  elsif tipo = 'nebulosa' then
    return mix -> 'nebulosa';
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

-- Quanto raccoglie la nave all'ora in sosta in (x, y, z) (risorse.ts, `ritmoMano`), o null.
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
  base := space.valore('{produzione,mano}') * space.valore('{produzione,ritmo,comune}') * space.ricchezza(x, y, z);
  for voce in select * from jsonb_each_text(mix) loop
    risultato := risultato || jsonb_build_object(voce.key, base * voce.value::double precision);
  end loop;
  return risultato;
end
$$;

-- Scrive nella stiva quello che c'è adesso, raccolta a mano compresa (risorse.ts, `caricoOra`).
create or replace function space.aggiorna_stiva(io uuid, n space.nave) returns void
language plpgsql security definer set search_path = '' as $$
declare
  ritmi jsonb;
  capacita double precision := space.capacita_stiva(n.stiva);
begin
  perform space.stiva_di(io);
  if n.dal > now() then
    return;
  end if;
  ritmi := space.ritmo_mano(n.x, n.y, n.z);
  update space.stiva s
  set quantita = case
      when ritmi ? s.risorsa and s.quantita < capacita then least(
        capacita,
        s.quantita + (ritmi ->> s.risorsa)::double precision
          * greatest(0, extract(epoch from now() - greatest(s.dal, n.dal))) / 3600
      )
      else s.quantita
    end,
    dal = now()
  where s.giocatore = io;
end
$$;

-- Parte verso (x, y, z) (007), e prima scrive nella stiva la raccolta della sosta.
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
  select * into r from space.rotta(
    n.x, n.y, n.z, x, y, z, carburante,
    case when fionda then 1 - space.valore('{fionda,gratis}') else 1 end
  );
  if r.percorsa = 0 then
    raise exception 'carburante_insufficiente';
  end if;
  arrivo := now() + make_interval(
    secs => r.percorsa / (n.velocita * (case when fionda then space.valore('{fionda,velocita}') else 1 end)) * 3600
  );

  perform space.aggiorna_stiva(io, n);

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
  perform space.scansiona(io, r.ax, r.ay, r.az, n.scanner, arrivo);

  return to_jsonb(v) - 'giocatore';
end
$$;

revoke all on all functions in schema space from public, anon;
grant execute on all functions in schema space to authenticated;
revoke execute on function space.scansiona(uuid, int, int, int, int, timestamptz) from authenticated;
revoke execute on function space.stiva_di(uuid) from authenticated;
revoke execute on function space.aggiorna_stiva(uuid, space.nave) from authenticated;
