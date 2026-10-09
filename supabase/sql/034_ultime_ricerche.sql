-- Space · 034 · Ultime ricerche (M9.6, doc/10-ricerche.md).
--
-- Diventano ricercabili i gradini 9-10 che mancano: Raffinazione IV (P10),
-- Recupero (C9, già in `assesta`, 031), Astrofisica III (C10), Rilevamento
-- gravitazionale (S10, nello scanner del browser), Doppia coda (I9) e Materia
-- esotica (I10, già in `con_leghe`); e i due nodi infiniti, Propulsione
-- avanzata (P∞: velocità ×1,04 a livello) e Colonizzazione avanzata (C∞: una
-- base ogni 2 livelli, un estrattore e produzione ×1,03 a livello). Da
-- applicare dopo bilanciamento.sql. Rilanciabile.

-- A che livello è il nodo `nodo` per il giocatore: i livelli finiti (ricerche.ts, `livelloRicerca`).
create or replace function space.livello_ricerca(io uuid, nodo text) returns int
language sql stable set search_path = '' as $$
  select count(*)::int from space.ricerca r where r.giocatore = io and r.nodo = livello_ricerca.nodo and r.fine <= now()
$$;

-- Il costo del livello `livello` di un nodo infinito (ricerche.ts, `costoRicerca`): un livello 20 + L di base 60.
create or replace function space.costo_ricerca_infinita(livello int) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare
  ricerche constant jsonb := space.bilanciamento() -> 'ricerche';
  equivalente int := (ricerche -> 'infiniti' ->> 'livello')::int + livello;
  totale double precision := space.a_livello((ricerche ->> 'base')::double precision, space.valore('{cantiere,crescita}'), equivalente);
  voce record;
  costo jsonb := '{}';
begin
  for voce in select * from jsonb_each_text(space.ricetta(equivalente)) loop
    costo := costo || jsonb_build_object(voce.key, totale * voce.value::double precision);
  end loop;
  return costo;
end
$$;

-- Quante basi può fondare il giocatore (insediamenti.ts, `basiFondabili`, 026): più una ogni 2 livelli di C∞.
create or replace function space.basi_fondabili(io uuid) returns int
language sql stable set search_path = '' as $$
  select space.valore('{fondazione,basi}')::int + coalesce((
    select sum((space.bilanciamento() -> 'ricerche' -> 'effetti' ->> r)::int)
    from unnest(array['C1', 'C6', 'C10']) r
    where space.ricercata(io, r) and space.bilanciamento() -> 'ricerche' -> 'effetti' ? r
  ), 0)::int + space.livello_ricerca(io, 'C∞') / space.valore('{ricerche,infiniti,basiOgni}')::int
$$;

-- Quanti estrattori può fondare il giocatore (insediamenti.ts, `estrattoriFondabili`, 022): più uno a livello di C∞.
create or replace function space.estrattori_fondabili(io uuid) returns int
language sql stable set search_path = '' as $$
  select coalesce(sum(l.value::int), 0)::int
    + space.livello_ricerca(io, 'C∞') * space.valore('{ricerche,infiniti,estrattori}')::int
  from jsonb_each_text(space.bilanciamento() -> 'fondazione' -> 'estrattore' -> 'limite') l
  where space.ricercata(io, l.key)
$$;

-- Quanto produce all'ora per risorsa (insediamenti.ts, `ritmoInsediamento`, 029): base madre, colonie ed
-- estrattori, +15 % con *Estrazione profonda* (C8) e ×1,03 a livello di *Colonizzazione avanzata* (C∞).
create or replace function space.ritmo_insediamento(i space.insediamento, livello int) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  ritmo double precision;
  pianeta text;
  base double precision;
  mix jsonb;
  voce record;
  ritmi jsonb := '{}';
  bonus double precision := (case when space.ricercata(i.giocatore, 'C8') then 1 + space.valore('{ricerche,effetti,C8}') else 1 end)
    * space.a_livello(1, space.valore('{ricerche,effetti,C∞}'), space.livello_ricerca(i.giocatore, 'C∞') + 1);
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

-- Avvia la ricerca `nodo` nel laboratorio della base dove la nave è attraccata (031): i nodi infiniti
-- si ricercano a livelli, e il livello L costa come un livello 20 + L di base 60.
create or replace function space.ricerca(nodo text) returns jsonb
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_variable
declare
  io uuid := auth.uid();
  n space.nave;
  i space.insediamento;
  definizione jsonb := space.bilanciamento() -> 'ricerche' -> 'nodi' -> nodo;
  g int;
  costo jsonb;
  scorte_ora jsonb;
  voce record;
  q double precision;
  dal_magazzino double precision;
  r space.ricerca;
  infinito boolean := nodo in ('P∞', 'C∞');
  livello int := 1;
begin
  if io is null then
    raise exception 'serve la sessione' using errcode = '42501';
  end if;
  if definizione is null then
    raise exception 'ricerca_sconosciuta';
  end if;
  if not (space.bilanciamento() -> 'ricerche' -> 'attive') ? nodo then
    raise exception 'non_disponibile';
  end if;
  perform space.assesta(io);
  select * into n from space.nave where giocatore = io for update;
  if now() < n.dal then
    raise exception 'in_viaggio';
  end if;
  if not infinito and exists (select 1 from space.ricerca k where k.giocatore = io and k.nodo = nodo) then
    raise exception 'gia_ricercata';
  end if;
  if exists (select 1 from space.ricerca k where k.giocatore = io and k.fine > now()) then
    raise exception 'ricerca_in_corso';
  end if;
  if exists (
    select 1 from jsonb_array_elements_text(definizione -> 'richiede') p where not space.ricercata(io, p)
  ) then
    raise exception 'prerequisiti';
  end if;
  select * into i from space.insediamento s where s.giocatore = io and (s.x, s.y, s.z) = (n.x, n.y, n.z) for update;
  if i.id is null then
    raise exception 'non_in_base';
  end if;
  g := (definizione ->> 'gradino')::int;
  if i.laboratorio < g then
    raise exception 'serve_laboratorio';
  end if;

  -- Il pagamento: prima il magazzino della base, poi la stiva.
  if infinito then
    livello := space.livello_ricerca(io, nodo) + 1;
    costo := space.con_leghe(io, space.costo_ricerca_infinita(livello));
  else
    costo := space.con_leghe(io, space.costo_ricerca(g));
  end if;
  if n.progetti > 0 then
    select jsonb_object_agg(k, v::double precision * space.valore('{relitto,sconto}')) into costo from jsonb_each_text(costo) e(k, v);
  end if;
  perform space.aggiorna_stiva(io, n);
  scorte_ora := space.magazzino_a(i, now());
  for voce in select * from jsonb_each_text(costo) loop
    select s.quantita into q from space.stiva s where s.giocatore = io and s.risorsa = voce.key;
    if voce.value::double precision > q + coalesce((scorte_ora ->> voce.key)::double precision, 0) then
      raise exception 'risorse_insufficienti';
    end if;
  end loop;
  for voce in select * from jsonb_each_text(costo) loop
    dal_magazzino := least(voce.value::double precision, coalesce((scorte_ora ->> voce.key)::double precision, 0));
    scorte_ora := scorte_ora || jsonb_build_object(voce.key, coalesce((scorte_ora ->> voce.key)::double precision, 0) - dal_magazzino);
    update space.stiva s set quantita = greatest(0, s.quantita - (voce.value::double precision - dal_magazzino))
    where s.giocatore = io and s.risorsa = voce.key;
  end loop;
  update space.insediamento set scorte = scorte_ora, ultima = now() where id = i.id;

  if n.progetti > 0 then
    update space.nave set progetti = progetti - 1 where giocatore = io;
  end if;
  insert into space.ricerca (giocatore, nodo, livello, insediamento, inizio, fine, costo)
  values (io, nodo, livello, i.id, now(), now() + make_interval(secs => space.durata_ricerca(g) * 3600), costo)
  returning * into r;
  return to_jsonb(r) - 'giocatore';
end
$$;

-- Avvia un lavoro nel cantiere della base dove la nave è attraccata (029); con *Doppia coda* (I9) la coda
-- di una base costruisce due lavori insieme, ma mai due livelli della stessa cosa.
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

  -- In coda dopo l'ultimo lavoro della stessa coda; con *Doppia coda* dopo il penultimo, e dopo
  -- l'ultimo livello della stessa cosa.
  if coda = 'base' and space.ricercata(io, 'I9') then
    select greatest(
      now(),
      coalesce((select k.fine from space.costruzione k where k.giocatore = io and k.coda = 'base' and k.insediamento = i.id
        order by k.fine desc offset 1 limit 1), now()),
      coalesce((select max(k.fine) from space.costruzione k where k.giocatore = io and k.coda = 'base' and k.insediamento = i.id
        and k.lavoro = lavoro), now())
    ) into inizio;
  else
    select greatest(now(), coalesce(max(k.fine), now())) into inizio from space.costruzione k
    where k.giocatore = io and k.coda = coda and (coda = 'nave' or k.insediamento = i.id);
  end if;
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

-- Parte verso (x, y, z) (029); con *Propulsione avanzata* (P∞) la nave va ×1,04 a livello.
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
    secs => r.percorsa / (
      n.velocita * space.a_livello(1, space.valore('{ricerche,effetti,P∞}'), space.livello_ricerca(io, 'P∞') + 1)
        * (case when fionda then fionda_v else 1 end) * fattore
    ) * 3600
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
