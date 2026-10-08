-- Space · 006 · Scanner a livelli (M3.6, doc/09-bilanciamento.md#scanner).
--
-- Il livello dello scanner della nave: per ora resta 1 (solo sistemi
-- planetari), i potenziamenti arrivano con il cantiere. Rilanciabile.

alter table space.nave add column if not exists scanner int not null default 1 check (scanner >= 1);
