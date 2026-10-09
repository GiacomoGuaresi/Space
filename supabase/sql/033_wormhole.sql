-- Space · 033 · Wormhole (M9.5, doc/02-meccaniche.md#effetti-dei-corpi).
--
-- Con *Navigazione dei varchi* (P9) la nave ferma su un wormhole lo
-- attraversa, pagando 50 Materia oscura dalla stiva: arriva subito
-- all'uscita, a senso unico, tra 300 e 1500 settori più in là in una
-- direzione qualsiasi, sempre la stessa per quel varco. *Sonda di varco* (S9)
-- mostra l'uscita prima di entrare (nel browser). Il viaggio resta in
-- `viaggio`, con `wormhole`. Da applicare dopo bilanciamento.sql con `varco`.
-- Rilanciabile.

alter table space.viaggio add column if not exists wormhole boolean not null default false;

-- Dove porta il varco in (x, y, z) (settore.ts, `uscitaVarco`): i primi tre numeri dei dettagli danno
-- direzione sulla sfera e lunghezza; si arrotonda come `Math.round`.
create or replace function space.uscita_varco(x int, y int, z int, out ux int, out uy int, out uz int)
language plpgsql immutable parallel safe set search_path = '' as $$
declare
  stato bigint := space.derivato(space.seed_settore(x, y, z), 3);
  n double precision;
  zeta double precision;
  angolo double precision;
  lunghezza double precision;
  r double precision;
begin
  select m.nuovo, m.numero into stato, n from space.mulberry(stato) m;
  zeta := -1 + n * (1 - (-1)::double precision);
  select m.nuovo, m.numero into stato, n from space.mulberry(stato) m;
  angolo := 0 + n * (pi() * 2 - 0);
  select m.nuovo, m.numero into stato, n from space.mulberry(stato) m;
  lunghezza := 300 + n * (1500 - 300)::double precision;
  r := sqrt(1 - zeta * zeta);
  ux := x + floor(r * cos(angolo) * lunghezza + 0.5)::int;
  uy := y + floor(r * sin(angolo) * lunghezza + 0.5)::int;
  uz := z + floor(zeta * lunghezza + 0.5)::int;
end
$$;

-- Attraversa il wormhole dove la nave è ferma: arriva subito all'uscita.
create or replace function space.attraversa() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  io uuid := auth.uid();
  n space.nave;
  u record;
  costo double precision := space.valore('{varco,materiaOscura}');
  q double precision;
  v space.viaggio;
  tipo_arrivo text;
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
  if space.tipo_settore(n.x, n.y, n.z) is distinct from 'wormhole' then
    raise exception 'non_varco';
  end if;
  if not space.ricercata(io, 'P9') then
    raise exception 'non_disponibile';
  end if;
  if exists (select 1 from space.costruzione c where c.giocatore = io and c.coda = 'nave' and c.fine > now())
    or exists (select 1 from space.ricerca k where k.giocatore = io and k.fine > now()) then
    raise exception 'nave_occupata';
  end if;
  perform space.aggiorna_stiva(io, n);
  select s.quantita into q from space.stiva s where s.giocatore = io and s.risorsa = 'materiaOscura';
  if q < costo then
    raise exception 'risorse_insufficienti';
  end if;
  update space.stiva s set quantita = s.quantita - costo where s.giocatore = io and s.risorsa = 'materiaOscura';

  select * into u from space.uscita_varco(n.x, n.y, n.z);
  insert into space.viaggio (giocatore, da_x, da_y, da_z, meta_x, meta_y, meta_z, a_x, a_y, a_z, partenza, arrivo, consumo, fionda, wormhole)
  values (io, n.x, n.y, n.z, u.ux, u.uy, u.uz, u.ux, u.uy, u.uz, now(), now(), 0, false, true)
  returning * into v;
  update space.nave set x = u.ux, y = u.uy, z = u.uz, dal = now() where giocatore = io;
  tipo_arrivo := space.tipo_settore(u.ux, u.uy, u.uz);
  if tipo_arrivo is not null then
    insert into space.scoperta (giocatore, x, y, z, tipo, scoperta)
    values (io, u.ux, u.uy, u.uz, tipo_arrivo, now())
    on conflict do nothing;
  end if;
  perform space.scansiona(io, u.ux, u.uy, u.uz, n.scanner, now());
  perform space.assesta(io);
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
