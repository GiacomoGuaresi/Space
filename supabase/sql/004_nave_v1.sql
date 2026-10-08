-- Space · 004 · Nave v1 (M3.2, doc/09-bilanciamento.md#nave).
--
-- Da applicare dopo bilanciamento.sql con i valori v1: porta le navi esistenti
-- ai valori del livello 1, con il carburante entro il nuovo serbatoio. I viaggi
-- già in corso arrivano all'ora prevista. Rilanciabile.

update space.nave
set
  velocita = space.valore('{nave,velocita}'),
  serbatoio = space.valore('{nave,serbatoio}'),
  ricarica = space.valore('{nave,ricarica}'),
  carburante = least(carburante, space.valore('{nave,serbatoio}'));
