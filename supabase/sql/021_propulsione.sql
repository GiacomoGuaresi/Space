-- Space · 021 · Propulsione 1-2 (M6.5, doc/10-ricerche.md#propulsione).
--
-- Raffinazione I (il pieno al deposito costa 4 Idrogeno per unità invece di 5)
-- e Iniettori (consumo −10 %) diventano ricercabili. Da applicare dopo
-- bilanciamento.sql. Rilanciabile.

-- L'Idrogeno del pieno per il giocatore (cantiere.ts, `costoPieno`): *Raffinazione I* ne toglie uno a unità.
create or replace function space.costo_pieno_di(io uuid, mancano double precision, deposito int) returns double precision
language sql stable set search_path = '' as $$
  select greatest(0, mancano) * space.a_livello(
    space.valore('{deposito,idrogeno}') - case when space.ricercata(io, 'P1') then space.valore('{ricerche,effetti,P1}') else 0 end,
    space.valore('{deposito,crescita}'),
    deposito
  )
$$;

-- Il pieno (016), con il costo del giocatore.
create or replace function space.pieno() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  io uuid := auth.uid();
  n space.nave;
  i space.insediamento;
  costo double precision;
  scorte_ora jsonb;
  dal_magazzino double precision;
  q double precision;
begin
  if io is null then
    raise exception 'serve la sessione' using errcode = '42501';
  end if;
  perform space.assesta(io);
  select * into n from space.nave where giocatore = io for update;
  if now() < n.dal then
    raise exception 'in_viaggio';
  end if;
  select * into i from space.insediamento s where s.giocatore = io and (s.x, s.y, s.z) = (n.x, n.y, n.z) for update;
  if i.id is null then
    raise exception 'non_in_base';
  end if;
  if i.deposito < 1 then
    raise exception 'serve_deposito';
  end if;
  costo := space.costo_pieno_di(io, n.serbatoio - space.carburante_ora(n), i.deposito);
  if costo <= 0 then
    raise exception 'gia_pieno';
  end if;
  perform space.aggiorna_stiva(io, n);
  scorte_ora := space.magazzino_a(i, now());
  select s.quantita into q from space.stiva s where s.giocatore = io and s.risorsa = 'idrogeno';
  if costo > q + coalesce((scorte_ora ->> 'idrogeno')::double precision, 0) then
    raise exception 'risorse_insufficienti';
  end if;
  dal_magazzino := least(costo, coalesce((scorte_ora ->> 'idrogeno')::double precision, 0));
  update space.insediamento
  set scorte = scorte_ora || jsonb_build_object('idrogeno', coalesce((scorte_ora ->> 'idrogeno')::double precision, 0) - dal_magazzino),
    ultima = now()
  where id = i.id;
  update space.stiva s set quantita = greatest(0, s.quantita - (costo - dal_magazzino))
  where s.giocatore = io and s.risorsa = 'idrogeno';
  -- In base il tetto è il serbatoio: salvato pieno, resta pieno.
  update space.nave set carburante = n.serbatoio where giocatore = io;
  return jsonb_build_object('idrogeno', costo);
end
$$;

-- Parte verso (x, y, z) (020); con *Iniettori* consuma il 10 % in meno.
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
    -- La parte dei settori che consuma (navigazione.ts, `quotaConsumo`): fionda e *Iniettori* (P2).
    (case when fionda then 1 - space.valore('{fionda,gratis}') else 1 end)
      * (case when space.ricercata(io, 'P2') then 1 - space.valore('{ricerche,effetti,P2}') else 1 end)
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
