"""Distanza dalla base a cui ci si aspetta il primo corpo di ogni tipo, con le soglie di doc/09."""
import math
V={'asteroidi':30,'nebulosa':25,'stella':25,'sistema':12,'gigante':4,'cometa':4,'pulsar':0,'buconero':0,'relitto':0,'wormhole':0}
SOGLIA={'pulsar':25,'buconero':80,'relitto':80,'wormhole':150}
L={'asteroidi':22,'nebulosa':18,'stella':18,'sistema':14,'gigante':7,'cometa':6,'pulsar':5,'buconero':4,'relitto':4,'wormhole':2}
P,DL=0.1,500
def frac(t,d):
    s=min(1,d/DL); w={k:V[k]+(L[k]-V[k])*s for k in V}
    for k,m in SOGLIA.items(): w[k]=0 if d<m else L[k]*min(1,(d-m)/(DL-m))
    return w[t]/sum(w.values())
for t in ['sistema','gigante','pulsar','buconero','relitto','wormhole']:
    n=0;r=0;dr=0.05;soglie={}
    while r<2000 and len(soglie)<3:
        r+=dr; n+=4*math.pi*r*r*P*frac(t,r)*dr
        for k in (0.69,3,10):
            if n>=k and k not in soglie: soglie[k]=r
    print(f"{t:<10} 50% di trovarne uno entro {soglie.get(0.69,0):6.1f} | ~3 entro {soglie.get(3,0):6.1f} | ~10 entro {soglie.get(10,0):6.1f} settori")
