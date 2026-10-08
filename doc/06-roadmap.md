# 06 · Roadmap

Lo sviluppo procede per **macro step stabili**: ognuno si chiude pubblicato e giocabile. Dentro ogni macro step ci sono step piccoli, come nelle altre app, e ognuno si chiude con test verdi, build riuscita, prova in locale e commit. Si passa al successivo solo dopo la prova.

## Fase 0 · Progettazione ← *in corso*
- [x] Bozza della documentazione
- [x] Catalogo dei corpi celesti e macro step
- [ ] Giri di Q&A fino a nessuna domanda aperta
- [ ] Documentazione senza punti aperti: valori numerici, interfaccia, sicurezza

## M0 · Fondamenta ✅
- [x] `git init`, LICENSE MIT, repository pubblico `Space` su GitHub
- [x] GitHub Pages attivo, variabili del repository impostate
- [x] Scaffold Vite + React + TS + Tailwind, Vitest, three.js, PWA con icona
- [x] Workflow `pubblica.yml`
- [x] Accesso con l'account di casa, schema `space` creato ed esposto, URL nei redirect di Auth ([08](08-deploy.md))
- [x] Pagina provvisoria con un campo di stelle three.js

**Si consegna**: una pagina vuota online, dietro l'accesso.

## M1 · Universo e corpi celesti ✅
- [x] Hash delle coordinate e generatore casuale, con test sui settori noti (`src/dominio/casuale.ts`)
- [x] Catalogo: pesi, gradiente di distanza, sottotipi, ricchezza (`catalogo.ts`, `settore.ts`), con valori provvisori
- [x] Nomi per tipo (`nomi.ts`)
- [x] Scena three.js con bloom e sfondo comune seminato (`src/grafica/`)
- [x] Un generatore grafico per ogni corpo (11, più il vuoto)
- [x] **Osservatorio**: coordinate nell'indirizzo (`#/x,y,z`), spostamento per asse, ricerca del corpo più vicino di un tipo, scheda del corpo
- [ ] Qualità ridotta automatica sui dispositivi lenti: rimandata, da valutare provando sul telefono

**Si consegna**: l'universo si esplora a vista.

## M2 · Navigazione ✅
- [x] Nave alla base, `space.stato()` e `space.viaggia()` (`supabase/sql/002_navigazione.sql`), funzioni dell'universo in SQL identiche a quelle in TypeScript, verificate su un campione fisso (`npm run verifica-sql`)
- [x] Durata, arrivo calcolato alla lettura, conto alla rovescia corretto sull'orologio del database
- [x] Carburante: consumo, ricarica da fermi, fermata forzata
- [x] Scanner dei dintorni, come elenco dal più vicino (tipo e distanza; il nome si scopre arrivando)
- [x] Catalogo delle scoperte (`#/catalogo`), con i conti per tipo
- [x] Effetti dei corpi sulla navigazione: ricarica ×3 accanto alle stelle, scanner ridotto nelle nebulose e doppio presso le pulsar, fionda ×2 dai buchi neri
- [x] Riepilogo all'apertura e al ritorno sull'app
- [x] Scie di stelle durante il viaggio
- [x] Osservatorio solo in sviluppo (`#/osservatorio`)

**Si consegna**: il gioco di esplorazione in tempo reale.

## M3 · Risorse e colonie ← *prossimo*
- [ ] Stiva, raccolta dai corpi, scarico alla base, magazzino
- [ ] Corpi a raccolta una tantum (comete)
- [ ] Fondazione delle colonie, produzione fino al tetto, raccolta sul posto

**Si consegna**: il ciclo economico (esplora → colonizza → giro di raccolta).

## M4 · Potenziamenti di nave e base
- [ ] Costi e tempi di costruzione in tempo reale
- [ ] Nave: motore, serbatoio, ricarica, stiva, scanner
- [ ] Base: raffineria, magazzino, cantiere
- [ ] Colonie: tasso e tetto

**Si consegna**: la progressione.

## M5 · Rarità e speciale
- [ ] Materia oscura e suoi usi
- [ ] Relitti da saccheggiare
- [ ] Wormhole
- [ ] Rifinitura dei pesi e della curva di distanza

**Si consegna**: obiettivi a lungo termine.

## Più avanti, se servirà
- Altri giocatori, furto dalle colonie altrui
- Eventi e incontri
