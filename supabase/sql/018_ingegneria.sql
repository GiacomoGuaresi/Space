-- Space · 018 · Ingegneria 1-4 (M6.2, doc/10-ricerche.md#ingegneria).
--
-- Automazione (tempi −10 %), Stiva modulare (+15 %), Cantiere orbitale (il
-- cantiere nelle colonie) e Leghe (Metallo e Silicio −10 % nelle ricette)
-- diventano ricercabili: `bilanciamento.ricerche.attive` e `effetti`. Da
-- applicare dopo bilanciamento.sql. Rilanciabile.

-- La capacità della stiva del giocatore (risorse.ts, `capacitaNave`): *Stiva modulare* la alza.
create or replace function space.capacita_di(io uuid, livello int) returns double precision
language sql stable set search_path = '' as $$
  select space.capacita_stiva(livello)
    * case when space.ricercata(io, 'I2') then 1 + space.valore('{ricerche,effetti,I2}') else 1 end
$$;

-- Un costo con *Leghe* (cantiere.ts, `conLeghe`): Metallo e Silicio −10 %.
create or replace function space.con_leghe(io uuid, costo jsonb) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  sconto double precision := 1 - space.valore('{ricerche,effetti,I4}');
  r text;
begin
  if not space.ricercata(io, 'I4') then
    return costo;
  end if;
  foreach r in array array['metallo', 'silicio'] loop
    if costo ? r then
      costo := costo || jsonb_build_object(r, (costo ->> r)::double precision * sconto);
    end if;
  end loop;
  return costo;
end
$$;

-- Scrive nella stiva quello che c'è adesso, raccolta a mano compresa (risorse.ts, `caricoOra`).
create or replace function space.aggiorna_stiva(io uuid, n space.nave) returns void
language plpgsql security definer set search_path = '' as $$
declare
  ritmi jsonb;
  capacita double precision := space.capacita_di(io, n.stiva);
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

-- Il magazzino di `i` a `istante` passa nella stiva, fin dove c'è posto; il resto resta nel magazzino.
create or replace function space.preleva(io uuid, i space.insediamento, istante timestamptz) returns void
language plpgsql security definer set search_path = '' as $$
declare
  n space.nave;
  capacita double precision;
  magazzino jsonb := space.magazzino_a(i, istante);
  resto jsonb := '{}';
  preso jsonb := '{}';
  voce record;
  q double precision;
  p double precision;
begin
  select * into n from space.nave where giocatore = io;
  perform space.stiva_di(io);
  capacita := space.capacita_di(io, n.stiva);
  for voce in select * from jsonb_each_text(magazzino) loop
    select s.quantita into q from space.stiva s where s.giocatore = io and s.risorsa = voce.key;
    p := greatest(0, least(voce.value::double precision, capacita - q));
    if p > 0 then
      update space.stiva s set quantita = s.quantita + p where s.giocatore = io and s.risorsa = voce.key;
      preso := preso || jsonb_build_object(voce.key, p);
    end if;
    if voce.value::double precision - p > 0 then
      resto := resto || jsonb_build_object(voce.key, voce.value::double precision - p);
    end if;
  end loop;
  update space.insediamento set scorte = resto, ultima = istante where id = i.id;
  if preso <> '{}' then
    insert into space.prelievo (giocatore, insediamento, istante, preso) values (io, i.id, istante, preso)
    on conflict do nothing;
  end if;
end
$$;

-- Gli eventi dell'arrivo (012), se la nave è arrivata e non sono ancora stati sistemati: i
-- lavori finiti del cantiere, la cometa e il magazzino dell'insediamento.
create or replace function space.assesta(io uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  n space.nave;
  bottino jsonb;
  capacita double precision;
  preso jsonb := '{}';
  voce record;
  q double precision;
begin
  -- Prima i lavori finiti del cantiere, anche in viaggio (quelli delle basi).
  perform space.applica_costruzioni(io);
  select * into n from space.nave where giocatore = io for update;
  if n.giocatore is null or n.dal > now() then
    return;
  end if;
  bottino := space.bottino_cometa(n.x, n.y, n.z);
  if bottino is not null and not exists (
    select 1 from space.raccolto r where r.giocatore = io and (r.x, r.y, r.z) = (n.x, n.y, n.z)
  ) then
    perform space.stiva_di(io);
    capacita := space.capacita_di(io, n.stiva);
    for voce in select * from jsonb_each_text(bottino) loop
      select s.quantita into q from space.stiva s where s.giocatore = io and s.risorsa = voce.key;
      q := greatest(0, least(voce.value::double precision, capacita - q));
      preso := preso || jsonb_build_object(voce.key, q);
      update space.stiva s set quantita = s.quantita + q where s.giocatore = io and s.risorsa = voce.key;
    end loop;
    insert into space.raccolto (giocatore, x, y, z, istante, bottino) values (io, n.x, n.y, n.z, n.dal, preso);
  end if;
  -- L'insediamento dove si arriva passa nella stiva, una volta per arrivo.
  if n.assestato is distinct from n.dal then
    perform space.preleva(io, i, n.dal) from space.insediamento i
    where i.giocatore = io and (i.x, i.y, i.z) = (n.x, n.y, n.z);
    update space.nave set assestato = n.dal where giocatore = io;
  end if;
end
$$;

-- Avvia un lavoro nel cantiere della base dove la nave è attraccata: il livello successivo
-- (contando quelli già in coda), pagato subito dal magazzino della base e poi dalla stiva.
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
  elsif lavoro in ('produzione', 'magazzino', 'cantiere', 'deposito', 'laboratorio') then
    coda := 'base';
    -- Nelle colonie il cantiere arriva con *Cantiere orbitale* (I3), il deposito con *Deposito* (I5).
    if i.tipo <> 'madre' and (
      (lavoro = 'cantiere' and not space.ricercata(io, 'I3')) or (lavoro = 'deposito' and not space.ricercata(io, 'I5'))
    ) then
      raise exception 'non_disponibile';
    end if;
    attuale := case lavoro
      when 'produzione' then i.produzione when 'magazzino' then i.magazzino
      when 'cantiere' then i.cantiere when 'deposito' then i.deposito else i.laboratorio end;
  else
    raise exception 'lavoro_sconosciuto';
  end if;
  -- Il livello dopo quelli già in coda.
  select greatest(attuale, coalesce(max(k.livello), 0)) + 1 into livello from space.costruzione k
  where k.giocatore = io and k.lavoro = lavoro and not k.applicata
    and (coda = 'nave' or k.insediamento = i.id);
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
      -- *Automazione* (I1) accorcia del 10 %; la stiva dura sempre 1 h.
      * case when lavoro <> 'stiva' and space.ricercata(io, 'I1') then 1 - space.valore('{ricerche,effetti,I1}') else 1 end
      * 3600), costo)
  returning * into c;
  return to_jsonb(c) - 'giocatore';
end
$$;

-- Avvia la ricerca `nodo` nel laboratorio della base dove la nave è attraccata.
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
  if exists (select 1 from space.ricerca k where k.giocatore = io and k.nodo = nodo) then
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
  costo := space.con_leghe(io, space.costo_ricerca(g));
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

  insert into space.ricerca (giocatore, nodo, insediamento, inizio, fine, costo)
  values (io, nodo, i.id, now(), now() + make_interval(secs => space.durata_ricerca(g) * 3600), costo)
  returning * into r;
  return to_jsonb(r) - 'giocatore';
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
