-- Space · 026 · Ricerche fino al gradino 6 (M7.5, doc/10-ricerche.md).
--
-- Diventano ricercabili Ponte di curvatura (P3, solo lo sblocco: la struttura
-- arriva con M8.1), Raffinazione II (P4), Vele solari (P5), Estrattori
-- stellari (C5, +2 estrattori; quelli sulle pulsar con M8.2), Astrofisica II
-- (C6), Filtri nebulari (S5), Analisi stellare (S6, si vede nel browser) e
-- Riciclo (I6, già in `abbandona`, 025). Da applicare dopo bilanciamento.sql.
-- Rilanciabile.

-- L'Idrogeno del pieno per il giocatore (cantiere.ts, `costoPieno`): ogni *Raffinazione* ne toglie uno a unità.
create or replace function space.costo_pieno_di(io uuid, mancano double precision, deposito int) returns double precision
language sql stable set search_path = '' as $$
  select greatest(0, mancano) * space.a_livello(
    space.valore('{deposito,idrogeno}') - coalesce((
      select sum((space.bilanciamento() -> 'ricerche' -> 'effetti' ->> r)::double precision)
      from unnest(array['P1', 'P4', 'P7', 'P10']) r
      where space.ricercata(io, r) and space.bilanciamento() -> 'ricerche' -> 'effetti' ? r
    ), 0),
    space.valore('{deposito,crescita}'),
    deposito
  )
$$;

-- Quante basi può fondare il giocatore (insediamenti.ts, `basiFondabili`): 2, più ogni *Astrofisica*.
create or replace function space.basi_fondabili(io uuid) returns int
language sql stable set search_path = '' as $$
  select space.valore('{fondazione,basi}')::int + coalesce((
    select sum((space.bilanciamento() -> 'ricerche' -> 'effetti' ->> r)::int)
    from unnest(array['C1', 'C6', 'C10']) r
    where space.ricercata(io, r) and space.bilanciamento() -> 'ricerche' -> 'effetti' ? r
  ), 0)::int
$$;

-- Il carburante adesso (navigazione.ts, `carburanteOra`, 003): presso una stella la ricarica è ×2,
-- ×3 con *Vele solari* (P5).
create or replace function space.carburante_ora(n space.nave) returns double precision
language plpgsql stable set search_path = '' as $$
declare
  tetto double precision;
begin
  if now() < n.dal then
    return n.carburante;
  end if;
  tetto := space.tetto(n, n.x, n.y, n.z);
  if n.carburante >= tetto then
    return n.carburante;
  end if;
  return least(
    tetto,
    n.carburante
      + n.ricarica
        * (case
          when space.tipo_settore(n.x, n.y, n.z) <> 'stella' or space.tipo_settore(n.x, n.y, n.z) is null then 1
          when space.ricercata(n.giocatore, 'P5') then space.valore('{ricerche,effetti,P5}')
          else space.valore('{carburante,ricaricaStella}')
        end)
        * extract(epoch from now() - n.dal) / 3600
  );
end
$$;

-- Il raggio dello scanner del giocatore fermo in un settore di tipo `tipo` (navigazione.ts, `raggioQui`):
-- con *Filtri nebulari* (S5) le nebulose non lo riducono.
create or replace function space.raggio_di(io uuid, livello int, tipo text) returns double precision
language sql stable set search_path = '' as $$
  select space.raggio_scanner(livello, case when tipo = 'nebulosa' and space.ricercata(io, 'S5') then null else tipo end)
$$;

-- Registra la scansione della sosta in (x, y, z), che inizia a `istante` (007), col raggio del giocatore.
create or replace function space.scansiona(io uuid, x int, y int, z int, livello int, istante timestamptz) returns void
language sql security definer set search_path = '' as $$
  insert into space.scansione as s (giocatore, x, y, z, raggio, livello, istante)
  values (io, x, y, z, space.raggio_di(io, livello, space.tipo_settore(x, y, z)), livello, istante)
  on conflict (giocatore, x, y, z) do update
  set raggio = excluded.raggio, livello = excluded.livello, istante = excluded.istante
  where excluded.raggio > s.raggio or excluded.livello > s.livello
$$;

revoke all on all functions in schema space from public, anon;
grant execute on all functions in schema space to authenticated;
revoke execute on function space.scansiona(uuid, int, int, int, int, timestamptz) from authenticated;
revoke execute on function space.stiva_di(uuid) from authenticated;
revoke execute on function space.aggiorna_stiva(uuid, space.nave) from authenticated;
revoke execute on function space.assesta(uuid) from authenticated;
revoke execute on function space.preleva(uuid, space.insediamento, timestamptz) from authenticated;
revoke execute on function space.applica_costruzioni(uuid) from authenticated;
