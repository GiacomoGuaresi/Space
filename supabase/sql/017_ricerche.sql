-- Space · 017 · Ricerche (M6.1, doc/10-ricerche.md).
--
-- Una ricerca alla volta, in una base con laboratorio di livello almeno pari
-- al gradino: si paga subito (magazzino della base, poi stiva), dura 6 min a
-- gradino (al massimo 1 h) e la nave resta ferma. Gradini e prerequisiti
-- vengono da `bilanciamento.ricerche`; si avviano solo i nodi in `attive`.
-- Il laboratorio si potenzia nel cantiere come le altre strutture. Da
-- applicare dopo bilanciamento.sql con `ricerche`. Rilanciabile.

create table if not exists space.ricerca (
  giocatore uuid not null references auth.users (id) on delete cascade,
  nodo text not null,
  -- 1 per i nodi normali; i nodi infiniti (M9) hanno un livello.
  livello int not null default 1,
  insediamento bigint references space.insediamento (id) on delete set null,
  inizio timestamptz not null,
  fine timestamptz not null,
  costo jsonb not null,
  primary key (giocatore, nodo, livello)
);

alter table space.ricerca enable row level security;
drop policy if exists ricerche_proprie on space.ricerca;
create policy ricerche_proprie on space.ricerca for select to authenticated using (giocatore = auth.uid());
revoke all on space.ricerca from public, anon, authenticated;
grant select on space.ricerca to authenticated;

-- Vero se il giocatore ha completato la ricerca `nodo`.
create or replace function space.ricercata(io uuid, nodo text) returns boolean
language sql stable set search_path = '' as $$
  select exists (select 1 from space.ricerca r where r.giocatore = io and r.nodo = ricercata.nodo and r.fine <= now())
$$;

-- Il costo di una ricerca di gradino `g` (ricerche.ts, `costoGradino`): un livello `2g` di base 60.
create or replace function space.costo_ricerca(g int) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare
  ricerche constant jsonb := space.bilanciamento() -> 'ricerche';
  livello int := (ricerche ->> 'costo')::int * g;
  totale double precision := space.a_livello((ricerche ->> 'base')::double precision, space.valore('{cantiere,crescita}'), livello);
  voce record;
  costo jsonb := '{}';
begin
  for voce in select * from jsonb_each_text(space.ricetta(livello)) loop
    costo := costo || jsonb_build_object(voce.key, totale * voce.value::double precision);
  end loop;
  return costo;
end
$$;

-- Le ore di una ricerca di gradino `g` (ricerche.ts, `durataGradino`).
create or replace function space.durata_ricerca(g int) returns double precision
language sql immutable set search_path = '' as $$
  select least(space.valore('{ricerche,oreMassime}'), space.valore('{ricerche,minuti}') * g / 60)
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
  costo := space.costo_ricerca(g);
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

-- Il costo per arrivare al livello `livello` (cantiere.ts, `costoLavoro`), laboratorio compreso (017).
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

-- Applica i lavori finiti, dal primo: livelli della nave e delle strutture. Il magazzino di una
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
      end if;
    end if;
    update space.costruzione set applicata = true where id = c.id;
  end loop;
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
    -- Cantiere e deposito nelle colonie arrivano con le ricerche (M7).
    if lavoro in ('cantiere', 'deposito') and i.tipo <> 'madre' then
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
  costo := space.costo_lavoro(lavoro, livello);
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
    inizio + make_interval(secs => space.durata_lavoro(lavoro, livello, i.cantiere) * 3600), costo)
  returning * into c;
  return to_jsonb(c) - 'giocatore';
end
$$;

-- Parte verso (x, y, z) (015), se la nave non è ferma per un potenziamento o una ricerca.
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
