-- Space · 031 · Relitti (M9.3, doc/09-bilanciamento.md#comete-e-relitti).
--
-- Arrivando su un relitto lo si saccheggia, una volta sola per giocatore:
-- `30 × ricchezza` di Materia oscura e un carico del 50 % della capacità della
-- stiva, diviso con la ricetta del livello più alto della nave. L'esito viene
-- dal seed del settore, uguale per tutti: sotto il 30 % c'è anche un progetto
-- (`nave.progetti`), che dimezza la prossima ricerca. *Recupero* (C9, M9.6)
-- raddoppia relitti e comete e porta il progetto al 50 %. Quello che non entra
-- nella stiva si perde. Da applicare dopo bilanciamento.sql con `relitto`.
-- Rilanciabile.

alter table space.nave add column if not exists progetti int not null default 0;
alter table space.raccolto add column if not exists progetto boolean not null default false;

-- L'esito del relitto in (x, y, z) (risorse.ts, `esitoRelitto`): il primo numero della quinta sequenza.
create or replace function space.esito_relitto(x int, y int, z int) returns double precision
language sql immutable parallel safe set search_path = '' as $$
  select (space.mulberry(space.derivato(space.seed_settore(x, y, z), 4))).numero
$$;

-- Il bottino del relitto dove sta la nave (risorse.ts, `bottinoRelitto`), o null se lì non c'è un relitto.
create or replace function space.bottino_relitto(io uuid, n space.nave) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  recupero boolean := space.ricercata(io, 'C9');
  per double precision := case when space.ricercata(io, 'C9') then space.valore('{ricerche,effetti,C9}') else 1 end;
  totale double precision;
  voce record;
  bottino jsonb := '{}';
begin
  if space.tipo_settore(n.x, n.y, n.z) is distinct from 'relitto' then
    return null;
  end if;
  totale := space.capacita_di(io, n.stiva) * space.valore('{relitto,carico}') * per;
  for voce in select * from jsonb_each_text(space.ricetta(greatest(n.liv_motore, n.liv_serbatoio, n.liv_ricarica))) loop
    bottino := bottino || jsonb_build_object(voce.key, totale * voce.value::double precision);
  end loop;
  bottino := bottino || jsonb_build_object('materiaOscura',
    coalesce((bottino ->> 'materiaOscura')::double precision, 0)
      + space.valore('{relitto,materiaOscura}') * space.ricchezza(n.x, n.y, n.z) * per);
  return jsonb_build_object(
    'bottino', bottino,
    'progetto', space.esito_relitto(n.x, n.y, n.z)
      < case when recupero then space.valore('{relitto,progettoRecupero}') else space.valore('{relitto,progetto}') end
  );
end
$$;

-- Gli eventi dell'arrivo (018), se la nave è arrivata e non sono ancora stati sistemati: i
-- lavori finiti del cantiere, la cometa o il relitto (doppi con *Recupero*) e il magazzino
-- dell'insediamento.
create or replace function space.assesta(io uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  n space.nave;
  bottino jsonb;
  relitto jsonb;
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
  if bottino is not null and space.ricercata(io, 'C9') then
    select jsonb_object_agg(k, v::double precision * space.valore('{ricerche,effetti,C9}')) into bottino from jsonb_each_text(bottino) e(k, v);
  end if;
  relitto := space.bottino_relitto(io, n);
  if relitto is not null then
    bottino := relitto -> 'bottino';
  end if;
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
    insert into space.raccolto (giocatore, x, y, z, istante, bottino, progetto)
    values (io, n.x, n.y, n.z, n.dal, preso, coalesce((relitto ->> 'progetto')::boolean, false));
    if (relitto ->> 'progetto')::boolean then
      update space.nave set progetti = progetti + 1 where giocatore = io;
    end if;
  end if;
  -- L'insediamento dove si arriva passa nella stiva, una volta per arrivo.
  if n.assestato is distinct from n.dal then
    perform space.preleva(io, i, n.dal) from space.insediamento i
    where i.giocatore = io and (i.x, i.y, i.z) = (n.x, n.y, n.z);
    update space.nave set assestato = n.dal where giocatore = io;
  end if;
end
$$;

-- Avvia la ricerca `nodo` nel laboratorio della base dove la nave è attraccata (018); con un progetto
-- trovato in un relitto costa la metà, e il progetto si consuma.
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
