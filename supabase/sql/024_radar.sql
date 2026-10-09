-- Space · 024 · Radar (M7.3, doc/02-meccaniche.md#strutture-di-base).
--
-- Con *Radar* (S3) ogni base (non gli estrattori) costruisce un radar a
-- livelli: uno scanner fisso di raggio `4 × 1,2^(livello − 1)` attorno alla
-- base, con i tipi che rileva lo scanner della nave. Il database tiene solo il
-- livello: le bolle del radar le ricava il browser, come le soste (mappa.ts,
-- `sosteRadar`). Costa come magazzino e deposito (base 40). Da applicare dopo
-- bilanciamento.sql con `cantiere.base.radar` e `radar`. Rilanciabile.

alter table space.insediamento add column if not exists radar int not null default 0;

-- Applica i lavori finiti, dal primo (017): livelli della nave e delle strutture, radar compreso. Il magazzino di una
-- base si chiude all'istante della fine prima di cambiare produzione o tetto.
create or replace function space.applica_costruzioni(io uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  c space.costruzione;
  i space.insediamento;
  crescita constant double precision := space.valore('{nave,crescita}');
begin
  for c in select * from space.costruzione k where k.giocatore = io and not k.applicata and k.fine <= now() order by k.fine, k.id
  loop
    if c.lavoro = 'motore' then
      update space.nave set liv_motore = c.livello, velocita = space.a_livello(space.valore('{nave,velocita}'), crescita, c.livello)
      where giocatore = io;
    elsif c.lavoro = 'serbatoio' then
      update space.nave set liv_serbatoio = c.livello, serbatoio = space.a_livello(space.valore('{nave,serbatoio}'), crescita, c.livello)
      where giocatore = io;
    elsif c.lavoro = 'ricarica' then
      update space.nave set liv_ricarica = c.livello, ricarica = space.a_livello(space.valore('{nave,ricarica}'), crescita, c.livello)
      where giocatore = io;
    elsif c.lavoro = 'scanner' then
      update space.nave set scanner = c.livello where giocatore = io;
    elsif c.lavoro = 'stiva' then
      update space.nave set stiva = c.livello where giocatore = io;
    else
      select * into i from space.insediamento where id = c.insediamento;
      if c.lavoro in ('produzione', 'magazzino') then
        update space.insediamento set scorte = space.magazzino_a(i, c.fine), ultima = c.fine where id = i.id;
      end if;
      if c.lavoro = 'produzione' then
        update space.insediamento set produzione = c.livello where id = i.id;
      elsif c.lavoro = 'magazzino' then
        update space.insediamento set magazzino = c.livello where id = i.id;
      elsif c.lavoro = 'cantiere' then
        update space.insediamento set cantiere = c.livello where id = i.id;
      elsif c.lavoro = 'deposito' then
        update space.insediamento set deposito = c.livello where id = i.id;
      elsif c.lavoro = 'laboratorio' then
        update space.insediamento set laboratorio = c.livello where id = i.id;
      elsif c.lavoro = 'radar' then
        update space.insediamento set radar = c.livello where id = i.id;
      end if;
    end if;
    update space.costruzione set applicata = true where id = c.id;
  end loop;
end
$$;

-- Avvia un lavoro nel cantiere della base dove la nave è attraccata (022); il radar, solo nelle
-- basi, con *Radar* (S3).
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
  elsif lavoro in ('produzione', 'magazzino', 'cantiere', 'deposito', 'laboratorio', 'radar') then
    coda := 'base';
    if i.tipo = 'estrattore' and lavoro not in ('produzione', 'magazzino') then
      raise exception 'non_disponibile';
    end if;
    if lavoro = 'radar' and not space.ricercata(io, 'S3') then
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
      when 'cantiere' then i.cantiere when 'deposito' then i.deposito when 'radar' then i.radar else i.laboratorio end;
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
