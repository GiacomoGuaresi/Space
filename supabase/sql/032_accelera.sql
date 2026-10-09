-- Space · 032 · Accelerare (M9.4, doc/02-meccaniche.md#materia-oscura).
--
-- Con la Materia oscura della stiva si salta il tempo che manca: a un viaggio
-- (la nave arriva subito, scoperta e scansioni comprese), al lavoro in corso di
-- una coda del cantiere (quelli dopo, nella stessa coda, si anticipano dello
-- stesso tempo) o alla ricarica (il serbatoio arriva subito al tetto). Costa
-- `2 × ore^1,5`: più tempo si salta, più costa, in modo più che proporzionale.
-- Si paga dalla stiva, da dove si vuole. Da applicare dopo bilanciamento.sql
-- con `accelera`. Rilanciabile.

-- La Materia oscura per saltare `ore` ore (cantiere.ts, `costoAccelera`).
create or replace function space.costo_accelera(ore double precision) returns double precision
language sql immutable parallel safe set search_path = '' as $$
  select space.valore('{accelera,base}') * power(greatest(0, ore), space.valore('{accelera,esponente}'))
$$;

-- La ricarica all'ora della nave ferma dov'è (navigazione.ts, `ricaricaQui`), come in `carburante_ora` (026).
create or replace function space.ricarica_qui(n space.nave) returns double precision
language sql stable set search_path = '' as $$
  select n.ricarica * case
    when space.tipo_settore(n.x, n.y, n.z) is distinct from 'stella' then 1
    when space.ricercata(n.giocatore, 'P5') then space.valore('{ricerche,effetti,P5}')
    else space.valore('{carburante,ricaricaStella}')
  end
$$;

-- Accelera `cosa`: 'viaggio', 'ricarica' o 'lavoro' (il lavoro `lavoro` del cantiere, in corso).
create or replace function space.accelera(cosa text, lavoro bigint default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_variable
declare
  io uuid := auth.uid();
  n space.nave;
  c space.costruzione;
  ore double precision;
  costo double precision;
  q double precision;
  salto interval;
  tetto double precision;
begin
  if io is null then
    raise exception 'serve la sessione' using errcode = '42501';
  end if;
  perform space.assesta(io);
  select * into n from space.nave where giocatore = io for update;
  if n.giocatore is null then
    raise exception 'nave_mancante';
  end if;

  if cosa = 'viaggio' then
    if n.dal <= now() then
      raise exception 'niente_da_accelerare';
    end if;
    ore := extract(epoch from n.dal - now()) / 3600;
  elsif cosa = 'ricarica' then
    if n.dal > now() then
      raise exception 'in_viaggio';
    end if;
    tetto := space.tetto(n, n.x, n.y, n.z);
    ore := (tetto - space.carburante_ora(n)) / space.ricarica_qui(n);
    if ore <= 0 then
      raise exception 'niente_da_accelerare';
    end if;
  elsif cosa = 'lavoro' then
    select * into c from space.costruzione k where k.id = lavoro and k.giocatore = io for update;
    if c.id is null or c.fine <= now() or c.inizio > now() then
      raise exception 'niente_da_accelerare';
    end if;
    ore := extract(epoch from c.fine - now()) / 3600;
  else
    raise exception 'niente_da_accelerare';
  end if;

  -- Il pagamento, dalla stiva (raccolta a mano compresa).
  costo := space.costo_accelera(ore);
  perform space.aggiorna_stiva(io, n);
  select s.quantita into q from space.stiva s where s.giocatore = io and s.risorsa = 'materiaOscura';
  if q < costo then
    raise exception 'risorse_insufficienti';
  end if;
  update space.stiva s set quantita = s.quantita - costo where s.giocatore = io and s.risorsa = 'materiaOscura';

  if cosa = 'viaggio' then
    -- Si arriva adesso: il viaggio, la nave, la scoperta e le scansioni ancora nascoste.
    update space.viaggio v set arrivo = now() where v.giocatore = io and v.arrivo = n.dal;
    update space.scoperta s set scoperta = now() where s.giocatore = io and s.scoperta > now();
    update space.scansione s set istante = now() where s.giocatore = io and s.istante > now();
    update space.nave set dal = now() where giocatore = io;
    perform space.assesta(io);
  elsif cosa = 'ricarica' then
    -- Sopra il tetto il carburante non cala: salvato al tetto, resta lì.
    update space.nave set carburante = tetto where giocatore = io;
  else
    salto := c.fine - now();
    update space.costruzione k set fine = now() where k.id = c.id;
    -- I lavori dopo, nella stessa coda, partono prima.
    update space.costruzione k set inizio = k.inizio - salto, fine = k.fine - salto
    where k.giocatore = io and k.coda = c.coda and k.id <> c.id and k.inizio >= c.fine
      and (c.coda = 'nave' or k.insediamento = c.insediamento);
    perform space.applica_costruzioni(io);
  end if;
  return jsonb_build_object('materiaOscura', costo, 'ore', ore);
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
