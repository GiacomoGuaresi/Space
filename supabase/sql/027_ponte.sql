-- Space · 027 · Ponte di curvatura (M8.1, doc/02-meccaniche.md#viaggio).
--
-- Con *Ponte di curvatura* (P3) ogni base (non gli estrattori) costruisce il
-- ponte, una volta sola, al costo e nel tempo di un livello 8 di base 40. Tra
-- due basi col ponte la nave va ×3 più veloce e consuma un terzo del
-- carburante (×4 e un quarto con *Ponte risonante*, P8): tutte le basi col
-- ponte formano una rete libera. Da applicare dopo bilanciamento.sql con
-- `ponte` e `cantiere.base.ponte`. Rilanciabile.

alter table space.insediamento add column if not exists ponte int not null default 0;
alter table space.viaggio add column if not exists ponte boolean not null default false;

-- Il costo per arrivare al livello `livello` (cantiere.ts, `costoLavoro`), laboratorio (017) e ponte compresi.
create or replace function space.costo_lavoro(lavoro text, livello int) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare
  cantiere constant jsonb := space.bilanciamento() -> 'cantiere';
  totale double precision;
  mix jsonb;
  voce record;
  costo jsonb := '{}';
begin
  if lavoro = 'stiva' then
    totale := space.capacita_stiva(livello - 1) * (cantiere -> 'stiva' ->> 'quota')::double precision;
    mix := cantiere -> 'stiva' -> 'mix';
  elsif lavoro = 'laboratorio' then
    -- Il laboratorio di livello L costa come una ricerca di gradino L.
    return space.costo_ricerca(livello);
  elsif lavoro = 'ponte' then
    -- Il ponte, una volta sola, come un livello 8.
    totale := space.a_livello((cantiere -> 'base' ->> 'ponte')::double precision, (cantiere ->> 'crescita')::double precision, space.valore('{ponte,livello}')::int);
    mix := space.ricetta(space.valore('{ponte,livello}')::int);
  else
    totale := space.a_livello((cantiere -> 'base' ->> lavoro)::double precision, (cantiere ->> 'crescita')::double precision, livello);
    mix := space.ricetta(livello);
  end if;
  for voce in select * from jsonb_each_text(mix) loop
    costo := costo || jsonb_build_object(voce.key, totale * voce.value::double precision);
  end loop;
  return costo;
end
$$;

-- Le ore per arrivare al livello `livello` col cantiere a `livello_cantiere` (cantiere.ts, `durataLavoro`).
create or replace function space.durata_lavoro(lavoro text, livello int, livello_cantiere int) returns double precision
language plpgsql immutable set search_path = '' as $$
declare
  cantiere constant jsonb := space.bilanciamento() -> 'cantiere';
  ore double precision := (cantiere ->> 'ore')::double precision;
  -- Il ponte dura come un livello 8.
  fino int := case when lavoro = 'ponte' then space.valore('{ponte,livello}')::int else livello end;
begin
  if lavoro = 'stiva' then
    return (cantiere -> 'stiva' ->> 'ore')::double precision;
  end if;
  for i in 3..fino loop
    ore := ore * (cantiere ->> 'crescitaTempo')::double precision;
  end loop;
  return ore / (1 + (cantiere ->> 'riduzione')::double precision * (greatest(1, livello_cantiere) - 1));
end
$$;

-- Applica i lavori finiti, dal primo (024): livelli della nave e delle strutture, radar e ponte compresi. Il magazzino di una
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
      elsif c.lavoro = 'ponte' then
        update space.insediamento set ponte = 1 where id = i.id;
      end if;
    end if;
    update space.costruzione set applicata = true where id = c.id;
  end loop;
end
$$;

-- Avvia un lavoro nel cantiere della base dove la nave è attraccata (024); il ponte, solo nelle
-- basi e una volta sola, con *Ponte di curvatura* (P3).
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
      -- *Automazione* (I1) accorcia del 10 %; la stiva dura sempre 1 h.
      * case when lavoro <> 'stiva' and space.ricercata(io, 'I1') then 1 - space.valore('{ricerche,effetti,I1}') else 1 end
      * 3600), costo)
  returning * into c;
  return to_jsonb(c) - 'giocatore';
end
$$;

-- Parte verso (x, y, z) (021); tra due basi col ponte di curvatura va ×3 più veloce e consuma un terzo
-- (×4 e un quarto con *Ponte risonante*, P8).
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
  if ponte then
    fattore := case when space.ricercata(io, 'P8') then space.valore('{ricerche,effetti,P8}') else space.valore('{ponte,fattore}') end;
  end if;
  select * into r from space.rotta(
    n.x, n.y, n.z, x, y, z, carburante,
    -- La parte dei settori che consuma (navigazione.ts, `quotaConsumo`): fionda, *Iniettori* (P2) e ponte.
    ((case when fionda then 1 - space.valore('{fionda,gratis}') else 1 end)
      * (case when space.ricercata(io, 'P2') then 1 - space.valore('{ricerche,effetti,P2}') else 1 end)) / fattore
  );
  if r.percorsa = 0 then
    raise exception 'carburante_insufficiente';
  end if;
  arrivo := now() + make_interval(
    secs => r.percorsa / (n.velocita * (case when fionda then space.valore('{fionda,velocita}') else 1 end) * fattore) * 3600
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
