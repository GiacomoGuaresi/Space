-- Space · 029 · Ricerche dei gradini 7-8 (M8.4, doc/10-ricerche.md).
--
-- Diventano ricercabili Fionda gravitazionale (P6, anticipata da M9.2: la
-- chiede C7), Raffinazione III (P7, già in `costo_pieno_di`), Ponte risonante
-- (P8, già nel ponte), Contenimento gravitazionale (C7, +2 estrattori; quelli
-- sui buchi neri con M9.1), Estrazione profonda (C8, produzione +15 %),
-- Interferometria (S7, pulsar ×3), Radar profondo (S8, nel browser),
-- Automazione II (I7, tempi −15 %) e Superleghe (I8, Terre rare −15 %). Da
-- applicare dopo bilanciamento.sql. Rilanciabile.

-- Un costo con gli sconti delle ricerche (cantiere.ts, `conLeghe`): *Leghe* (I4) Metallo e Silicio,
-- *Superleghe* (I8) Terre rare, *Materia esotica* (I10) Materia oscura.
create or replace function space.con_leghe(io uuid, costo jsonb) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  effetti constant jsonb := space.bilanciamento() -> 'ricerche' -> 'effetti';
  sconto record;
  r text;
begin
  for sconto in select * from (values ('I4', array['metallo', 'silicio']), ('I8', array['terreRare']), ('I10', array['materiaOscura'])) v(ricerca, risorse)
  loop
    if not effetti ? sconto.ricerca or not space.ricercata(io, sconto.ricerca) then
      continue;
    end if;
    foreach r in array sconto.risorse loop
      if costo ? r then
        costo := costo || jsonb_build_object(r, (costo ->> r)::double precision * (1 - (effetti ->> sconto.ricerca)::double precision));
      end if;
    end loop;
  end loop;
  return costo;
end
$$;

-- Il raggio dello scanner del giocatore fermo in un settore di tipo `tipo` (navigazione.ts, `raggioQui`, 026):
-- con *Interferometria* (S7) presso una pulsar ×3.
create or replace function space.raggio_di(io uuid, livello int, tipo text) returns double precision
language sql stable set search_path = '' as $$
  select case
    when tipo = 'pulsar' and space.ricercata(io, 'S7') then space.raggio_scanner(livello, null) * space.valore('{ricerche,effetti,S7}')
    else space.raggio_scanner(livello, case when tipo = 'nebulosa' and space.ricercata(io, 'S5') then null else tipo end)
  end
$$;

-- Quanto produce all'ora per risorsa (insediamenti.ts, `ritmoInsediamento`, 022): base madre, colonie ed
-- estrattori, +15 % con *Estrazione profonda* (C8) del giocatore.
create or replace function space.ritmo_insediamento(i space.insediamento, livello int) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  ritmo double precision;
  pianeta text;
  base double precision;
  mix jsonb;
  voce record;
  ritmi jsonb := '{}';
  bonus double precision := case when space.ricercata(i.giocatore, 'C8') then 1 + space.valore('{ricerche,effetti,C8}') else 1 end;
begin
  if i.tipo = 'madre' then
    ritmo := space.a_livello(space.valore('{produzione,madre}') / 4, space.valore('{produzione,crescita}'), livello) * bonus;
    return jsonb_build_object('metallo', ritmo, 'silicio', ritmo, 'ghiaccio', ritmo, 'idrogeno', ritmo);
  elsif i.tipo = 'base' and i.pianeta is not null then
    pianeta := (space.pianeti(i.x, i.y, i.z))[i.pianeta + 1];
    if pianeta is null then
      return '{}';
    end if;
    base := space.valore('{produzione,ritmo,comune}') * space.ricchezza(i.x, i.y, i.z);
    for voce in select * from jsonb_each_text(space.bilanciamento() -> 'mix' -> 'pianeti' -> pianeta) loop
      ritmi := ritmi || jsonb_build_object(
        voce.key, space.a_livello(base * voce.value::double precision, space.valore('{produzione,crescita}'), livello) * bonus
      );
    end loop;
  elsif i.tipo = 'estrattore' then
    -- Col mix del corpo, al ritmo di ogni risorsa.
    mix := space.mix(i.x, i.y, i.z);
    if mix is null then
      return '{}';
    end if;
    for voce in select * from jsonb_each_text(mix) loop
      ritmi := ritmi || jsonb_build_object(
        voce.key, space.a_livello(
          space.ritmo_risorsa(voce.key) * space.ricchezza(i.x, i.y, i.z) * voce.value::double precision,
          space.valore('{produzione,crescita}'), livello
        ) * bonus
      );
    end loop;
  end if;
  return ritmi;
end
$$;

-- Avvia un lavoro nel cantiere della base dove la nave è attraccata (027), con *Automazione II* (I7).
create or replace function space.potenzia(lavoro text) returns jsonb
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_variable
declare
  io uuid := auth.uid();
  n space.nave;
  i space.insediamento;
  coda text;
  attuale int;
  livello int;
  costo jsonb;
  magazzino jsonb;
  voce record;
  q double precision;
  dal_magazzino double precision;
  inizio timestamptz;
  c space.costruzione;
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

  if lavoro in ('motore', 'serbatoio', 'ricarica', 'scanner', 'stiva') then
    coda := 'nave';
    if i.cantiere < 1 then
      raise exception 'serve_cantiere';
    end if;
    attuale := case lavoro
      when 'motore' then n.liv_motore when 'serbatoio' then n.liv_serbatoio when 'ricarica' then n.liv_ricarica
      when 'scanner' then n.scanner else n.stiva end;
  elsif lavoro in ('produzione', 'magazzino', 'cantiere', 'deposito', 'laboratorio', 'radar', 'ponte') then
    coda := 'base';
    if i.tipo = 'estrattore' and lavoro not in ('produzione', 'magazzino') then
      raise exception 'non_disponibile';
    end if;
    if lavoro = 'radar' and not space.ricercata(io, 'S3') or lavoro = 'ponte' and not space.ricercata(io, 'P3') then
      raise exception 'non_disponibile';
    end if;
    -- Nelle colonie il cantiere arriva con *Cantiere orbitale* (I3), il deposito con *Deposito* (I5).
    if i.tipo <> 'madre' and (
      (lavoro = 'cantiere' and not space.ricercata(io, 'I3')) or (lavoro = 'deposito' and not space.ricercata(io, 'I5'))
    ) then
      raise exception 'non_disponibile';
    end if;
    attuale := case lavoro
      when 'produzione' then i.produzione when 'magazzino' then i.magazzino
      when 'cantiere' then i.cantiere when 'deposito' then i.deposito when 'radar' then i.radar
      when 'ponte' then i.ponte else i.laboratorio end;
  else
    raise exception 'lavoro_sconosciuto';
  end if;
  -- Il livello dopo quelli già in coda.
  select greatest(attuale, coalesce(max(k.livello), 0)) + 1 into livello from space.costruzione k
  where k.giocatore = io and k.lavoro = lavoro and not k.applicata
    and (coda = 'nave' or k.insediamento = i.id);
  -- Il ponte non ha livelli.
  if lavoro = 'ponte' and livello > 1 then
    raise exception 'gia_costruito';
  end if;
  -- La nave non supera il doppio del cantiere; la stiva no, è sempre sbloccata.
  if coda = 'nave' and lavoro <> 'stiva' and livello > space.valore('{cantiere,tetto}') * i.cantiere then
    raise exception 'tetto_cantiere';
  end if;

  -- Il pagamento: prima il magazzino della base, poi la stiva (raccolta a mano compresa).
  costo := space.con_leghe(io, space.costo_lavoro(lavoro, livello));
  perform space.aggiorna_stiva(io, n);
  magazzino := space.magazzino_a(i, now());
  for voce in select * from jsonb_each_text(costo) loop
    select s.quantita into q from space.stiva s where s.giocatore = io and s.risorsa = voce.key;
    if voce.value::double precision > q + coalesce((magazzino ->> voce.key)::double precision, 0) then
      raise exception 'risorse_insufficienti';
    end if;
  end loop;
  for voce in select * from jsonb_each_text(costo) loop
    dal_magazzino := least(voce.value::double precision, coalesce((magazzino ->> voce.key)::double precision, 0));
    magazzino := magazzino || jsonb_build_object(voce.key, coalesce((magazzino ->> voce.key)::double precision, 0) - dal_magazzino);
    update space.stiva s set quantita = greatest(0, s.quantita - (voce.value::double precision - dal_magazzino))
    where s.giocatore = io and s.risorsa = voce.key;
  end loop;
  update space.insediamento set scorte = magazzino, ultima = now() where id = i.id;

  -- In coda dopo l'ultimo lavoro della stessa coda.
  select greatest(now(), coalesce(max(k.fine), now())) into inizio from space.costruzione k
  where k.giocatore = io and k.coda = coda and (coda = 'nave' or k.insediamento = i.id);
  insert into space.costruzione (giocatore, insediamento, coda, lavoro, livello, inizio, fine, costo)
  values (io, i.id, coda, lavoro, livello, inizio,
    inizio + make_interval(secs => space.durata_lavoro(lavoro, livello, i.cantiere)
      -- *Automazione* (I1) accorcia del 10 %, *Automazione II* (I7) del 15 %; la stiva dura sempre 1 h.
      * case when lavoro <> 'stiva' and space.ricercata(io, 'I1') then 1 - space.valore('{ricerche,effetti,I1}') else 1 end
      * case when lavoro <> 'stiva' and space.ricercata(io, 'I7') then 1 - space.valore('{ricerche,effetti,I7}') else 1 end
      * 3600), costo)
  returning * into c;
  return to_jsonb(c) - 'giocatore';
end
$$;

-- Parte verso (x, y, z) (027); con *Fionda gravitazionale* (P6) la fionda va ×2 e lascia gratis il 30 %.
create or replace function space.viaggia(x int, y int, z int) returns jsonb
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_variable
declare
  io uuid := auth.uid();
  n space.nave;
  carburante double precision;
  fionda boolean;
  ponte boolean;
  fattore double precision := 1;
  fionda_v double precision := space.valore('{fionda,velocita}');
  fionda_g double precision := space.valore('{fionda,gratis}');
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
  -- Il ponte (navigazione.ts, `viaPonte`): dalla base col ponte dove si è a un'altra col ponte.
  ponte := exists (select 1 from space.insediamento i where i.giocatore = io and (i.x, i.y, i.z) = (n.x, n.y, n.z) and i.ponte > 0)
    and exists (select 1 from space.insediamento i where i.giocatore = io and (i.x, i.y, i.z) = (x, y, z) and i.ponte > 0);
  if fionda and space.ricercata(io, 'P6') then
    fionda_v := space.valore('{fionda,gravitazionale,velocita}');
    fionda_g := space.valore('{fionda,gravitazionale,gratis}');
  end if;
  if ponte then
    fattore := case when space.ricercata(io, 'P8') then space.valore('{ricerche,effetti,P8}') else space.valore('{ponte,fattore}') end;
  end if;
  select * into r from space.rotta(
    n.x, n.y, n.z, x, y, z, carburante,
    -- La parte dei settori che consuma (navigazione.ts, `quotaConsumo`): fionda, *Iniettori* (P2) e ponte.
    ((case when fionda then 1 - fionda_g else 1 end)
      * (case when space.ricercata(io, 'P2') then 1 - space.valore('{ricerche,effetti,P2}') else 1 end)) / fattore
  );
  if r.percorsa = 0 then
    raise exception 'carburante_insufficiente';
  end if;
  arrivo := now() + make_interval(
    secs => r.percorsa / (n.velocita * (case when fionda then fionda_v else 1 end) * fattore) * 3600
  );

  perform space.assesta(io);
  perform space.aggiorna_stiva(io, n);
  -- Ripartendo da un insediamento si carica quello che ha prodotto durante la sosta.
  perform space.preleva(io, i, now()) from space.insediamento i
  where i.giocatore = io and (i.x, i.y, i.z) = (n.x, n.y, n.z);

  insert into space.viaggio (giocatore, da_x, da_y, da_z, meta_x, meta_y, meta_z, a_x, a_y, a_z, partenza, arrivo, consumo, fionda, ponte)
  values (io, n.x, n.y, n.z, x, y, z, r.ax, r.ay, r.az, now(), arrivo, r.consumo, fionda, ponte)
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
