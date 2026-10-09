-- Space · 023 · Strutture nelle colonie (M7.2, doc/02-meccaniche.md#strutture-di-base).
--
-- Nelle colonie magazzino e laboratorio si costruiscono subito, il cantiere con
-- *Cantiere orbitale* (I3, 018) e il deposito con *Deposito* (I5), che diventa
-- ricercabile. In ogni base, non solo nella madre, il serbatoio si ricarica
-- fino al pieno; negli estrattori no. Da applicare dopo bilanciamento.sql.
-- Rilanciabile.

-- Fin dove si ricarica il serbatoio da fermi in (x, y, z) (navigazione.ts, `tettoQui`): pieno in una
-- base del giocatore e accanto a una stella.
create or replace function space.tetto(n space.nave, x int, y int, z int) returns double precision
language sql stable set search_path = '' as $$
  select n.serbatoio * case
    when (x = 0 and y = 0 and z = 0) or space.tipo_settore(x, y, z) = 'stella' or exists (
      select 1 from space.insediamento i
      where i.giocatore = n.giocatore and (i.x, i.y, i.z) = (tetto.x, tetto.y, tetto.z) and i.tipo in ('madre', 'base')
    ) then 1
    else space.valore('{carburante,tettoFuori}')
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
