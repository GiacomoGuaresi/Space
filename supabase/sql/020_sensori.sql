-- Space · 020 · Sensori 1-4 (M6.4, doc/10-ricerche.md#sensori).
--
-- Scansione in volo (lo scanner lavora lungo la rotta), Spettrometria e
-- Telemetria (si vedono nel browser), Radar (lo sblocco: la struttura arriva
-- in M7) diventano ricercabili. Da applicare dopo bilanciamento.sql.
-- Rilanciabile.

-- Parte verso (x, y, z) (017); con *Scansione in volo* scansiona anche lungo la rotta.
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
  passo double precision;
  t double precision;
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
  -- Durante un potenziamento la nave resta nel cantiere.
  if exists (select 1 from space.costruzione c where c.giocatore = io and c.coda = 'nave' and c.fine > now())
    or exists (select 1 from space.ricerca k where k.giocatore = io and k.fine > now()) then
    raise exception 'nave_occupata';
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

  perform space.assesta(io);
  perform space.aggiorna_stiva(io, n);
  -- Ripartendo da un insediamento si carica quello che ha prodotto durante la sosta.
  perform space.preleva(io, i, now()) from space.insediamento i
  where i.giocatore = io and (i.x, i.y, i.z) = (n.x, n.y, n.z);

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
  -- *Scansione in volo* (S1): lungo la rotta lo scanner rileva a ogni tratto lungo quanto il suo raggio,
  -- quando la nave ci passa.
  if space.ricercata(io, 'S1') then
    passo := space.raggio_scanner(n.scanner, null);
    for k in 1..floor(r.percorsa / passo)::int loop
      t := k * passo / r.percorsa;
      if t < 1 then
        perform space.scansiona(io,
          round(n.x + (r.ax - n.x) * t)::int, round(n.y + (r.ay - n.y) * t)::int, round(n.z + (r.az - n.z) * t)::int,
          n.scanner, now() + (arrivo - now()) * t);
      end if;
    end loop;
  end if;

  return to_jsonb(v) - 'giocatore';
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
