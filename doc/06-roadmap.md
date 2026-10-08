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

## M1 · Universo e corpi celesti ← *prossimo*
- [ ] Hash delle coordinate e generatore casuale, con test sui settori noti
- [ ] Catalogo: pesi, gradiente di distanza, sottotipi, ricchezza
- [ ] Nomi per tipo
- [ ] Scena three.js e sfondo comune
- [ ] Un generatore grafico per ogni corpo (11)
- [ ] **Osservatorio**: si scrivono le coordinate e si guarda il settore

**Si consegna**: l'universo si esplora a vista.

## M2 · Navigazione
- [ ] Nave alla base, `space.viaggia()`, hash in SQL identico a quello in TypeScript
- [ ] Durata, arrivo calcolato alla lettura, conto alla rovescia
- [ ] Carburante: consumo, ricarica nel tempo, fermata forzata
- [ ] Scanner dei dintorni
- [ ] Catalogo delle scoperte
- [ ] Effetti dei corpi sulla navigazione (stella, nebulosa, pulsar, buco nero)
- [ ] Riepilogo all'apertura

**Si consegna**: il gioco di esplorazione in tempo reale.

## M3 · Risorse e colonie
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
