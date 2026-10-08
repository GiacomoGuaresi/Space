# 01 · Visione

## Scopo

**Space** è un piccolo gioco di esplorazione da giocare a sprazzi durante la giornata: si dà un ordine alla nave, si chiude l'app e si torna più tardi a vedere dov'è arrivata e cosa ha trovato. Il fascino sta in un universo enorme che non è disegnato a mano ma **nasce dalle coordinate**, e nel ritmo lento del tempo reale.

Le meccaniche sono descritte in [02](02-meccaniche.md), l'universo in [03](03-universo.md).

## Origine

Space riprende l'idea di **DeepSpace**, un vecchio prototipo del 2022 mai finito: **viaggiare tra coordinate `(x, y, z)` aspettando in tempo reale**. Del vecchio progetto non si tiene altro: corpi celesti, grafica, meccaniche e codice ripartono da zero.

## Principi

Gli stessi delle altre app di casa:

1. **Semplice**: poche meccaniche e chiare; da telefono si gioca in pochi secondi.
2. **Deterministico**: l'universo non si salva, si ricalcola. Nel database finisce solo quello che fa il giocatore.
3. **Niente trucchi dal browser**: tempi, carburante e risorse li decide il database.
4. **Gratuito e zero manutenzione**: nessun server proprio, stesso progetto Supabase delle altre app.
5. **Macro step stabili**: ogni fase si pubblica giocabile ([06](06-roadmap.md)).

## Utenti

Per ora **solo il proprietario**, con l'account di casa. I dati sono comunque per giocatore, così in futuro potranno arrivarne altri.

## Cosa NON è (per ora)

- Un gioco multigiocatore: niente furti, combattimenti o commercio, che arriveranno forse più avanti
- Un gioco a notifiche: niente push, all'apertura c'è un riepilogo di cosa è successo
- Un simulatore 3D navigabile liberamente: si vede il settore in cui si trova la nave, più lo scanner dei dintorni
- Un gioco a flotte: la nave è una sola
