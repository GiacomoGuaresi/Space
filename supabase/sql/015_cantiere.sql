-- Space · 015 · Cantiere (M5.1, doc/09-bilanciamento.md#costi-e-tempi).
--
-- I livelli della nave e delle strutture si comprano nel cantiere di una
-- base: ogni lavoro entra in coda (una per la nave, una per ogni base), si paga
-- subito dal magazzino della base e poi dalla stiva, e finisce dopo un tempo.
-- I lavori finiti si applicano alla lettura, in ordine, dentro `assesta`.
-- Da applicare dopo bilanciamento.sql con `nave.crescita`, `cantiere` e
-- `deposito`. Rilanciabile.

alter table space.nave add column if not exists liv_motore int not null default 1;
alter table space.nave add column if not exists liv_serbatoio int not null default 1;
alter table space.nave add column if not exists liv_ricarica int not null default 1;

alter table space.insediamento add column if not exists cantiere int not null default 0;
alter table space.insediamento add column if not exists deposito int not null default 0;
alter table space.insediamento add column if not exists laboratorio int not null default 0;
-- La base madre parte con cantiere, deposito e laboratorio (doc/02-meccaniche.md#insediamenti).
update space.insediamento
set cantiere = greatest(cantiere, 1), deposito = greatest(deposito, 1), laboratorio = greatest(laboratorio, 1)
where tipo = 'madre';

create table if not exists space.costruzione (
  id bigint generated always as identity primary key,
  giocatore uuid not null references auth.users (id) on delete cascade,
  insediamento bigint not null references space.insediamento (id) on delete cascade,
  -- La coda: 'nave' (una sola, nel cantiere dove la nave è attraccata) o 'base' (una per insediamento).
  coda text not null check (coda in ('nave', 'base')),
  lavoro text not null,
  livello int not null,
  inizio timestamptz not null,
  fine timestamptz not null,
  costo jsonb not null,
  applicata boolean not null default false
);

alter table space.costruzione enable row level security;
drop policy if exists costruzioni_proprie on space.costruzione;
create policy costruzioni_proprie on space.costruzione for select to authenticated using (giocatore = auth.uid());
revoke all on space.costruzione from public, anon, authenticated;
grant select on space.costruzione to authenticated;

-- Come si divide il costo del livello `livello` (cantiere.ts, `ricetta`).
create or replace function space.ricetta(livello int) returns jsonb
language sql immutable parallel safe set search_path = '' as $$
  select r -> 'mix' from jsonb_array_elements(space.bilanciamento() -> 'cantiere' -> 'ricette') r
  where (r ->> 'da')::int <= livello order by (r ->> 'da')::int desc limit 1
$$;

-- Il costo per arrivare al livello `livello` (cantiere.ts, `costoLavoro`).
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
begin
  if lavoro = 'stiva' then
    return (cantiere -> 'stiva' ->> 'ore')::double precision;
  end if;
  for i in 3..livello loop
    ore := ore * (cantiere ->> 'crescitaTempo')::double precision;
  end loop;
  return ore / (1 + (cantiere ->> 'riduzione')::double precision * (greatest(1, livello_cantiere) - 1));
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
  elsif lavoro in ('produzione', 'magazzino', 'cantiere', 'deposito') then
    coda := 'base';
    -- Cantiere e deposito nelle colonie arrivano con le ricerche (M7).
    if lavoro in ('cantiere', 'deposito') and i.tipo <> 'madre' then
      raise exception 'non_disponibile';
    end if;
    attuale := case lavoro
      when 'produzione' then i.produzione when 'magazzino' then i.magazzino
      when 'cantiere' then i.cantiere else i.deposito end;
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
    capacita := space.capacita_stiva(n.stiva);
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

-- Lo stato (011): la base madre nasce con cantiere, deposito e laboratorio.
create or replace function space.stato() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  io uuid := auth.uid();
  n space.nave;
  v space.viaggio;
begin
  if io is null then
    raise exception 'serve la sessione' using errcode = '42501';
  end if;
  insert into space.nave (giocatore, carburante) values (io, space.valore('{nave,serbatoio}'))
  on conflict (giocatore) do nothing;
  insert into space.insediamento (giocatore, x, y, z, tipo, cantiere, deposito, laboratorio)
  values (io, 0, 0, 0, 'madre', 1, 1, 1)
  on conflict do nothing;
  perform space.assesta(io);
  select * into n from space.nave where giocatore = io;
  -- In viaggio no: la scansione dell'arrivo l'ha già scritta `viaggia`.
  if n.dal <= now() then
    perform space.scansiona(io, n.x, n.y, n.z, n.scanner, n.dal);
  end if;
  select * into v from space.viaggio where giocatore = io order by arrivo desc limit 1;
  return jsonb_build_object(
    'ora', now(),
    'nave', to_jsonb(n) - 'giocatore',
    'viaggio', case when v.id is not null and v.arrivo > now() then to_jsonb(v) - 'giocatore' end,
    'stiva', space.stiva_di(io)
  );
end
$$;

-- Parte verso (x, y, z) (012), se la nave non è ferma per un potenziamento.
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
  if exists (select 1 from space.costruzione c where c.giocatore = io and c.coda = 'nave' and c.fine > now()) then
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
