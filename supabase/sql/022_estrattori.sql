-- Space · 022 · Estrattori (M7.1, doc/02-meccaniche.md#insediamenti).
--
-- Su asteroidi (con *Estrattori minerari*, C2), nebulose e giganti (con
-- *Raccoglitori di gas*, C3) si fonda un estrattore, pagato dalla stiva:
-- `60 × 1,4^(estrattori già fondati)` in parti uguali di Metallo e Silicio,
-- fino al limite dato dalle ricerche. Produce col mix del corpo e ha solo
-- produzione e magazzino. Da applicare dopo bilanciamento.sql con
-- `fondazione.estrattore`. Rilanciabile.

-- Il ritmo di un estrattore di livello 1 su un corpo di ricchezza 1 (risorse.ts, `ritmoRisorsa`).
create or replace function space.ritmo_risorsa(r text) returns double precision
language sql immutable parallel safe set search_path = '' as $$
  select space.valore(array['produzione', 'ritmo', case r when 'terreRare' then 'terreRare' when 'materiaOscura' then 'materiaOscura' else 'comune' end])
$$;

-- Quanto produce all'ora per risorsa (insediamenti.ts, `ritmoInsediamento`): base madre, colonie (013) ed estrattori.
create or replace function space.ritmo_insediamento(i space.insediamento, livello int) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare
  ritmo double precision;
  pianeta text;
  base double precision;
  mix jsonb;
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
        )
      );
    end loop;
  end if;
  return ritmi;
end
$$;

-- Quanti estrattori può fondare il giocatore (insediamenti.ts, `estrattoriFondabili`).
create or replace function space.estrattori_fondabili(io uuid) returns int
language sql stable set search_path = '' as $$
  select coalesce(sum(l.value::int), 0)::int
  from jsonb_each_text(space.bilanciamento() -> 'fondazione' -> 'estrattore' -> 'limite') l
  where space.ricercata(io, l.key)
$$;

-- Fonda un estrattore sul corpo dove la nave è ferma, pagato dalla stiva.
create or replace function space.fonda_estrattore() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  io uuid := auth.uid();
  n space.nave;
  corpo text;
  ricerca text;
  risorse constant jsonb := space.bilanciamento() -> 'fondazione' -> 'estrattore' -> 'risorse';
  fondati int;
  costo double precision;
  r text;
  q double precision;
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
  corpo := space.tipo_settore(n.x, n.y, n.z);
  ricerca := space.bilanciamento() -> 'fondazione' -> 'estrattore' -> 'tipi' ->> corpo;
  if ricerca is null then
    raise exception 'non_estraibile';
  end if;
  if not space.ricercata(io, ricerca) then
    raise exception 'non_disponibile';
  end if;
  if exists (select 1 from space.insediamento s where s.giocatore = io and (s.x, s.y, s.z) = (n.x, n.y, n.z)) then
    raise exception 'gia_fondato';
  end if;
  select count(*) into fondati from space.insediamento s where s.giocatore = io and s.tipo = 'estrattore';
  if fondati >= space.estrattori_fondabili(io) then
    raise exception 'limite_estrattori';
  end if;
  -- Dalla stiva, raccolta a mano compresa (insediamenti.ts, `costoEstrattore`).
  perform space.aggiorna_stiva(io, n);
  costo := space.a_livello(
    space.valore('{fondazione,estrattore,costo}'), space.valore('{fondazione,estrattore,crescita}'), fondati + 1
  ) / jsonb_array_length(risorse);
  for r in select jsonb_array_elements_text(risorse) loop
    select s.quantita into q from space.stiva s where s.giocatore = io and s.risorsa = r;
    if q < costo then
      raise exception 'risorse_insufficienti';
    end if;
  end loop;
  update space.stiva s set quantita = s.quantita - costo
  where s.giocatore = io and s.risorsa in (select jsonb_array_elements_text(risorse));
  insert into space.insediamento (giocatore, x, y, z, tipo)
  values (io, n.x, n.y, n.z, 'estrattore')
  returning * into i;
  return to_jsonb(i) - 'giocatore';
end
$$;

-- Avvia un lavoro nel cantiere della base dove la nave è attraccata (018); un estrattore ha
-- solo produzione e magazzino.
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
    if i.tipo = 'estrattore' and lavoro not in ('produzione', 'magazzino') then
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

revoke all on all functions in schema space from public, anon;
grant execute on all functions in schema space to authenticated;
revoke execute on function space.scansiona(uuid, int, int, int, int, timestamptz) from authenticated;
revoke execute on function space.stiva_di(uuid) from authenticated;
revoke execute on function space.aggiorna_stiva(uuid, space.nave) from authenticated;
revoke execute on function space.assesta(uuid) from authenticated;
revoke execute on function space.preleva(uuid, space.insediamento, timestamptz) from authenticated;
revoke execute on function space.applica_costruzioni(uuid) from authenticated;
