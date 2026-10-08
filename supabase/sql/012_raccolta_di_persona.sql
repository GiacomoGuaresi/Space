-- Space · 012 · Raccolta di persona (M4.5, doc/02-meccaniche.md#insediamenti).
--
-- Arrivando in un insediamento il magazzino passa da solo nella stiva, fin
-- dove c'è posto; il resto resta lì. Ripartendo si carica anche quello che ha
-- prodotto durante la sosta. Ogni prelievo resta in `prelievo`, per il diario.
-- `nave.assestato` ricorda l'arrivo già sistemato. Rilanciabile.

alter table space.nave add column if not exists assestato timestamptz;
-- Gli arrivi di prima non si risistemano.
update space.nave set assestato = dal where assestato is null and dal <= now();

create table if not exists space.prelievo (
  giocatore uuid not null references auth.users (id) on delete cascade,
  insediamento bigint not null references space.insediamento (id) on delete cascade,
  istante timestamptz not null,
  preso jsonb not null,
  primary key (giocatore, insediamento, istante)
);

alter table space.prelievo enable row level security;
drop policy if exists prelievi_propri on space.prelievo;
create policy prelievi_propri on space.prelievo for select to authenticated
  using (giocatore = auth.uid() and istante <= now());
revoke all on space.prelievo from public, anon, authenticated;
grant select on space.prelievo to authenticated;

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
  capacita := space.capacita_stiva(n.stiva);
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

-- Gli eventi dell'arrivo (010), se la nave è arrivata e non sono ancora stati sistemati: la
-- cometa, e il magazzino dell'insediamento.
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

-- Parte verso (x, y, z) (010): prima sistema l'arrivo, scrive la raccolta a mano e carica l'insediamento.
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
