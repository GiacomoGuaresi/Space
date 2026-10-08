-- Space · 016 · Deposito carburante (M5.8, doc/09-bilanciamento.md#carburante).
--
-- Attraccati a una base con deposito il serbatoio si riempie subito, pagando
-- Idrogeno: `5 × 0,9^(livello − 1)` per unità, prima dal magazzino della base
-- e poi dalla stiva. È sempre un pieno: se l'Idrogeno non basta, si rifiuta.
-- Rilanciabile.

-- L'Idrogeno per `mancano` unità al deposito di livello `deposito` (cantiere.ts, `costoPieno`).
create or replace function space.costo_pieno(mancano double precision, deposito int) returns double precision
language sql immutable parallel safe set search_path = '' as $$
  select greatest(0, mancano) * space.a_livello(space.valore('{deposito,idrogeno}'), space.valore('{deposito,crescita}'), deposito)
$$;

create or replace function space.pieno() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  io uuid := auth.uid();
  n space.nave;
  i space.insediamento;
  costo double precision;
  scorte_ora jsonb;
  dal_magazzino double precision;
  q double precision;
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
  if i.deposito < 1 then
    raise exception 'serve_deposito';
  end if;
  costo := space.costo_pieno(n.serbatoio - space.carburante_ora(n), i.deposito);
  if costo <= 0 then
    raise exception 'gia_pieno';
  end if;
  perform space.aggiorna_stiva(io, n);
  scorte_ora := space.magazzino_a(i, now());
  select s.quantita into q from space.stiva s where s.giocatore = io and s.risorsa = 'idrogeno';
  if costo > q + coalesce((scorte_ora ->> 'idrogeno')::double precision, 0) then
    raise exception 'risorse_insufficienti';
  end if;
  dal_magazzino := least(costo, coalesce((scorte_ora ->> 'idrogeno')::double precision, 0));
  update space.insediamento
  set scorte = scorte_ora || jsonb_build_object('idrogeno', coalesce((scorte_ora ->> 'idrogeno')::double precision, 0) - dal_magazzino),
    ultima = now()
  where id = i.id;
  update space.stiva s set quantita = greatest(0, s.quantita - (costo - dal_magazzino))
  where s.giocatore = io and s.risorsa = 'idrogeno';
  -- In base il tetto è il serbatoio: salvato pieno, resta pieno.
  update space.nave set carburante = n.serbatoio where giocatore = io;
  return jsonb_build_object('idrogeno', costo);
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
