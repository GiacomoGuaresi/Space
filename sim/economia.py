"""Simulazione del bilanciamento (doc/09-bilanciamento.md): 6 risorse, ricette per gradino, stiva per risorsa, giri di raccolta, ricerche.

Un giorno alla volta:
1. gli insediamenti producono fino al tetto (1 settimana di produzione);
2. la nave visita alcuni insediamenti (quanti dipende da strada percorribile e distanze)
   e carica nella stiva, per risorsa, fino alla capacità;
3. al cantiere paga con stiva + magazzino della base madre, il più economico che può;
4. con la strada che avanza esplora: la frontiera cresce, si fondano insediamenti.
Uso: python3 sim/economia.py [chiave=valore ...]   (i predefiniti sono i valori di doc/09)
"""
import math, random, sys

R = ['M', 'S', 'G', 'H', 'T', 'O']
P = dict(
    v0=0.25, T0=4.0, r0=0.4, g_nave=1.12, S0=25.0, g_stiva=1.5, stiva_quota=0.4,
    c_nave=60, gc=1.45, t0=3.0, gt=1.31,
    p_madre=6.0, p_com=7.0, p_T=3.0, p_O=1.2, g_prod=1.13, settimana=168,
    c_base=150, gc_base=1.6, c_estr=60, gc_estr=1.4,
    quota_esplora=0.18, quota_raccolta=0.5, seme=1, mano=3.0, liv_ricerca=2, salto=8,
    ponte=1, f_ponte=0.5, e_ponte=0.3, liv_ponte=8,
    basi0=2, basi_astro=2, cant_bonus=0.12,
)
for a in sys.argv[1:]:
    k, v = a.split('='); P[k] = float(v)
random.seed(int(P['seme']))

def ricetta(L):
    if L <= 3: q = dict(M=.6, S=.4)
    elif L <= 6: q = dict(M=.5, S=.3, G=.2)
    elif L <= 9: q = dict(M=.45, S=.25, G=.15, H=.15)
    elif L <= 14: q = dict(M=.4, S=.25, G=.15, H=.1, T=.1)
    else: q = dict(M=.38, S=.22, G=.12, H=.08, T=.1, O=.1)
    return q

def costo(base, L):
    v = base * P['gc'] ** (L - 1)
    return {r: v * f for r, f in ricetta(L).items()}

def ricchezza(d): return 1 + math.sqrt(max(0, d) / 100)

MIX = {  # tipo → lista di mix possibili (sottotipi)
    'sistema': [dict(M=.5, S=.5), dict(M=.2, S=.2, G=.6), dict(G=.8, S=.2), dict(H=.7, G=.3)],
    'asteroidi': [dict(M=.8, S=.2), dict(M=.2, S=.8), dict(M=.5, S=.5)],
    'gas': [dict(H=1.0), dict(H=.7, G=.3), dict(H=.5, G=.5)],
    'pulsar': [dict(T=1.0)],
    'buconero': [dict(O=1.0)],
}
MANO = dict(M=('asteroidi', 0), S=('asteroidi', 0), G=('sistema', 0), H=('gas', 0), T=('pulsar', 30), O=('buconero', 85))
SOGLIA = dict(sistema=0, asteroidi=0, gas=0, pulsar=30, buconero=85)
# ricerca che sblocca ogni tipo di estrattore (indice nel ramo Colonizzazione)
SBLOCCO = dict(asteroidi=2, gas=3, pulsar=5, buconero=7)

class Ins:
    def __init__(s, tipo, d):
        s.tipo, s.d, s.liv = tipo, d, 1
        s.mix = random.choice(MIX[tipo]); s.scorta = {r: 0.0 for r in R}
    def orario(s):
        out = {}
        for r, f in s.mix.items():
            base = P['p_T'] if r == 'T' else P['p_O'] if r == 'O' else P['p_com']
            out[r] = base * f * ricchezza(s.d) * P['g_prod'] ** (s.liv - 1)
        return out

class Gioco:
    def __init__(g):
        g.nave = dict(motore=1, serbatoio=1, ricarica=1, stiva=1)
        g.madre = 1; g.cantiere = 1; g.madre_scorta = {r: 0.0 for r in R}
        g.stiva = {r: 0.0 for r in R}
        g.ins = []; g.basi = 0; g.estr = 0; g.ponti = 0; g.acc_visite = 0.0
        g.ricerca = {k: 0 for k in 'PCSI'}       # gradini completati per ramo (∞ oltre 10)
        g.frontiera = 0.0; g.coda = {}; g.bloccato = {r: 0 for r in R}; g.giorni_mano = 0; g.oggi_mano = False; g.ultima_durata = 0.0

    def cap_stiva(g): return P['S0'] * P['g_stiva'] ** (g.nave['stiva'] - 1)
    def v(g): return P['v0'] * P['g_nave'] ** (g.nave['motore'] - 1) * (1.04 ** max(0, g.ricerca['P'] - 10))
    def T(g): return P['T0'] * P['g_nave'] ** (g.nave['serbatoio'] - 1)
    def r(g): return P['r0'] * P['g_nave'] ** (g.nave['ricarica'] - 1)
    def molt_ponte(g):
        """Quanto si allunga la strada utile quando una parte dei giri passa sui ponti."""
        if not P['ponte'] or g.ponti < 2: return 1.0
        vel = 4 if g.ricerca['P'] >= 8 else 3
        f = P['f_ponte'] * min(1.0, (g.ponti - 1) / max(1, g.basi))
        return 1 / (f / vel + 1 - f)

    def strada(g):
        return min(g.v() * 14, min(3 * 0.5 * g.T(), 24 * g.r()))
    def slot_basi(g):
        c = g.ricerca['C']; return int(P['basi0'] + P['basi_astro'] * ((c >= 1) + (c >= 6) + (c >= 10)) + max(0, c - 10) // 2)
    def slot_estr(g):
        c = g.ricerca['C']; return (3 if c >= 2 else 0) + 2 * ((c >= 3) + (c >= 5) + (c >= 7)) + max(0, c - 10)
    def bonus_prod(g):
        c = g.ricerca['C']; return (1.15 if c >= 8 else 1) * 1.03 ** max(0, c - 10)
    def fattore_tempo(g):
        i = g.ricerca['I']; return (0.9 if i >= 1 else 1) * (0.85 if i >= 7 else 1) / (1 + P['cant_bonus'] * (g.cantiere - 1))

    def paga(g, c):
        """Paga con stiva + magazzino della base madre; False se manca qualcosa."""
        for r, q in c.items():
            if g.stiva[r] + g.madre_scorta[r] < q: return False
        for r, q in c.items():
            dal_mag = min(g.madre_scorta[r], q); g.madre_scorta[r] -= dal_mag; g.stiva[r] -= q - dal_mag
        return True

    def manca(g, c):
        for r, q in c.items():
            if g.stiva[r] + g.madre_scorta[r] < q: g.bloccato[r] += 1; return r

    def giorno(g, n):
        ore = 24
        # 1. produzione
        for i in g.ins:
            o = i.orario()
            for r, x in o.items():
                i.scorta[r] = min(i.scorta[r] + x * ore * g.bonus_prod(), x * P['settimana'])
        pm = P['p_madre'] * P['g_prod'] ** (g.madre - 1) / 4
        for r in 'MSGH':
            g.madre_scorta[r] = min(g.madre_scorta[r] + pm * ore, pm * P['settimana'])
        # 2. raccolta: visite al giorno = strada dedicata / distanza media tra insediamenti
        if g.ins:
            salto = P['salto'] if P['salto'] else max(2.0, 0.5 * sum(i.d for i in g.ins) / len(g.ins) / max(1, len(g.ins)) ** (1 / 3))
            g.acc_visite += P['quota_raccolta'] * g.strada() * g.molt_ponte() / salto
            visite = min(len(g.ins), int(g.acc_visite)); g.acc_visite -= visite
            cap = g.cap_stiva()
            utile = lambda i: sum(min(i.scorta[r], cap - g.stiva[r]) for r in R)
            for i in sorted(g.ins, key=lambda i: -utile(i))[:visite]:
                for r in R:
                    x = min(i.scorta[r], cap - g.stiva[r]); g.stiva[r] += x; i.scorta[r] -= x
        # 3. spese (code: nave, base madre; la ricerca è una al giorno, ≤ 1 h)
        h = n * 24
        if g.coda.get('nave', 0) <= h:
            opz = []
            for k in ('motore', 'serbatoio', 'ricarica'):
                L = g.nave[k] + 1; opz.append((sum(costo(P['c_nave'], L).values()), k, costo(P['c_nave'], L), L))
            opz.sort()
            fatto = False
            for _, k, c, L in opz:
                if L > 2 * g.cantiere:
                    if g.paga(costo(50, g.cantiere + 1)): g.cantiere += 1
                    break
                if g.paga(c):
                    g.nave[k] += 1; g.ultima_durata = P['t0'] * P['gt'] ** (L - 2) * g.fattore_tempo(); g.coda['nave'] = h + g.ultima_durata; fatto = True; break
            if not fatto:
                r = g.manca(opz[0][2])
                # raccolta a mano: se manca una risorsa che nessun insediamento dà, la nave sosta su un corpo
                if r and not any(r in i.mix for i in g.ins) and g.frontiera >= MANO[r][1]:
                    base = P['p_T'] if r == 'T' else P['p_O'] if r == 'O' else P['p_com']
                    g.stiva[r] = min(g.cap_stiva(), g.stiva[r] + P['mano'] * base * ricchezza(MANO[r][1]) * 16)
                    g.giorni_mano += 1; g.oggi_mano = True
        # stiva: sempre pagabile se c'è Metallo/Silicio (fuori coda, 1 h)
        # solo se il prossimo livello della nave non ci sta nella stiva
        prossimo = costo(P['c_nave'], min(g.nave[k] for k in ('motore', 'serbatoio', 'ricarica')) + 1)
        if max(prossimo.values()) > 0.8 * g.cap_stiva():
            cs = g.cap_stiva() * P['stiva_quota']
            if g.paga(dict(M=cs * .6, S=cs * .4)): g.nave['stiva'] += 1
        if g.coda.get('madre', 0) <= h:
            c = costo(40, g.madre + 1)
            if g.paga(c): g.coda['madre'] = h + P['t0'] * P['gt'] ** (g.madre - 1); g.madre += 1
        # potenziamento colonie: il più economico, uno al giorno
        if g.ins:
            i = min(g.ins, key=lambda i: i.liv)
            if g.paga(costo(40, i.liv + 1)): i.liv += 1
        # ricerca: ramo col gradino più basso
        ramo = min('CPIS', key=lambda k: (g.ricerca[k] - (2 if k == 'C' else 0)))
        c = costo(P['c_nave'], int(P['liv_ricerca'] * (g.ricerca[ramo] + 1)) if g.ricerca[ramo] < 10 else int(P['liv_ricerca'] * 10) + g.ricerca[ramo] - 10)
        if ramo in 'SI' and g.ricerca[ramo] >= 10: pass
        elif g.paga(c): g.ricerca[ramo] += 1
        # 4. esplorazione e fondazioni (non nei giorni di raccolta a mano)
        if not g.oggi_mano:
            g.frontiera += P['quota_esplora'] * g.strada() * (1 + P['e_ponte'] if P['ponte'] and g.ponti >= 2 else 1)
        # ponte: sbloccato da P3 + I3, uno per base (contando la madre)
        if P['ponte'] and g.ricerca['P'] >= 3 and g.ricerca['I'] >= 3 and g.ponti < g.basi + 1:
            if g.paga(costo(40, int(P['liv_ponte']))): g.ponti += 1
        g.oggi_mano = False
        d = 0.8 * g.frontiera
        if g.basi < g.slot_basi():
            c = {r: P['c_base'] * P['gc_base'] ** g.basi / 3 for r in 'MSG'} if g.basi else {}  # la prima è gratis
            if g.paga(c): g.ins.append(Ins('sistema', max(d, 3))); g.basi += 1
        if g.estr < g.slot_estr():
            tipi = [t for t, k in SBLOCCO.items() if g.ricerca['C'] >= k and g.frontiera >= SOGLIA[t]]
            mancano = {t: sum(1 for i in g.ins if i.tipo == t) for t in tipi}
            if tipi:
                t = min(tipi, key=lambda t: (mancano[t], -SOGLIA[t]))
                c = {r: P['c_estr'] * P['gc_estr'] ** g.estr / 2 for r in 'MS'}
                if g.paga(c): g.ins.append(Ins(t, max(d, SOGLIA[t]))); g.estr += 1

def gira():
    g = Gioco(); tappe = {1, 7, 14, 30, 60, 90, 120, 180, 270, 365}
    print(f"{'g':>4} {'mot':>4} {'serb':>4} {'ric':>4} {'stiva':>5} {'sett/g':>7} {'front.':>7} {'basi':>4} {'estr':>4} {'ricerche':>8} {'madre':>5} {'ponti':>5} {'cant':>4} {'durata':>6}  blocchi (giorni per risorsa)")
    for n in range(1, 366):
        g.giorno(n)
        if n in tappe:
            nv = g.nave
            b = ' '.join(f"{r}{g.bloccato[r]}" for r in R if g.bloccato[r])
            print(f"{n:>4} {nv['motore']:>4} {nv['serbatoio']:>4} {nv['ricarica']:>4} {nv['stiva']:>5} {g.strada():>7.1f} {g.frontiera:>7.0f} {g.basi:>4} {g.estr:>4} {sum(g.ricerca.values()):>8} {g.madre:>5} {g.ponti:>5} {g.cantiere:>4} {g.ultima_durata/24:>6.1f}  {b}  a mano: {g.giorni_mano} g")

gira()
